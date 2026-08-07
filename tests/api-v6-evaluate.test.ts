import { beforeEach, describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/v6-real-essay.json";
import { createV6EvaluateHandler } from "@/app/api/v6/evaluate/route";
import { clearEvaluationBuckets } from "@/lib/security/evaluation-access";
import type { V6StageEvent } from "@/lib/workflow/v6/types";

const env = {
  EVALUATION_ACCESS_CODE: "beta-secret",
  ESSAYFLOW_ALLOWED_ORIGINS: "https://essayflow-demo.yangqing8205.chatgpt.site",
  EVALUATION_RATE_LIMIT_PER_HOUR: "10",
};

const input = {
  sourceText: fixture.exam.sourceText,
  starter1: fixture.exam.starter1,
  studentParagraph1: fixture.sample.p1,
  starter2: fixture.exam.starter2,
  studentParagraph2: fixture.sample.p2,
};

function request(headers: Record<string, string> = {}, body: unknown = input) {
  return new Request("https://essayflow-v2-yangqing.vercel.app/api/v6/evaluate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://essayflow-demo.yangqing8205.chatgpt.site",
      "x-forwarded-for": "203.0.113.8",
      "x-essayflow-access-code": "beta-secret",
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

  it("requires the deployed access code", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    expect((await handler(request({ "x-essayflow-access-code": "" }))).status).toBe(401);
    expect((await handler(request({ "x-essayflow-access-code": "wrong" }))).status).toBe(401);
  });

  it("rejects unlisted origins", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    const response = await handler(request({ origin: "https://attacker.example" }));
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rate limits the eleventh request from one IP", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline, now: () => 1_000 });
    for (let index = 0; index < 10; index += 1) {
      expect((await handler(request())).status).toBe(200);
    }
    expect((await handler(request())).status).toBe(429);
  });

  it("rejects invalid input before opening a stream", async () => {
    const handler = createV6EvaluateHandler({ env, runPipeline: successfulPipeline });
    const response = await handler(request({}, { sourceText: "short" }));
    expect(response.status).toBe(400);
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
});
