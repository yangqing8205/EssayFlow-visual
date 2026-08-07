import type { ModelReport } from "@/lib/schemas";

/**
 * 固定的脱敏示例报告，对应 data/examples/demo.ts 中自编的 Mia 示例作文。
 * 这是静态展示素材，不是任何形式的评测结果：
 * 只有显式的 demo 入口可以读取它，真实评测链路不引用本文件。
 */
export const DEMO_REPORT: ModelReport = {
  score: {
    total: 22,
    band: 5,
    bandRange: "21—25",
    level: "第五档",
    summary:
      "续写完整回应核心矛盾，段间衔接自然，主题从人物选择中生长；语言整体清楚，细节表现仍可加强。",
    contentJudgements: [
      {
        key: "conflict",
        label: "解决矛盾",
        status: "表现充分",
        judgement: "利用原文人物关系完成内驱破局，并兼顾个人与公共目标。",
        evidence: ["put his arm over her shoulder", "a friend in need mattered more"],
        suggestion: "增加一处 Mia 作出选择前的短暂犹豫，让转折更有力量。",
      },
      {
        key: "cohesion",
        label: "文本衔接",
        status: "表现充分",
        judgement: "两句段首语所需的动作和状态前提均得到建立。",
        evidence: ["helped him stand", "reached the finish line together"],
        suggestion: "保留当前清楚的动作链。",
      },
      {
        key: "theme",
        label: "主题升华",
        status: "表现充分",
        judgement: "善意、互助与公共影响由结局自然呈现，没有停留在口号。",
        evidence: ["kindness could carry a message farther than any first-place medal"],
        suggestion: "可以用更克制的心理描写收束主题。",
      },
      {
        key: "plausibility",
        label: "情节合理性",
        status: "轻微瑕疵",
        judgement: "人物行为符合原文，捐助结果略理想化但具有合理因果。",
        evidence: ["several parents promised to donate"],
        suggestion: "补充观众为何受到触动的一处具体反应。",
      },
    ],
    languagePlacement: "档内中位",
    languageRationale: "全文表达准确清楚并能推进故事，但句式与感官细节尚未达到档内最高水平。",
    constraints: [],
  },
  story: {
    characters: ["Mia", "Leo"],
    conflict: "Mia 必须在为图书馆赢得比赛与帮助受伤的竞争对手之间作出选择。",
    concreteConflicts: ["Leo 脚踝受伤", "泥泞赛道增加救助难度", "帮助 Leo 可能失去冠军与募款关注"],
    foreshadowing: ["Leo 曾在课后帮助 Mia", "Mia 在终点前放慢脚步"],
    theme: "真正的善意能够产生比个人胜利更长远的影响。",
    themeTrajectory: {
      initial: "Mia 把赢得比赛视为帮助图书馆的关键。",
      development: "她看到曾帮助过自己的 Leo 受伤，必须重新权衡胜利与善意。",
      endpoint: "人物通过主动选择发现，帮助他人并不必然牺牲更大的公共目标。",
      continuationAlignment: "延续或深化",
      explanation: "Mia 的选择既帮助了 Leo，也意外带动观众捐助图书馆。",
    },
    resolution: "Mia 放弃个人领先优势扶起 Leo，两人共同到达终点，她的选择进一步促成图书馆捐助。",
    evidence: ["put his arm over her shoulder", "a friend in need mattered more", "parents promised to donate"],
  },
  language: {
    issues: [
      {
        sentence: "The muddy path made every step difficult, but neither of them complained.",
        problem: "句意正确，但场景感仍可加强",
        reason: "加入更具体的动作感受能让叙事更具画面。",
        rewrite: "Mud pulled at their shoes, yet neither of them uttered a complaint.",
      },
    ],
    strengths: ["叙述清晰，时态整体稳定", "对话推动了人物选择", "结尾主题得到情节支撑"],
    overall: "语言整体准确清楚、较为流畅，能够有效完成叙事；句式与细节表现仍有提升空间。",
  },
  polishedVersion: `Without another thought, Mia turned back toward Leo. She put his arm over her shoulder and helped him stand. Mud pulled at their shoes, yet neither of them uttered a complaint. Leo told her to leave him and win the race. Mia shook her head, saying that the library mattered, but a friend in need mattered more.

When they finally reached the finish line together, the crowd fell silent for a moment. Then cheers rose from every side. Although Mia did not win the race, several parents promised to donate to the library after hearing what she had done. Leo thanked her with tears in his eyes. Mia realized that kindness could carry a message farther than any first-place medal.`,
};
