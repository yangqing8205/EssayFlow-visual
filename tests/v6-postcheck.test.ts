import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/v6-real-essay.json";
import { assertV6Report, assertV6SourceKeywords } from "@/lib/scoring/postcheck";
import { V6FinalReportSchema, V6Stage2Schema } from "@/lib/workflow/v6/types";

const input = {
  sourceText: fixture.exam.sourceText,
  starter1: fixture.exam.starter1,
  studentParagraph1: fixture.sample.p1,
  starter2: fixture.exam.starter2,
  studentParagraph2: fixture.sample.p2,
};

function report() {
  return V6FinalReportSchema.parse(fixture.goodReport);
}

describe("V6 semantic postchecks", () => {
  it("accepts the canonical 18-point fixture", () => {
    expect(() => assertV6Report(report(), input)).not.toThrow();
  });

  it("enforces every score-to-placement mapping", () => {
    const labels = ["档内最高位", "档内较高位", "档内中位", "档内较低位", "档内最低位"] as const;
    for (let score = 1; score <= 25; score += 1) {
      const band = Math.ceil(score / 5);
      const position = labels[(5 - (score % 5 || 5))];
      const candidate = report();
      candidate.total = score;
      candidate.band = band;
      candidate.level = ["", "第一档", "第二档", "第三档", "第四档", "第五档"][band];
      candidate.bandRange = [``, "1—5", "6—10", "11—15", "16—20", "21—25"][band];
      candidate.languagePlacement = position;
      expect(() => assertV6Report(candidate, input)).not.toThrow();
    }
  });

  it("rejects a mismatched placement or band range", () => {
    const placement = report();
    placement.languagePlacement = "档内较高位";
    expect(() => assertV6Report(placement, input)).toThrow(/score-placement/);

    const range = report();
    range.bandRange = "21—25";
    expect(() => assertV6Report(range, input)).toThrow(/band-range/);
  });

  it("applies the fifth-band fuse without assuming its inverse", () => {
    const candidate = report();
    candidate.total = 23;
    candidate.band = 5;
    candidate.bandRange = "21—25";
    candidate.level = "第五档";
    candidate.languagePlacement = "档内中位";
    candidate.contentJudgements[0].status = "明显问题";
    expect(() => assertV6Report(candidate, input)).toThrow(/fifth-band-fuse/);
  });

  it("rejects fabricated evidence but allows the fixture's longer evidence", () => {
    const candidate = report();
    candidate.contentJudgements[0].evidence = "a sentence that never appeared";
    expect(() => assertV6Report(candidate, input)).toThrow(/evidence-source/);
    expect(report().contentJudgements[3].evidence.split(/\s+/).length).toBeGreaterThan(7);
  });

  it("allows a focused string themeObject and rejects structured values at schema level", () => {
    expect(report().story.themeTrajectory.themeObject).toContain("以及");
    const candidate = structuredClone(fixture.goodReport) as unknown as Record<string, unknown>;
    const story = candidate.story as { themeTrajectory: Record<string, unknown> };
    story.themeTrajectory.themeObject = ["弟弟", "Toby"];
    expect(() => V6FinalReportSchema.parse(candidate)).toThrow();
  });

  it("rejects language issues copied from a locked starter", () => {
    const candidate = report();
    candidate.issues[0].original = "With the biscuits my wife had made";
    expect(() => assertV6Report(candidate, input)).toThrow(/locked-starter/);
  });

  it("requires canonical content keys in canonical order", () => {
    const candidate = report();
    candidate.contentJudgements[0].key = "theme";
    expect(() => assertV6Report(candidate, input)).toThrow(/content-keys/);
  });
});

describe("V6 source keyword postchecks", () => {
  function sourceDirection() {
    return V6Stage2Schema.parse({
      conflict: "The narrator's reasonable rule ignores his brother's emotional dependence on Toby.",
      concreteConflicts: ["Toby cannot enter the house"],
      foreshadowing: ["Toby was his constant companion"],
      sourceKeywords: [
        { category: "catalyst", quote: "It started to rain", function: "触发室外安排失效" },
        { category: "emotion", quote: "Not a chance", function: "显示哥哥持续受伤" },
        { category: "theme", quote: "constant companion", function: "说明 Toby 的陪伴意义" },
        { category: "constraint", quote: "knock over", function: "说明安全顾虑" },
        { category: "p2Prerequisite", quote: fixture.exam.starter2, function: "锁定第二段抵达门口" },
      ],
      themeTrajectory: {
        initialBelief: "The narrator believes the household rule is enough.",
        development: "He starts putting himself in his brother's shoes.",
        cognitiveEndpoint: "He sees his brother's grief and Toby's role.",
        cognitiveEndpointQuote: "I tried to put myself in my brother's shoes.",
        endpointStatus: "已经形成认知终点",
        themeSubject: "the narrator",
        themeObject: "his brother's situation and Toby's meaning",
        themeValue: "understanding another person's needs",
      },
    });
  }

  it("accepts five unique source-backed categories", () => {
    expect(() => assertV6SourceKeywords(sourceDirection(), input)).not.toThrow();
  });

  it("rejects missing categories, fabricated quotes, and duplicate clues", () => {
    const missing = sourceDirection();
    missing.sourceKeywords = missing.sourceKeywords.filter(item => item.category !== "constraint");
    expect(() => assertV6SourceKeywords(missing, input)).toThrow(/source-keyword-categories/);

    const fabricated = sourceDirection();
    fabricated.sourceKeywords[0].quote = "a storm invented by the model";
    expect(() => assertV6SourceKeywords(fabricated, input)).toThrow(/source-keyword-evidence/);

    const duplicate = sourceDirection();
    duplicate.sourceKeywords[1].quote = duplicate.sourceKeywords[0].quote;
    expect(() => assertV6SourceKeywords(duplicate, input)).toThrow(/source-keyword-duplicate/);
  });
});
