import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/v6-real-essay.json";
import { assertV6Report } from "@/lib/scoring/postcheck";
import { V6FinalReportSchema } from "@/lib/workflow/v6/types";

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
