import {
  FinalReportSchema,
  ModelReportSchema,
  type FinalReport,
  type ParsedEssay,
  type WorkflowState,
} from "@/lib/schemas";
import {
  ModelOutputInvalidError,
  ProviderNotConfiguredError,
  defaultProviderFactory,
  isProviderConfigured,
  type LLMProvider,
  type ProviderFactory,
} from "@/lib/providers";
import { EVALUATION_PROMPT } from "@/lib/prompts/evaluation";
import { DEMO_REPORT } from "@/data/examples/demo-report";
import { ensureStartersPreserved, stripStarterIssues } from "@/lib/workflow/starters";

export const MAX_REPAIR_ATTEMPTS = 2;

export type RunWorkflowOptions = {
  onStage?: (state: WorkflowState) => void;
  providerFactory?: ProviderFactory;
};

function stageReporter(onStage?: (state: WorkflowState) => void) {
  return (stage: WorkflowState["stage"], status: WorkflowState["status"], message?: string) =>
    onStage?.({ stage, status, ...(message ? { message } : {}) });
}

/**
 * 真实评测：严格只使用本次提交的五个输入块。
 * 未配置模型或模型输出不合规时抛错，绝不回退到示例报告。
 */
export async function runWorkflow(parsed: ParsedEssay, options: RunWorkflowOptions = {}): Promise<FinalReport> {
  const stage = stageReporter(options.onStage);
  const factory = options.providerFactory ?? defaultProviderFactory;
  if (!options.providerFactory && !isProviderConfigured()) {
    stage("story", "error", "未配置 AI 模型");
    throw new ProviderNotConfiguredError();
  }
  const provider: LLMProvider = factory();

  stage("story", "running");
  const modelReport = await requestModelReport(provider, parsed, stage);
  stage("story", "done");
  stage("language", "done");
  stage("score", "done");

  stage("report", "running");
  const report = FinalReportSchema.parse({
    ...modelReport,
    language: { ...modelReport.language, issues: stripStarterIssues(modelReport.language.issues, parsed) },
    polishedVersion: ensureStartersPreserved(modelReport.polishedVersion, parsed),
    modelVersion: provider.modelName,
    reportKind: "real",
  });
  stage("report", "done");
  return report;
}

async function requestModelReport(
  provider: LLMProvider,
  parsed: ParsedEssay,
  stage: ReturnType<typeof stageReporter>,
) {
  // 完整传入五个输入块，并显式标注哪些内容属于锁定的给定首句。
  const payload = {
    sourceText: parsed.sourceText,
    starter1: parsed.starter1,
    studentParagraph1: parsed.studentParagraph1,
    starter2: parsed.starter2,
    studentParagraph2: parsed.studentParagraph2,
    lockedStarters: [parsed.starter1, parsed.starter2],
  };
  let lastError = "";
  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
    const hint = attempt === 0 ? undefined : repairHint(lastError);
    if (attempt > 0) stage("report", "running", `正在修复模型输出结构（第 ${attempt} 次）`);
    const raw = await provider.complete(
      EVALUATION_PROMPT,
      payload,
      { thinking: "disabled", maxCompletionTokens: 6000 },
      hint,
    );
    let candidate: unknown;
    try {
      candidate = JSON.parse(raw || "{}");
    } catch {
      lastError = "返回内容不是合法 JSON";
      continue;
    }
    const result = ModelReportSchema.safeParse(candidate);
    if (result.success) return result.data;
    lastError = result.error.issues
      .slice(0, 6)
      .map(issue => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
  }
  throw new ModelOutputInvalidError(lastError);
}

function repairHint(detail: string) {
  return `上一次返回不符合要求，请只输出修正后的完整 JSON，不要解释。需要修复的问题：${detail}`;
}

/** 脱敏示例报告：仅由显式 demo 入口调用，永远标记为 demo。 */
export function runDemoWorkflow(): FinalReport {
  return FinalReportSchema.parse({ ...DEMO_REPORT, modelVersion: "demo-fixture-v2", reportKind: "demo" });
}
