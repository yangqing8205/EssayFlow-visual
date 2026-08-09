import { describe, expect, it } from "vitest";
import { V6_RUBRIC } from "@/lib/scoring/rubric";
import { buildStage1Input } from "@/lib/prompts/v6/stage1";
import { STAGE2_PROMPT, buildStage2Input } from "@/lib/prompts/v6/stage2";
import { STAGE4_PROMPT } from "@/lib/prompts/v6/stage4";

const parsed = {
  sourceText: "SOURCE_ONLY_SENTINEL with enough original source text for the parser contract.",
  starter1: "STARTER_ONE_SENTINEL.",
  studentParagraph1: "STUDENT_P1_SECRET_SENTINEL.",
  starter2: "STARTER_TWO_SENTINEL.",
  studentParagraph2: "STUDENT_P2_SECRET_SENTINEL.",
};

const stage1 = {
  facts: [{ fact: "fact", evidence: "SOURCE_ONLY_SENTINEL" }],
  characters: ["narrator"],
  relationships: ["brothers"],
  knownInformation: ["fact"],
  completedEvents: ["event"],
};

describe("V6 prompt isolation", () => {
  it("tells stage 2 to copy the complete second starter into p2Prerequisite", () => {
    expect(STAGE2_PROMPT).toContain("p2Prerequisite 的 quote 必须完整逐字等于 starter2");
  });

  it("keeps starters and student writing out of Stage 1", () => {
    const payload = JSON.stringify(buildStage1Input(parsed));
    expect(payload).toContain("SOURCE_ONLY_SENTINEL");
    expect(payload).not.toContain("STARTER_ONE_SENTINEL");
    expect(payload).not.toContain("STARTER_TWO_SENTINEL");
    expect(payload).not.toContain("STUDENT_P1_SECRET_SENTINEL");
    expect(payload).not.toContain("STUDENT_P2_SECRET_SENTINEL");
  });

  it("allows exam starters but keeps student writing out of Stage 2", () => {
    const payload = JSON.stringify(buildStage2Input(parsed, stage1));
    expect(payload).toContain("STARTER_ONE_SENTINEL");
    expect(payload).toContain("STARTER_TWO_SENTINEL");
    expect(payload).not.toContain("STUDENT_P1_SECRET_SENTINEL");
    expect(payload).not.toContain("STUDENT_P2_SECRET_SENTINEL");
  });

  it("uses the exact verified rubric in Stage 4", () => {
    expect(STAGE4_PROMPT.endsWith(V6_RUBRIC)).toBe(true);
  });

  it("separates solution completeness from hard story-world consistency", () => {
    expect(V6_RUBRIC).toContain("【解决矛盾】评价的是解决方案的完成程度");
    expect(V6_RUBRIC).toContain("不得根据具体冲突的数量机械确定 status");
    expect(V6_RUBRIC).toContain("【情节合理性】评价的是情节能否在原文建立的故事世界中成立");
  });

  it("forbids duplicate negative judgements across content dimensions", () => {
    expect(V6_RUBRIC).toContain("一个缺陷不得仅因能够用不同措辞描述，就在多个维度中重复降低评价");
    expect(V6_RUBRIC).toContain("如果不能给出独立的判断对象和独立理由");
  });
});
