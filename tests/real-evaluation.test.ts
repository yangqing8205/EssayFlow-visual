import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTEST_ESSAY, MOCK_MARKERS } from "./fixtures/contest-essay";
import { DEMO } from "@/data/examples/demo";
import { DEMO_REPORT } from "@/data/examples/demo-report";
import { parseEssay } from "@/lib/workflow/parser";
import { MAX_REPAIR_ATTEMPTS, runDemoWorkflow, runWorkflow } from "@/lib/workflow/run";
import { ModelOutputInvalidError, ProviderNotConfiguredError } from "@/lib/providers";
import { FinalReportSchema } from "@/lib/schemas";
import { ScriptedProvider, buildGroundedReport, groundedProvider } from "./fixtures/echo-provider";

const contest = parseEssay(CONTEST_ESSAY);
const originalKey = process.env.OPENAI_API_KEY;

beforeEach(() => { delete process.env.OPENAI_API_KEY; });
afterEach(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });

describe("真实评测不得混入 Mock 内容", () => {
  it("输入不含 Mia 时，报告中不出现任何示例作文的人物或场景", async () => {
    const report = await runWorkflow(contest, { providerFactory: () => groundedProvider(contest) });
    const serialized = JSON.stringify(report);
    for (const marker of MOCK_MARKERS) expect(serialized).not.toContain(marker);
    expect(serialized).toContain("Daniel");
    expect(report.reportKind).toBe("real");
  });

  it("真实报告的核心内容来自本次提交的作文", async () => {
    const report = await runWorkflow(contest, { providerFactory: () => groundedProvider(contest) });
    expect(report.story.characters).toContain("Daniel");
    expect(contest.sourceText).toContain(report.story.conflict.slice(0, 20));
    expect(report.score.total).not.toBe(DEMO_REPORT.score.total);
    expect(report.story.conflict).not.toBe(DEMO_REPORT.story.conflict);
  });
});

describe("未配置模型时的错误状态", () => {
  it("普通评测抛出未配置错误，而不是返回示例报告", async () => {
    await expect(runWorkflow(contest)).rejects.toBeInstanceOf(ProviderNotConfiguredError);
  });

  it("错误信息明确说明无法分析作文", async () => {
    await expect(runWorkflow(contest)).rejects.toThrow(/未配置\s*AI\s*模型/);
  });
});

describe("脱敏示例只能由显式 demo 入口产生", () => {
  it("demo 工作流返回标记为 demo 的示例报告", () => {
    const report = runDemoWorkflow();
    expect(FinalReportSchema.safeParse(report).success).toBe(true);
    expect(report.reportKind).toBe("demo");
    expect(report.story.characters).toContain("Mia");
  });

  it("真实评测链路不引用示例报告数据", async () => {
    const report = await runWorkflow(contest, { providerFactory: () => groundedProvider(contest) });
    expect(report.polishedVersion).not.toBe(DEMO_REPORT.polishedVersion);
    expect(report.language.overall).not.toBe(DEMO_REPORT.language.overall);
  });
});

describe("五个输入块完整传入模型", () => {
  it("provider 收到 sourceText、两句首句和两段学生原创", async () => {
    const provider = groundedProvider(contest);
    await runWorkflow(contest, { providerFactory: () => provider });
    expect(provider.calls).toHaveLength(1);
    const payload = provider.calls[0].input as Record<string, unknown>;
    for (const key of ["sourceText", "starter1", "studentParagraph1", "starter2", "studentParagraph2"] as const) {
      expect(payload[key]).toBe(contest[key]);
    }
    expect(payload.lockedStarters).toEqual([contest.starter1, contest.starter2]);
  });
});

describe("给定段首句锁定", () => {
  it("命中给定首句的精修条目被剔除", async () => {
    const report = await runWorkflow(contest, { providerFactory: () => groundedProvider(contest) });
    const sentences = report.language.issues.map(issue => issue.sentence);
    expect(sentences).not.toContain(contest.starter1);
    expect(sentences).not.toContain(contest.starter2);
    expect(report.language.issues.length).toBeGreaterThan(0);
  });

  it("给定首句不计入学生原创，解析后不残留在续写正文中", () => {
    const withStarters = parseEssay({
      ...CONTEST_ESSAY,
      studentParagraph1: `${contest.starter1} ${CONTEST_ESSAY.studentParagraph1}`,
      studentParagraph2: `${contest.starter2} ${CONTEST_ESSAY.studentParagraph2}`,
    });
    expect(withStarters.studentParagraph1).not.toContain(contest.starter1);
    expect(withStarters.studentParagraph2).not.toContain(contest.starter2);
  });

  it("模型漏写给定首句时，优化版会补回原句", async () => {
    const grounded = buildGroundedReport(contest);
    const provider = new ScriptedProvider([
      JSON.stringify({ ...grounded, polishedVersion: `${contest.studentParagraph1}\n\n${contest.studentParagraph2}` }),
    ]);
    const report = await runWorkflow(contest, { providerFactory: () => provider });
    expect(report.polishedVersion).toContain(contest.starter1);
    expect(report.polishedVersion).toContain(contest.starter2);
  });
});

describe("模型输出不合规时不得展示伪造报告", () => {
  it("结构始终不合法时抛出 ModelOutputInvalidError", async () => {
    const provider = new ScriptedProvider([JSON.stringify({ score: { total: 22 } })]);
    await expect(runWorkflow(contest, { providerFactory: () => provider })).rejects.toBeInstanceOf(ModelOutputInvalidError);
    expect(provider.calls).toHaveLength(MAX_REPAIR_ATTEMPTS + 1);
    expect(provider.calls[1].repairHint).toBeTruthy();
  });

  it("非 JSON 输出同样不会退回示例报告", async () => {
    const provider = new ScriptedProvider(["抱歉，我无法完成。"]);
    await expect(runWorkflow(contest, { providerFactory: () => provider })).rejects.toBeInstanceOf(ModelOutputInvalidError);
  });

  it("有限次修复后成功则返回真实报告", async () => {
    const provider = new ScriptedProvider(["not json", JSON.stringify(buildGroundedReport(contest))]);
    const report = await runWorkflow(contest, { providerFactory: () => provider });
    expect(report.reportKind).toBe("real");
    expect(provider.calls).toHaveLength(2);
  });
});

describe("示例题目本身也走真实链路", () => {
  it("填入示例题目后使用真实评测而非写死报告", async () => {
    const parsedDemo = parseEssay(DEMO);
    const provider = groundedProvider(parsedDemo);
    const report = await runWorkflow(parsedDemo, { providerFactory: () => provider });
    expect(report.reportKind).toBe("real");
    expect(report.modelVersion).toBe("scripted-test-model");
  });
});
