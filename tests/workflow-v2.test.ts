import { describe, expect, it } from "vitest";
import { DEMO } from "@/data/examples/demo";
import { parseEssay, parsePromptText } from "@/lib/workflow/parser";
import { runWorkflow } from "@/lib/workflow/run";
import { FinalReportSchema } from "@/lib/schemas";
import { groundedProvider } from "./fixtures/echo-provider";

describe("EssayFlow v2 workflow", () => {
  it("keeps strict parsing for an empty prompt", () => {
    expect(() => parsePromptText("")).toThrow(/题目内容过短/);
  });
  it("extracts and protects the provided starters", () => {
    const extracted = parsePromptText(DEMO.promptText);
    const parsed = parseEssay({ ...DEMO, studentParagraph1: `${extracted.starter1} ${DEMO.studentParagraph1}`, studentParagraph2: `${extracted.starter2} ${DEMO.studentParagraph2}` });
    expect(parsed.studentParagraph1).not.toContain(extracted.starter1);
    expect(parsed.studentParagraph2).not.toContain(extracted.starter2);
  });
  it("rejects a missing student paragraph", () => { expect(() => parseEssay({ ...DEMO, studentParagraph2: "" })).toThrow(); });
  it("returns content banding and holistic language placement", async () => {
    const parsed = parseEssay(DEMO);
    const report = await runWorkflow(parsed, { providerFactory: () => groundedProvider(parsed) });
    expect(FinalReportSchema.safeParse(report).success).toBe(true);
    expect(report.score.contentJudgements).toHaveLength(4);
    expect(report.score.languagePlacement).toMatch(/档内/);
  });
});
