import { z } from "zod";

export const V6LanguagePlacementSchema = z.enum([
  "档内最高位",
  "档内较高位",
  "档内中位",
  "档内较低位",
  "档内最低位",
]);

export const V6ContentKeySchema = z.enum(["conflict", "cohesion", "theme", "plausibility"]);
export const V6ContentStatusSchema = z.enum(["表现充分", "轻微瑕疵", "明显问题", "失败/硬伤"]);

export const V6ContentJudgementSchema = z.object({
  key: V6ContentKeySchema,
  label: z.string().min(1),
  status: V6ContentStatusSchema,
  judgement: z.string().min(1),
  evidence: z.string().min(1),
  suggestion: z.string().min(1),
});

export const V6ThemeTrajectorySchema = z.object({
  initialBelief: z.string().min(1),
  development: z.string().min(1),
  cognitiveEndpoint: z.string().min(1),
  themeSubject: z.string().min(1),
  themeObject: z.string().min(1),
  themeValue: z.string().min(1),
  continuationAlignment: z.enum(["延续或深化", "方向一致但较浅", "主题降格", "主题冲突或倒退"]),
  explanation: z.string().min(1),
});

export const V6IssueSchema = z.object({
  original: z.string().min(1),
  problem: z.string().min(1),
  explanation: z.string().min(1),
  rewrite: z.string().min(1),
});

export const V6FinalReportSchema = z.object({
  total: z.number().int().min(1).max(25),
  band: z.number().int().min(1).max(5),
  bandRange: z.string().min(1),
  level: z.string().min(1),
  languagePlacement: V6LanguagePlacementSchema,
  summary: z.string().min(1),
  languageRationale: z.string().min(1),
  constraints: z.array(z.string()),
  contentJudgements: z.array(V6ContentJudgementSchema).length(4),
  story: z.object({
    theme: z.string().min(1),
    themeTrajectory: V6ThemeTrajectorySchema,
  }),
  issues: z.array(V6IssueSchema),
  modelVersion: z.string().optional(),
});

export const V6EvaluateInputSchema = z.object({
  sourceText: z.string().min(60, "未能识别完整阅读原文").max(15_000, "原文过长"),
  starter1: z.string().min(5, "未能识别第一段给定首句").max(1_000, "第一段首句过长"),
  studentParagraph1: z.string().min(5, "请填写第一段学生续写").max(8_000, "第一段续写过长"),
  starter2: z.string().min(5, "未能识别第二段给定首句").max(1_000, "第二段首句过长"),
  studentParagraph2: z.string().min(5, "请填写第二段学生续写").max(8_000, "第二段续写过长"),
});

export const V6Stage1Schema = z.object({
  facts: z.array(z.object({ fact: z.string().min(1), evidence: z.string().min(1) })).min(1),
  characters: z.array(z.string().min(1)).min(1),
  relationships: z.array(z.string().min(1)).min(1),
  knownInformation: z.array(z.string().min(1)).min(1),
  completedEvents: z.array(z.string().min(1)).min(1),
});

export const V6SourceKeywordSchema = z.object({
  category: z.enum(["catalyst", "emotion", "theme", "constraint", "p2Prerequisite"]),
  quote: z.string().min(1),
  function: z.string().min(1),
}).superRefine((item, context) => {
  if (item.category === "p2Prerequisite") return;
  const words = item.quote.trim().split(/\s+/).filter(Boolean);
  if (words.length > 7) {
    context.addIssue({ code: "custom", message: "sourceKeyword must contain at most 7 words" });
  }
});

export const V6Stage2Schema = z.object({
  conflict: z.string().min(1),
  concreteConflicts: z.array(z.string().min(1)).min(1),
  foreshadowing: z.array(z.string().min(1)).min(1),
  sourceKeywords: z.array(V6SourceKeywordSchema).min(1).max(10),
  themeTrajectory: z.object({
    initialBelief: z.string().min(1),
    development: z.string().min(1),
    cognitiveEndpoint: z.string().min(1),
    cognitiveEndpointQuote: z.string().min(1),
    endpointStatus: z.enum(["已经形成认知终点", "仅给出未完成走向"]),
    themeSubject: z.string().min(1),
    themeObject: z.string().min(1),
    themeValue: z.string().min(1),
  }),
});

export const V6Stage3Schema = z.object({
  factChecks: z.array(z.object({
    claim: z.string().min(1),
    status: z.enum(["consistent", "conflict", "not-established"]),
    evidence: z.string().min(1),
  })),
  draftJudgements: z.array(z.object({
    key: V6ContentKeySchema,
    status: V6ContentStatusSchema,
    judgement: z.string().min(1),
    evidence: z.string().min(1),
  })).length(4),
});

export type V6EvaluateInput = z.infer<typeof V6EvaluateInputSchema>;
export type V6FinalReport = z.infer<typeof V6FinalReportSchema>;
export type V6Stage1 = z.infer<typeof V6Stage1Schema>;
export type V6Stage2 = z.infer<typeof V6Stage2Schema>;
export type V6Stage3 = z.infer<typeof V6Stage3Schema>;

export type V6StageEvent = {
  stage: 1 | 2 | 3 | 4;
  status: "running" | "complete";
};
