import { beforeEach, describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/v6-real-essay.json";
import { createV6EvaluateHandler } from "@/app/api/v6/evaluate/route";
import { ModelCallFailedError } from "@/lib/providers";
import { V6PostcheckError } from "@/lib/scoring/postcheck";
import { clearEvaluationBuckets } from "@/lib/security/evaluation-access";
import type { V6StageEvent } from "@/lib/workflow/v6/types";

const env = {
  ESSAYFLOW_ALLOWED_ORIGINS: "https://essayflow-demo.yangqing8205.chatgpt.site",
  EVALUATION_RATE_LIMIT_PER_HOUR: "3",
};

const input = {
  sourceText: fixture.exam.sourceText,
  starter1: fixture.exam.starter1,
  studentParagraph1: fixture.sample.p1,
  starter2: fixture.exam.starter2,
  studentParagraph2: fixture.sample.p2,
};

function request(
  headers: Record<string, string> = {},
  body: unknown = input,
  url = "https://essayflow-v2-yangqing.vercel.app/api/v6/evaluate",
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://essayflow-demo.yangqing8205.chatgpt.site",
      "x-forwarded-for": "203.0.113.8",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const successfulPipeline = async (_input: unknown, options: { onStage?: (event: V6StageEvent) => void }) => {
  for (const stage of [1, 2, 3, 4] as const) {
    options.onStage?.({ stage, status: "running" });
    options.onStage?.({ stage, status: "complete" });
  }
  return fixture.goodReport;
};

describe("POST /api/v6/evaluate", () => {
  beforeEach(() => clearEvaluationBuckets());

  it("allows evaluation without a user-facing access code", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    expect((await handler(request())).status).toBe(200);
  });

  it("allows the deployed page to call its same-origin API", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    const response = await handler(request(
      { origin: "https://essayflow-scoring-service.vercel.app" },
      input,
      "https://essayflow-scoring-service.vercel.app/api/v6/evaluate",
    ));
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://essayflow-scoring-service.vercel.app");
  });

  it("rejects unlisted origins", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    const response = await handler(request({ origin: "https://attacker.example" }));
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rate limits the fourth request from one IP", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline, now: () => 1_000 });
    for (let index = 0; index < 3; index += 1) {
      expect((await handler(request())).status).toBe(200);
    }
    expect((await handler(request())).status).toBe(429);
  });

  it("rejects invalid input before opening a stream", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    const response = await handler(request({}, { sourceText: "short" }));
    expect(response.status).toBe(400);
    const excessive = await handler(request({}, { ...input, sourceText: "x".repeat(15_001) }));
    expect(excessive.status).toBe(400);
  });

  it("streams ordered stage events and one canonical result", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    const response = await handler(request());
    const lines = (await response.text()).trim().split("\n").map(line => JSON.parse(line));

    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(response.headers.get("access-control-allow-origin")).toBe("https://essayflow-demo.yangqing8205.chatgpt.site");
    expect(lines.filter(line => line.type === "stage" && line.status === "complete").map(line => line.stage)).toEqual([1, 2, 3, 4]);
    expect(lines.filter(line => line.type === "result")).toHaveLength(1);
    expect(lines.at(-1).data.total).toBe(18);
  });

  it("streams a safe error without secrets or stack traces", async () => {
    const handler = createV6EvaluateHandler({
      env,
      runPipeline: async () => { throw new Error("provider failed with sk-secret-value and hidden prompt"); },
    });
    const response = await handler(request());
    const body = await response.text();

    expect(body).toContain('"type":"error"');
    expect(body).not.toContain("sk-secret-value");
    expect(body).not.toContain("hidden prompt");
    expect(body).not.toContain("at ");
  });

  it("classifies provider failures without exposing provider details", async () => {
    const handler = createV6EvaluateHandler({
      env,
      runPipeline: async () => {
        throw new ModelCallFailedError("400 Unknown parameter max_completion_tokens; sk-secret-value");
      },
    });
    const response = await handler(request());
    const body = await response.text();

    expect(body).toContain('"code":"PROVIDER_REQUEST_INVALID"');
    expect(body).toContain("模型请求参数与服务不兼容");
    expect(body).not.toContain("max_completion_tokens");
    expect(body).not.toContain("sk-secret-value");
  });

  it("returns a safe validation rule for production diagnostics", async () => {
    const handler = createV6EvaluateHandler({
      env,
      runPipeline: async () => {
        throw new V6PostcheckError("source-keyword-evidence");
      },
    });
    const response = await handler(request());
    const body = await response.text();

    expect(body).toContain('"code":"MODEL_FORMAT_ERROR"');
    expect(body).toContain('"diagnostic":"source-keyword-evidence"');
    expect(body).not.toContain(fixture.exam.sourceText);
  });
});
