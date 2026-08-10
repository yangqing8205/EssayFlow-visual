import type { V6EvaluateInput, V6FinalReport, V6Stage2, V6Stage3 } from "@/lib/workflow/v6/types";

const LEVELS = ["", "第一档", "第二档", "第三档", "第四档", "第五档"] as const;
const RANGES = ["", "1—5", "6—10", "11—15", "16—20", "21—25"] as const;
const PLACEMENTS = ["档内最高位", "档内较高位", "档内中位", "档内较低位", "档内最低位"] as const;
const KEYS = ["conflict", "cohesion", "theme", "plausibility"] as const;
const HARD_STATUSES = new Set(["明显问题", "失败/硬伤"]);
const SOURCE_KEYWORD_CATEGORIES = ["catalyst", "emotion", "theme", "constraint", "p2Prerequisite"] as const;
const UNVERIFIED_EVIDENCE = "证据引用未通过逐字核验，请结合原文与续写复核。";
const VALIDATION_WARNING = "部分自动校验未通过，报告已保留供参考。请结合原文复核标记内容。";
const STRUCTURAL_FALLBACK_WARNING = "第四阶段报告结构异常，已依据前三阶段审计生成保守报告。语言档内位置仅供参考。";
const LABELS = {
  conflict: "解决矛盾",
  cohesion: "文本衔接",
  theme: "主题表达",
  plausibility: "情节合理性",
} as const;
const SUGGESTIONS = {
  conflict: "补充人物之间真实的沟通、回应与关系修复过程。",
  cohesion: "加强两段之间的行动准备与信息承接。",
  theme: "让人物认知变化通过具体行动自然呈现。",
  plausibility: "复核原文事实、人物动机和关键因果关系。",
} as const;

export class V6PostcheckError extends Error {
  constructor(readonly rule: string) {
    super(`v6-postcheck:${rule}`);
    this.name = "V6PostcheckError";
  }
}

export function normalizeEvidence(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, "");
}

function fail(rule: string): never {
  throw new V6PostcheckError(rule);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLegacyPlacement(value: unknown) {
  if (value === "档内高位") return "档内较高位";
  if (value === "档内低位") return "档内较低位";
  return value;
}

/** 接受模型偶尔返回的 report/score 外层，以及旧版报告的 story/language 分组。 */
export function normalizeV6FinalCandidate(value: unknown, stage2: V6Stage2): unknown {
  if (!isRecord(value)) return value;
  if (isRecord(value.report)) return normalizeV6FinalCandidate(value.report, stage2);
  if (typeof value.total === "number") return value;
  if (!isRecord(value.score)) return value;

  const score = value.score;
  const story = isRecord(value.story) ? value.story : isRecord(score.story) ? score.story : undefined;
  const legacyTrajectory = story && isRecord(story.themeTrajectory) ? story.themeTrajectory : undefined;
  const language = isRecord(value.language) ? value.language : undefined;
  const rawIssues = Array.isArray(value.issues)
    ? value.issues
    : Array.isArray(score.issues)
      ? score.issues
      : language && Array.isArray(language.issues)
        ? language.issues
        : [];
  const rawJudgements = Array.isArray(score.contentJudgements) ? score.contentJudgements : [];

  return {
    ...score,
    languagePlacement: normalizeLegacyPlacement(score.languagePlacement),
    contentJudgements: rawJudgements.map(item => {
      if (!isRecord(item)) return item;
      return {
        ...item,
        evidence: Array.isArray(item.evidence) ? item.evidence.join(" / ") : item.evidence,
      };
    }),
    story: {
      theme: story?.theme ?? stage2.themeTrajectory.themeValue,
      themeTrajectory: {
        initialBelief: legacyTrajectory?.initialBelief ?? legacyTrajectory?.initial ?? stage2.themeTrajectory.initialBelief,
        development: legacyTrajectory?.development ?? stage2.themeTrajectory.development,
        cognitiveEndpoint: legacyTrajectory?.cognitiveEndpoint ?? legacyTrajectory?.endpoint ?? stage2.themeTrajectory.cognitiveEndpoint,
        themeSubject: legacyTrajectory?.themeSubject ?? stage2.themeTrajectory.themeSubject,
        themeObject: legacyTrajectory?.themeObject ?? stage2.themeTrajectory.themeObject,
        themeValue: legacyTrajectory?.themeValue ?? stage2.themeTrajectory.themeValue,
        continuationAlignment: legacyTrajectory?.continuationAlignment ?? "方向一致但较浅",
        explanation: legacyTrajectory?.explanation ?? "续写方向依据原文线索与人物认知终点进行判断。",
      },
    },
    issues: rawIssues.map(item => {
      if (!isRecord(item)) return item;
      return {
        original: item.original ?? item.sentence,
        problem: item.problem,
        explanation: item.explanation ?? item.reason,
        rewrite: item.rewrite,
      };
    }),
  };
}

function expectedPlacement(score: number) {
  return PLACEMENTS[5 - (score % 5 || 5)];
}

export function canonicalizeV6ScoreMetadata(report: V6FinalReport): V6FinalReport {
  const band = Math.ceil(report.total / 5);
  return {
    ...report,
    band,
    bandRange: RANGES[band],
    level: LEVELS[band],
    languagePlacement: expectedPlacement(report.total),
  };
}

function evidenceFragments(evidence: string) {
  return evidence.split(/\s+\/\s+/).map(part => part.trim()).filter(Boolean);
}

function normalizedSourceVariants(value: string) {
  const withoutChineseGloss = value
    .replace(/（[^）]*[\u3400-\u9fff][^）]*）/g, "")
    .replace(/\([^)]*[\u3400-\u9fff][^)]*\)/g, "");
  return [normalizeEvidence(value), normalizeEvidence(withoutChineseGloss)];
}

function reportSourceVariants(input: V6EvaluateInput) {
  return normalizedSourceVariants([
    input.sourceText,
    input.starter1,
    input.studentParagraph1,
    input.starter2,
    input.studentParagraph2,
  ].join("\n"));
}

function sourceContains(sources: string[], quote: string) {
  const normalized = normalizeEvidence(quote);
  return sources.some(source => source.includes(normalized));
}

export function recoverV6Report(
  report: V6FinalReport,
  input: V6EvaluateInput,
  error?: V6PostcheckError,
  stage3?: V6Stage3,
): V6FinalReport {
  const sources = reportSourceVariants(input);
  const locked = [normalizeEvidence(input.starter1), normalizeEvidence(input.starter2)];
  const rules = new Set(error?.rule.split(",") ?? []);
  const auditedJudgements = rules.has("fifth-band-stage3-gate") && stage3
    ? report.contentJudgements.map(judgement => {
        const audited = stage3.draftJudgements.find(item => item.key === judgement.key);
        return audited
          ? { ...judgement, status: audited.status, judgement: audited.judgement, evidence: audited.evidence }
          : judgement;
      })
    : report.contentJudgements;
  const contentJudgements = auditedJudgements.map(judgement => {
    const verified = evidenceFragments(judgement.evidence).filter(quote => sourceContains(sources, quote));
    return { ...judgement, evidence: verified.length ? verified.join(" / ") : UNVERIFIED_EVIDENCE };
  });
  const issues = report.issues.filter(issue => {
    const original = normalizeEvidence(issue.original);
    return !locked.some(starter => starter.includes(original));
  });
  const constraints = report.constraints.includes(VALIDATION_WARNING)
    ? report.constraints
    : [...report.constraints, VALIDATION_WARNING];
  let total = report.total;
  if (rules.has("fifth-band-fuse") || rules.has("fifth-band-stage3-gate")) {
    total = Math.min(total, 20);
  }
  if (rules.has("fourth-band-hard-count")) {
    total = Math.min(total, 15);
  }
  return canonicalizeV6ScoreMetadata({ ...report, total, contentJudgements, issues, constraints });
}

/** 第四阶段结构彻底不可用时，依据已完成的原文分析与逐项核对生成保守报告。 */
export function buildV6FallbackReport(
  input: V6EvaluateInput,
  stage2: V6Stage2,
  stage3: V6Stage3,
): V6FinalReport {
  const statuses = stage3.draftJudgements.map(item => item.status);
  const total = statuses.includes("失败/硬伤")
    ? 9
    : statuses.includes("明显问题")
      ? 14
      : statuses.includes("轻微瑕疵")
        ? 18
        : 20;
  const contentJudgements = stage3.draftJudgements.map(item => ({
    ...item,
    label: LABELS[item.key],
    suggestion: SUGGESTIONS[item.key],
  }));
  const report = canonicalizeV6ScoreMetadata({
    total,
    band: 1,
    bandRange: "1—5",
    level: "第一档",
    languagePlacement: "档内最低位",
    summary: "前三阶段已完成原文理解与续写核对；第四阶段结构异常，因此本报告按已有内容判断保守定位。",
    languageRationale: "第四阶段语言定位未能完整返回，当前档内位置为保守参考，不影响下方已完成的内容判断。",
    constraints: [STRUCTURAL_FALLBACK_WARNING],
    contentJudgements,
    story: {
      theme: stage2.themeTrajectory.themeValue,
      themeTrajectory: {
        initialBelief: stage2.themeTrajectory.initialBelief,
        development: stage2.themeTrajectory.development,
        cognitiveEndpoint: stage2.themeTrajectory.cognitiveEndpoint,
        themeSubject: stage2.themeTrajectory.themeSubject,
        themeObject: stage2.themeTrajectory.themeObject,
        themeValue: stage2.themeTrajectory.themeValue,
        continuationAlignment: "方向一致但较浅",
        explanation: "主题轨迹依据第二阶段锁定的原文认知方向生成。",
      },
    },
    issues: [],
  });
  return recoverV6Report(report, input);
}

export function assertV6SourceKeywords(stage2: V6Stage2, input: V6EvaluateInput) {
  const categories = new Set(stage2.sourceKeywords.map(item => item.category));
  if (SOURCE_KEYWORD_CATEGORIES.some(category => !categories.has(category))) fail("source-keyword-categories");

  const seen = new Set<string>();
  const source = normalizedSourceVariants(input.sourceText);
  const starter2 = normalizeEvidence(input.starter2);
  for (const item of stage2.sourceKeywords) {
    const quote = normalizeEvidence(item.quote);
    if (seen.has(quote)) fail("source-keyword-duplicate");
    seen.add(quote);
    if (item.category === "p2Prerequisite" && quote !== starter2) {
      fail("p2-prerequisite-starter2");
    }
    const haystack = item.category === "p2Prerequisite" ? [starter2] : source;
    if (!haystack.some(variant => variant.includes(quote))) {
      const diagnosticQuote = item.quote.replace(/\s+/g, " ").slice(0, 120);
      fail(`source-keyword-evidence:${item.category}:${diagnosticQuote}`);
    }
  }
}

export function assertV6Report(report: V6FinalReport, input: V6EvaluateInput, stage3?: V6Stage3) {
  if (report.languagePlacement !== expectedPlacement(report.total)) fail("score-placement");
  if (report.level !== LEVELS[report.band] || report.bandRange !== RANGES[report.band]) fail("band-range");
  if (Math.ceil(report.total / 5) !== report.band) fail("band-range");

  if (report.band === 5 && report.contentJudgements.some(item => HARD_STATUSES.has(item.status))) {
    fail("fifth-band-fuse");
  }
  if (
    report.band === 5
    && stage3
    && stage3.draftJudgements.some(item => item.status !== "表现充分")
  ) {
    fail("fifth-band-stage3-gate");
  }

  const contentViolations: string[] = [];
  const hardCount = report.contentJudgements.filter(item => HARD_STATUSES.has(item.status)).length;
  if (report.band === 4 && hardCount >= 3) contentViolations.push("fourth-band-hard-count");
  const theme = report.contentJudgements.find(item => item.key === "theme");
  if (
    report.story.themeTrajectory.continuationAlignment === "方向一致但较浅"
    && theme
    && HARD_STATUSES.has(theme.status)
  ) {
    contentViolations.push("theme-alignment-status");
  }
  const conflict = report.contentJudgements.find(item => item.key === "conflict");
  const plausibility = report.contentJudgements.find(item => item.key === "plausibility");
  if (
    stage3
    && conflict
    && plausibility
    && HARD_STATUSES.has(conflict.status)
    && HARD_STATUSES.has(plausibility.status)
    && !stage3.factChecks.some(item => item.status === "conflict")
  ) {
    const conflictEvidence = new Set(evidenceFragments(conflict.evidence).map(normalizeEvidence));
    const repeatsConflictEvidence = evidenceFragments(plausibility.evidence)
      .map(normalizeEvidence)
      .some(quote => conflictEvidence.has(quote));
    if (repeatsConflictEvidence) contentViolations.push("duplicate-conflict-plausibility");
  }
  if (contentViolations.length) fail(contentViolations.join(","));

  const keys = report.contentJudgements.map(item => item.key);
  if (keys.some((key, index) => key !== KEYS[index])) fail("content-keys");

  const haystack = reportSourceVariants(input);
  for (const judgement of report.contentJudgements) {
    for (const quote of evidenceFragments(judgement.evidence)) {
      if (!sourceContains(haystack, quote)) fail("evidence-source");
    }
  }

  const locked = [normalizeEvidence(input.starter1), normalizeEvidence(input.starter2)];
  for (const issue of report.issues) {
    const original = normalizeEvidence(issue.original);
    if (locked.some(starter => starter.includes(original))) fail("locked-starter");
  }
}
