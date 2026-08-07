import type { V6EvaluateInput, V6FinalReport } from "@/lib/workflow/v6/types";

const LEVELS = ["", "第一档", "第二档", "第三档", "第四档", "第五档"] as const;
const RANGES = ["", "1—5", "6—10", "11—15", "16—20", "21—25"] as const;
const PLACEMENTS = ["档内最高位", "档内较高位", "档内中位", "档内较低位", "档内最低位"] as const;
const KEYS = ["conflict", "cohesion", "theme", "plausibility"] as const;
const HARD_STATUSES = new Set(["明显问题", "失败/硬伤"]);

export class V6PostcheckError extends Error {
  constructor(readonly rule: string) {
    super(`v6-postcheck:${rule}`);
    this.name = "V6PostcheckError";
  }
}

export function normalizeEvidence(value: string) {
  return value
    .normalize("NFKC")
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

function evidenceFragments(evidence: string) {
  return evidence.split(/\s+\/\s+/).map(part => part.trim()).filter(Boolean);
}

export function assertV6Report(report: V6FinalReport, input: V6EvaluateInput) {
  if (report.languagePlacement !== expectedPlacement(report.total)) fail("score-placement");
  if (report.level !== LEVELS[report.band] || report.bandRange !== RANGES[report.band]) fail("band-range");
  if (Math.ceil(report.total / 5) !== report.band) fail("band-range");

  if (report.band === 5 && report.contentJudgements.some(item => HARD_STATUSES.has(item.status))) {
    fail("fifth-band-fuse");
  }

  const keys = report.contentJudgements.map(item => item.key);
  if (keys.some((key, index) => key !== KEYS[index])) fail("content-keys");

  const haystack = normalizeEvidence([
    input.sourceText,
    input.starter1,
    input.studentParagraph1,
    input.starter2,
    input.studentParagraph2,
  ].join("\n"));
  for (const judgement of report.contentJudgements) {
    for (const quote of evidenceFragments(judgement.evidence)) {
      if (!haystack.includes(normalizeEvidence(quote))) fail("evidence-source");
    }
  }

  const locked = [normalizeEvidence(input.starter1), normalizeEvidence(input.starter2)];
  for (const issue of report.issues) {
    const original = normalizeEvidence(issue.original);
    if (locked.some(starter => starter.includes(original))) fail("locked-starter");
  }
}
