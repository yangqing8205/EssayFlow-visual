import type { LLMProvider } from "@/lib/providers";
import type { ModelReport, ParsedEssay } from "@/lib/schemas";

export type CompleteCall = { system: string; input: unknown; repairHint?: string };

/** 记录每次调用，并按脚本依次返回原始字符串，用于验证重试与错误路径。 */
export class ScriptedProvider implements LLMProvider {
  readonly calls: CompleteCall[] = [];
  readonly modelName = "scripted-test-model";
  constructor(private responses: string[]) {}
  async complete(system: string, input: unknown, repairHint?: string) {
    this.calls.push({ system, input, repairHint });
    return this.responses[Math.min(this.calls.length - 1, this.responses.length - 1)] ?? "";
  }
}

function firstSentence(text: string) {
  return text.trim().split(/(?<=[.!?])\s+/)[0] ?? text.trim();
}

/**
 * 仅根据本次输入生成结构合法的报告，模拟一个「守规矩」的模型。
 * 它不含任何写死的人物或情节，因此可以验证报告内容确实来自当前输入。
 */
export function buildGroundedReport(parsed: ParsedEssay): ModelReport {
  const sentence = firstSentence(parsed.studentParagraph1);
  const closing = firstSentence(parsed.studentParagraph2);
  const sourceOpening = firstSentence(parsed.sourceText);
  const evidence = [sentence, closing];
  return {
    score: {
      total: 18,
      band: 4,
      bandRange: "16—20",
      level: "第四档",
      summary: `续写围绕「${sourceOpening.slice(0, 24)}」建立的矛盾展开，主题方向一致但收束略浅。`,
      contentJudgements: (
        [
          ["conflict", "解决矛盾"],
          ["cohesion", "文本衔接"],
          ["theme", "主题升华"],
          ["plausibility", "情节合理性"],
        ] as const
      ).map(([key, label]) => ({
        key,
        label,
        status: "轻微瑕疵" as const,
        judgement: `围绕 ${label} 的判断基于本次提交的续写内容。`,
        evidence,
        suggestion: `继续加强 ${label} 的具体化处理。`,
      })),
      languagePlacement: "档内中位",
      languageRationale: "表达清楚、时态稳定，句式变化仍有空间。",
      constraints: [],
    },
    story: {
      characters: ["Daniel", "Ms. Reed"],
      conflict: sourceOpening,
      concreteConflicts: [closing],
      foreshadowing: [sourceOpening],
      theme: "写作的价值不依赖外部评价。",
      themeTrajectory: {
        initial: sourceOpening,
        development: sentence,
        endpoint: closing,
        continuationAlignment: "方向一致但较浅",
        explanation: "结尾延续了原文对内在价值的认识，但心理刻画偏简略。",
      },
      resolution: sentence,
      evidence,
    },
    language: {
      // 故意把两句锁定首句一起塞进来，用于验证服务端会剔除它们。
      issues: [
        { sentence: parsed.starter1, problem: "锁定首句不应被纠错", reason: "测试用途", rewrite: "不应出现" },
        { sentence: parsed.starter2, problem: "锁定首句不应被纠错", reason: "测试用途", rewrite: "不应出现" },
        { sentence, problem: "细节可以更具体", reason: "画面感不足", rewrite: `${sentence} (revised)` },
      ],
      strengths: ["叙述连贯", "时态稳定"],
      overall: "语言整体清楚，能够支撑叙事。",
    },
    polishedVersion: `${parsed.starter1} ${parsed.studentParagraph1}\n\n${parsed.starter2} ${parsed.studentParagraph2}`,
  };
}

export function groundedProvider(parsed: ParsedEssay) {
  return new ScriptedProvider([JSON.stringify(buildGroundedReport(parsed))]);
}
