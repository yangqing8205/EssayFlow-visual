import {z} from "zod";
export const EssayInputSchema=z.object({promptText:z.string().min(80,"请粘贴包含原文和两句段首语的完整题目"),studentParagraph1:z.string().min(10,"请填写第一段学生续写"),studentParagraph2:z.string().min(10,"请填写第二段学生续写")});
export type EssayInput=z.infer<typeof EssayInputSchema>;
export const ParsedEssaySchema=z.object({sourceText:z.string().min(60,"未能识别完整阅读原文"),starter1:z.string().min(5,"未能识别第一段给定首句"),studentParagraph1:z.string().min(5),starter2:z.string().min(5,"未能识别第二段给定首句"),studentParagraph2:z.string().min(5)});
export type ParsedEssay=z.infer<typeof ParsedEssaySchema>;
export const ThemeTrajectorySchema=z.object({initial:z.string(),development:z.string(),endpoint:z.string(),continuationAlignment:z.enum(["延续或深化","方向一致但较浅","主题降格","主题冲突或倒退"]),explanation:z.string()});
export const StoryAnalysisSchema=z.object({characters:z.array(z.string()),conflict:z.string(),concreteConflicts:z.array(z.string()),foreshadowing:z.array(z.string()),theme:z.string(),themeTrajectory:ThemeTrajectorySchema,resolution:z.string(),evidence:z.array(z.string())});
export type StoryAnalysis=z.infer<typeof StoryAnalysisSchema>;
export const LanguageIssueSchema=z.object({sentence:z.string(),problem:z.string(),reason:z.string(),rewrite:z.string()});
export type LanguageIssue=z.infer<typeof LanguageIssueSchema>;
export const LanguageAnalysisSchema=z.object({issues:z.array(LanguageIssueSchema),strengths:z.array(z.string()),overall:z.string()});
export type LanguageAnalysis=z.infer<typeof LanguageAnalysisSchema>;
export const ContentJudgementSchema=z.object({key:z.enum(["conflict","cohesion","theme","plausibility"]),label:z.string(),status:z.enum(["表现充分","轻微瑕疵","明显问题","失败/硬伤"]),judgement:z.string(),evidence:z.array(z.string()).min(1),suggestion:z.string()});
export type ContentJudgement=z.infer<typeof ContentJudgementSchema>;
export const ScoreReportSchema=z.object({total:z.number().int().min(1).max(25),band:z.number().int().min(1).max(5),bandRange:z.string(),level:z.string(),summary:z.string(),contentJudgements:z.array(ContentJudgementSchema).length(4),languagePlacement:z.enum(["档内高位","档内中位","档内低位"]),languageRationale:z.string(),constraints:z.array(z.string())});
export type ScoreReport=z.infer<typeof ScoreReportSchema>;
/** 模型必须自行产出的报告主体，不含服务端补写的溯源字段。 */
export const ModelReportSchema=z.object({score:ScoreReportSchema,story:StoryAnalysisSchema,language:LanguageAnalysisSchema,polishedVersion:z.string()});
export type ModelReport=z.infer<typeof ModelReportSchema>;
/** real=基于用户本次提交内容的真实评测；demo=脱敏示例报告，只能由显式 demo 入口产生。 */
export const ReportKindSchema=z.enum(["real","demo"]);
export type ReportKind=z.infer<typeof ReportKindSchema>;
export const REPORT_KIND_LABEL:Record<ReportKind,string>={real:"真实作文评测",demo:"脱敏示例报告"};
export const FinalReportSchema=ModelReportSchema.extend({modelVersion:z.string(),reportKind:ReportKindSchema});
export type FinalReport=z.infer<typeof FinalReportSchema>;
/** 真实评测请求必须携带完整五个输入块；mode 省略时视为 real。 */
export const RealEvaluateRequestSchema=ParsedEssaySchema.extend({mode:z.literal("real").optional()});
/** 脱敏示例请求不接受用户作文，避免真实输入混入示例路径。 */
export const DemoEvaluateRequestSchema=z.strictObject({mode:z.literal("demo")});
export const ProviderStatusSchema=z.object({configured:z.boolean(),model:z.string().nullable(),baseUrlConfigured:z.boolean()});
export type ProviderStatus=z.infer<typeof ProviderStatusSchema>;
export const RevisionComparisonSchema=z.object({scoreDelta:z.number(),resolved:z.array(z.string()),remaining:z.array(z.string()),changes:z.array(z.object({before:z.string(),after:z.string()}))});
export type RevisionComparison=z.infer<typeof RevisionComparisonSchema>;
export type WorkflowStage="parse"|"story"|"language"|"score"|"report";
export type WorkflowState={stage:WorkflowStage;status:"idle"|"running"|"done"|"error";message?:string};
