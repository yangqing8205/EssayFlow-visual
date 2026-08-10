import type { V6EvaluateInput, V6FinalReport, V6Stage2, V6Stage3 } from "@/lib/workflow/v6/types";

const LEVELS = ["", "第一档", "第二档", "第三档", "第四档", "第五档"] as const;
const RANGES = ["", "1—5", "6—10", "11—15", "16—20", "21—25"] as const;
const PLACEMENTS = ["档内最高位", "档内较高位", "档内中位", "档内较低位", "档内最低位"] as const;
const KEYS = ["conflict", "cohesion", "theme", "plausibility"] as const;
const HARD_STATUSES = new Set(["明显问题", "失败/硬伤"]);
const SOURCE_KEYWORD_CATEGORIES = ["catalyst", "emotion", "theme", "constraint", "p2Prerequisite"] as const;
const UNVERIFIED_EVIDENCE = "证据引用未通过逐字核验，请结合原文与续写复核。";
const VALIDATION_WARNING = "部分自动校验未通过，报告已保留供参考。请结合原文复核标记内容。";

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
): V6FinalReport {
  const sources = reportSourceVariants(input);
  const locked = [normalizeEvidence(input.starter1), normalizeEvidence(input.starter2)];
  const contentJudgements = report.contentJudgements.map(judgement => {
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
  const rules = new Set(error?.rule.split(",") ?? []);
  let total = report.total;
  if (rules.has("fifth-band-fuse") || rules.has("fifth-band-stage3-gate")) {
    total = Math.min(total, 20);
  }
  if (rules.has("fourth-band-hard-count")) {
    total = Math.min(total, 15);
  }
  return canonicalizeV6ScoreMetadata({ ...report, total, contentJudgements, issues, constraints });
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
