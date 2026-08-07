import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/evaluate/route";
import { GET as providerStatusRoute } from "@/app/api/provider-status/route";
import { CONTEST_ESSAY, MOCK_MARKERS } from "./fixtures/contest-essay";
import { parseEssay } from "@/lib/workflow/parser";

const contest = parseEssay(CONTEST_ESSAY);
const originalKey = process.env.OPENAI_API_KEY;

function post(body: unknown) {
  return POST(new Request("http://localhost/api/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
}

beforeEach(() => { delete process.env.OPENAI_API_KEY; });
afterEach(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });

describe("POST /api/evaluate", () => {
  it("未配置模型时普通评测返回 503 与明确错误码", async () => {
    const response = await post({ ...contest, mode: "real" });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect(JSON.stringify(body)).not.toContain("Mia");
  });

  it("省略 mode 时默认按真实评测处理，不返回示例报告", async () => {
    const response = await post(contest);
    expect(response.status).toBe(503);
    const serialized = JSON.stringify(await response.json());
    for (const marker of MOCK_MARKERS) expect(serialized).not.toContain(marker);
  });

  it("显式 demo 请求才返回脱敏示例报告", async () => {
    const response = await post({ mode: "demo" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reportKind).toBe("demo");
    expect(body.story.characters).toContain("Mia");
  });

  it("demo 请求携带用户作文时被拒绝，避免真实输入混入示例路径", async () => {
    const response = await post({ ...contest, mode: "demo" });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_INPUT");
  });

  it("缺少输入块时返回结构化输入错误", async () => {
    const response = await post({ ...contest, starter2: "" });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("INVALID_INPUT");
    expect(body.detail).toContain("starter2");
  });
});

describe("GET /api/provider-status", () => {
  it("未配置时报告 configured=false 且不泄漏 Key", async () => {
    const body = await (await providerStatusRoute()).json();
    expect(body.configured).toBe(false);
    expect(body.model).toBeNull();
  });

  it("配置后报告 configured=true 且只返回模型名", async () => {
    process.env.OPENAI_API_KEY = "sk-test-should-not-leak";
    process.env.OPENAI_MODEL = "test-model";
    const body = await (await providerStatusRoute()).json();
    expect(body.configured).toBe(true);
    expect(body.model).toBe("test-model");
    expect(JSON.stringify(body)).not.toContain("sk-test-should-not-leak");
    delete process.env.OPENAI_MODEL;
  });
});
