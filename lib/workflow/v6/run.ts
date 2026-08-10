import { z, type ZodType } from "zod";
import {
  ModelOutputInvalidError,
  defaultProviderFactory,
  type CompletionOptions,
  type LLMProvider,
  type ProviderFactory,
} from "@/lib/providers";
import {
  assertV6Report,
  assertV6SourceKeywords,
  buildV6FallbackReport,
  enforceV6ConflictAudit,
  finalizeV6ScoreDecision,
  normalizeV6FinalCandidate,
  recoverV6Report,
  V6PostcheckError,
} from "@/lib/scoring/postcheck";
import { STAGE1_PROMPT, buildStage1Input } from "@/lib/prompts/v6/stage1";
import { STAGE2_PROMPT, buildStage2Input } from "@/lib/prompts/v6/stage2";
import { STAGE3_PROMPT, STAGE3_RECOVERY_PROMPT, buildStage3Input } from "@/lib/prompts/v6/stage3";
import { STAGE4_PROMPT, STAGE4_RECOVERY_PROMPT, buildStage4Input } from "@/lib/prompts/v6/stage4";
import { normalizeV6StageCandidate } from "@/lib/workflow/v6/normalize";
import {
  V6Stage4DecisionSchema,
  V6Stage1Schema,
  V6Stage2Schema,
  V6Stage3Schema,
  type V6EvaluateInput,
  type V6FinalReport,
  type V6Stage3,
  type V6Stage4Decision,
  type V6StageEvent,
} from "@/lib/workflow/v6/types";

type RunV6Options = {
  providerFactory?: ProviderFactory;
  onStage?: (event: V6StageEvent) => void;
};

const STAGE_OPTIONS: Record<1 | 2 | 3 | 4, CompletionOptions> = {
  1: { thinking: "disabled", maxCompletionTokens: 3000 },
  2: { thinking: "disabled", maxCompletionTokens: 4000 },
  3: { thinking: "enabled", maxCompletionTokens: 5000 },
  4: { thinking: "enabled", maxCompletionTokens: 7000 },
};

function parseJson(raw: string) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new ModelOutputInvalidError("invalid-json");
  }
}

function schemaDetail(error: z.ZodError) {
  return error.issues.slice(0, 8).map(issue => `${issue.path.join(".") || "root"}:${issue.message}`).join(";");
}

async function requestStage<TParsed, TResult = TParsed>(
  provider: LLMProvider,
  system: string,
  input: unknown,
  schema: ZodType<TParsed>,
  options: CompletionOptions,
  validate?: (value: TResult) => void,
  normalize?: (value: TParsed) => TResult,
  recover?: (value: TResult, error: V6PostcheckError) => TResult,
  prepare?: (value: unknown) => unknown,
  fallback?: (error: unknown) => TResult | Promise<TResult>,
) {
  let repairHint: string | undefined;
  let lastError: unknown;
  let lastSchemaValidValue: TResult | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await provider.complete(system, input, options, repairHint);
    try {
      const parsed = parseJson(raw);
      const result = schema.safeParse(prepare ? prepare(parsed) : parsed);
      if (!result.success) throw new ModelOutputInvalidError(schemaDetail(result.error));
      const value: TResult = normalize
        ? normalize(result.data)
        : result.data as unknown as TResult;
      lastSchemaValidValue = value;
      validate?.(value);
      return value;
    } catch (error) {
      lastError = error;
      const detail = error instanceof V6PostcheckError
        ? error.rule
        : error instanceof ModelOutputInvalidError
          ? error.detail
          : "unknown-validation-error";
      repairHint = `上一次 JSON 未通过服务端校验。只返回完整修正 JSON。违反规则：${detail}`;
    }
  }
  if (lastError instanceof V6PostcheckError && lastSchemaValidValue !== undefined) {
    return recover ? recover(lastSchemaValidValue, lastError) : lastSchemaValidValue;
  }
  if (fallback) return await fallback(lastError);
  throw lastError;
}

export async function runV6Pipeline(input: V6EvaluateInput, options: RunV6Options = {}): Promise<V6FinalReport> {
  const provider = (options.providerFactory ?? defaultProviderFactory)();
  const run = async <T>(stage: 1 | 2 | 3 | 4, task: () => Promise<T>) => {
    options.onStage?.({ stage, status: "running" });
    const result = await task();
    options.onStage?.({ stage, status: "complete" });
    return result;
  };

  const stage1 = await run(1, () => requestStage(
    provider,
    STAGE1_PROMPT,
    buildStage1Input(input),
    V6Stage1Schema,
    STAGE_OPTIONS[1],
    undefined,
    undefined,
    undefined,
    value => normalizeV6StageCandidate(value, 1),
  ));
  const stage2 = await run(2, () => requestStage(
    provider,
    STAGE2_PROMPT,
    buildStage2Input(input, stage1),
    V6Stage2Schema,
    STAGE_OPTIONS[2],
    value => assertV6SourceKeywords(value, input),
    undefined,
    undefined,
    value => normalizeV6StageCandidate(value, 2),
  ));
  const stage3 = await run(3, () => requestStage<V6Stage3, V6Stage3 | undefined>(
    provider,
    STAGE3_PROMPT,
    buildStage3Input(input, stage1, stage2),
    V6Stage3Schema,
    STAGE_OPTIONS[3],
    undefined,
    enforceV6ConflictAudit,
    undefined,
    value => normalizeV6StageCandidate(value, 3),
    async () => {
      try {
        return await requestStage(
          provider,
          STAGE3_RECOVERY_PROMPT,
          buildStage3Input(input, stage1, stage2),
          V6Stage3Schema,
          { thinking: "disabled", maxCompletionTokens: 3000 },
          undefined,
          enforceV6ConflictAudit,
          undefined,
          value => normalizeV6StageCandidate(value, 3),
        );
      } catch {
        return undefined;
      }
    },
  ));
  const report = await run(4, () => requestStage<V6Stage4Decision, V6FinalReport>(
    provider,
    STAGE4_PROMPT,
    buildStage4Input(input, stage1, stage2, stage3),
    V6Stage4DecisionSchema,
    STAGE_OPTIONS[4],
    report => assertV6Report(report, input, stage3),
    report => finalizeV6ScoreDecision(report, stage3, !stage3),
    (report, error) => recoverV6Report(report, input, error, stage3),
    value => normalizeV6FinalCandidate(normalizeV6StageCandidate(value, 4), stage2),
    () => requestStage<V6Stage4Decision, V6FinalReport>(
      provider,
      STAGE4_RECOVERY_PROMPT,
      buildStage4Input(input, stage1, stage2, stage3),
      V6Stage4DecisionSchema,
      { thinking: "disabled", maxCompletionTokens: 4000 },
      report => assertV6Report(report, input, stage3),
      report => finalizeV6ScoreDecision(report, stage3, !stage3),
      (report, error) => recoverV6Report(report, input, error, stage3),
      value => normalizeV6FinalCandidate(normalizeV6StageCandidate(value, 4), stage2),
      stage3 ? () => buildV6FallbackReport(input, stage2, stage3) : undefined,
    ),
  ));
  return { ...report, modelVersion: provider.modelName };
}
