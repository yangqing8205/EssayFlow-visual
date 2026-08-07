import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/v6-real-essay.json";
import type { CompletionOptions, LLMProvider } from "@/lib/providers";
import { runV6Pipeline } from "@/lib/workflow/v6/run";

const parsed = {
  sourceText: fixture.exam.sourceText,
  starter1: fixture.exam.starter1,
  studentParagraph1: fixture.sample.p1,
  starter2: fixture.exam.starter2,
  studentParagraph2: fixture.sample.p2,
};

const stage1 = {
  facts: [{ fact: "Toby is the brother's dog.", evidence: "his dog Toby" }],
  characters: ["the narrator", "the narrator's brother", "Toby"],
  relationships: ["the narrator and his brother are siblings"],
  knownInformation: ["the narrator knows Toby's name"],
  completedEvents: ["the brother left with Toby"],
};

const stage2 = {
  conflict: "The narrator protects his household but fails to see his brother's dependence on Toby.",
  concreteConflicts: ["Toby cannot enter the house"],
  foreshadowing: ["Toby was his constant companion"],
  sourceKeywords: [
    { category: "catalyst", quote: "It started to rain", function: "The weather forces everyone indoors" },
    { category: "emotion", quote: "Not a chance", function: "The brother remains hurt" },
    { category: "theme", quote: "constant companion", function: "Toby's emotional role" },
    { category: "constraint", quote: "knock over", function: "The narrator's safety concern" },
    { category: "p2Prerequisite", quote: fixture.exam.starter2, function: "arrival at the door" },
  ],
  themeTrajectory: {
    initialBelief: "The narrator believes his rule is reasonable.",
    development: "He attempts to stand in his brother's shoes.",
    cognitiveEndpoint: "He sees that he ignored his brother's emotional support.",
    cognitiveEndpointQuote: "I tried to put myself in my brother's shoes.",
    endpointStatus: "已经形成认知终点",
    themeSubject: "the narrator",
    themeObject: "his brother's situation and Toby's meaning",
    themeValue: "understanding another person's situation",
  },
};

const stage3 = {
  factChecks: [{ claim: "The narrator knows Toby's name.", status: "consistent", evidence: "Toby" }],
  draftJudgements: [
    { key: "conflict", status: "轻微瑕疵", judgement: "The conflict is resolved.", evidence: "we had never taken Toby as a part of our family" },
    { key: "cohesion", status: "表现充分", judgement: "The paragraphs connect.", evidence: "I made a plan to visit my brother" },
    { key: "theme", status: "轻微瑕疵", judgement: "The ending becomes generic.", evidence: "understanding, caring and true love" },
    { key: "plausibility", status: "表现充分", judgement: "No source fact is contradicted.", evidence: "three huge boxes of dog food" },
  ],
};

class QueueProvider implements LLMProvider {
  readonly modelName = "deepseek-v4-flash-test";
  readonly calls: Array<{ options: CompletionOptions; input: unknown; repairHint?: string }> = [];
  constructor(private readonly responses: string[]) {}
  async complete(_system: string, input: unknown, options: CompletionOptions, repairHint?: string) {
    this.calls.push({ options, input, repairHint });
    return this.responses[this.calls.length - 1] ?? this.responses.at(-1) ?? "";
  }
}

function responses(finalReport: unknown = fixture.goodReport) {
  return [stage1, stage2, stage3, finalReport].map(value => JSON.stringify(value));
}

describe("runV6Pipeline", () => {
  it("runs four isolated calls with real ordered progress", async () => {
    const provider = new QueueProvider(responses());
    const events: string[] = [];
    const report = await runV6Pipeline(parsed, {
      providerFactory: () => provider,
      onStage: event => events.push(`${event.stage}:${event.status}`),
    });

    expect(report.total).toBe(18);
    expect(report.modelVersion).toBe(provider.modelName);
    expect(provider.calls).toHaveLength(4);
    expect(provider.calls.map(call => call.options.thinking)).toEqual(["disabled", "disabled", "disabled", "disabled"]);
    const originalWordCount = `${fixture.sample.p1} ${fixture.sample.p2}`.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)?.length;
    expect(provider.calls[2].input).toMatchObject({ studentOriginalWordCount: originalWordCount });
    expect(provider.calls[3].input).toMatchObject({ studentOriginalWordCount: originalWordCount });
    expect(events).toEqual([
      "1:running", "1:complete",
      "2:running", "2:complete",
      "3:running", "3:complete",
      "4:running", "4:complete",
    ]);
  });

  it("repairs source keywords that fail service-side evidence checks", async () => {
    const invalidStage2 = structuredClone(stage2);
    invalidStage2.sourceKeywords[0].quote = "rain invented by the model";
    const provider = new QueueProvider([
      JSON.stringify(stage1),
      JSON.stringify(invalidStage2),
      JSON.stringify(stage2),
      JSON.stringify(stage3),
      JSON.stringify(fixture.goodReport),
    ]);

    await runV6Pipeline(parsed, { providerFactory: () => provider });

    expect(provider.calls).toHaveLength(5);
    expect(provider.calls[2].repairHint).toContain("source-keyword-evidence");
  });

  it("repairs one semantically invalid final report", async () => {
    const invalid = structuredClone(fixture.goodReport);
    invalid.languagePlacement = "档内较高位";
    const provider = new QueueProvider([...responses(invalid), JSON.stringify(fixture.goodReport)]);

    const report = await runV6Pipeline(parsed, { providerFactory: () => provider });

    expect(report.languagePlacement).toBe("档内中位");
    expect(provider.calls).toHaveLength(5);
    expect(provider.calls[4].repairHint).toContain("score-placement");
  });

  it("fails after one unsuccessful repair", async () => {
    const invalid = structuredClone(fixture.goodReport);
    invalid.languagePlacement = "档内较高位";
    const provider = new QueueProvider([...responses(invalid), JSON.stringify(invalid)]);

    await expect(runV6Pipeline(parsed, { providerFactory: () => provider })).rejects.toThrow(/score-placement/);
    expect(provider.calls).toHaveLength(5);
  });
});
