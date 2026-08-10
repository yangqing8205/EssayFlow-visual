type Stage = 1 | 2 | 3 | 4;

const WRAPPERS: Record<Stage, string[]> = {
  1: ["stage1", "sourceFacts", "factsAnalysis", "result", "data"],
  2: ["stage2", "sourceDirection", "storyDirection", "result", "data"],
  3: ["stage3", "continuationAudit", "audit", "factAudit", "result", "data"],
  4: ["stage4", "finalReport", "report", "result", "data"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrap(value: unknown, wrappers: string[]) {
  let current = value;
  for (let depth = 0; depth < 3 && isRecord(current); depth += 1) {
    const key = wrappers.find(candidate => isRecord(current) && isRecord(current[candidate]));
    if (!key) break;
    current = current[key];
  }
  return current;
}

function normalizeEvidence(value: unknown) {
  return Array.isArray(value) ? value.join(" / ") : value;
}

export function normalizeV6StageCandidate(value: unknown, stage: Stage): unknown {
  const candidate = unwrap(value, WRAPPERS[stage]);
  if (!isRecord(candidate)) return candidate;

  if (stage === 3) {
    const factChecks = candidate.factChecks ?? candidate.fact_checks ?? candidate.checks;
    const rawJudgements = candidate.draftJudgements
      ?? candidate.draft_judgements
      ?? candidate.contentJudgements
      ?? candidate.judgements;
    return {
      ...candidate,
      factChecks,
      draftJudgements: Array.isArray(rawJudgements)
        ? rawJudgements.map(item => isRecord(item) ? { ...item, evidence: normalizeEvidence(item.evidence) } : item)
        : rawJudgements,
    };
  }

  return candidate;
}
