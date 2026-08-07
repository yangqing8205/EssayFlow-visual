import { describe, expect, it } from "vitest";
import { loadV6Rubric, verifyRubric } from "@/lib/scoring/rubric";

describe("V6 rubric integrity", () => {
  it("loads the frozen rubric with the supplied hash prefix", () => {
    const rubric = loadV6Rubric();

    expect(rubric).toContain("四项内容标准共同定档");
    expect(verifyRubric(rubric)).toBe(true);
  });

  it("rejects edited rubric text", () => {
    expect(() => verifyRubric(`${loadV6Rubric()}edited`)).toThrow(/hash mismatch/i);
  });
});
