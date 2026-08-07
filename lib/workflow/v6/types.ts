import { z } from "zod";
import { ParsedEssaySchema } from "@/lib/schemas";

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

export const V6EvaluateInputSchema = ParsedEssaySchema;

export type V6EvaluateInput = z.infer<typeof V6EvaluateInputSchema>;
export type V6FinalReport = z.infer<typeof V6FinalReportSchema>;

