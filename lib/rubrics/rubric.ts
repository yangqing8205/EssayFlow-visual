/** EssayFlow v2：四项内容共同判档，语言整体表现决定档内分。 */
export const RUBRIC = {
  version: "2.0",
  principle: "content-band-language-placement",
  contentStandards: [
    { key: "conflict", label: "解决矛盾", question: "是否回应核心矛盾并形成问题—行动—结果闭环" },
    { key: "cohesion", label: "文本衔接", question: "原文、P1、P2的动作、状态与信息是否连续" },
    { key: "theme", label: "主题升华", question: "是否延续或深化原文认知终点" },
    { key: "plausibility", label: "情节合理性", question: "人物、事实、动机与因果是否符合原文及常识" },
  ],
  bands: [
    { band: 5, range: "21—25", description: "四项内容整体完成度高，核心矛盾形成闭环，主题延续或深化。" },
    { band: 4, range: "16—20", description: "较好完成任务，但部分解决、铺垫、主题或因果仍有不足。" },
    { band: 3, range: "11—15", description: "部分完成任务，核心回应、衔接或合理性存在明显缺口。" },
    { band: 2, range: "6—10", description: "核心故事较难成立，多项内容标准存在严重问题。" },
    { band: 1, range: "1—5", description: "内容严重不足、基本无关或无法形成可辨认续写。" },
  ],
  languagePlacement: ["档内高位", "档内中位", "档内低位"],
  /** 主题降格不进第五档；其余内容完整时一般最高 18 分。 */
  themeDegradationCap: 18,
  constraints: {
    noDimensionSum: true,
    noErrorCounting: true,
    noAuditPrompt: true,
    starterSentencesLocked: true,
    /** 语言再好也不得突破内容判定的档位上限。 */
    languageCannotExceedContentBand: true,
    /** 所有证据必须是本次输入中确实出现的原句片段。 */
    evidenceMustComeFromInput: true,
  },
} as const;
