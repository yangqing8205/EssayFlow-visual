# V6 Pipeline Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every structurally recoverable evaluation produces a grounded report whose numeric score is consistent with its content band and language placement.

**Architecture:** Keep the authoritative V6 rubric and four-stage evidence isolation. Add stage-specific candidate normalization before schema validation, make the server derive the numeric score from the model's content-band decision and language placement, and use a compact recovery path when an intermediate stage remains malformed. Internal diagnostics stay server-side.

**Tech Stack:** Next.js, TypeScript, Zod, Vitest, OpenAI-compatible DeepSeek API, Vercel.

---

### Task 1: Normalize every stage response

**Files:**
- Modify: `lib/workflow/v6/run.ts`
- Create: `lib/workflow/v6/normalize.ts`
- Test: `tests/v6-pipeline.test.ts`

- [ ] Add failing tests for `result`, `stage1`, `sourceDirection`, `continuationAudit`, `audit`, `report`, and `score` wrappers.
- [ ] Verify the tests fail with schema errors.
- [ ] Implement stage-specific unwrapping and legacy field aliases before Zod parsing.
- [ ] Verify wrapped responses pass without an unnecessary repair call.

### Task 2: Derive score metadata in code

**Files:**
- Modify: `lib/workflow/v6/types.ts`
- Modify: `lib/prompts/v6/stage4.ts`
- Modify: `lib/scoring/postcheck.ts`
- Test: `tests/v6-postcheck.test.ts`
- Test: `tests/v6-pipeline.test.ts`

- [ ] Add failing tests proving `contentBand: 4` plus `档内中位` always becomes 18 and cannot remain 22.
- [ ] Add a Stage 4 decision schema that requests content band and language placement rather than trusting a free numeric total.
- [ ] Implement deterministic `band + placement -> total` mapping.
- [ ] Preserve the general fifth-band admission gate and merge locked Stage 3 non-sufficient judgements into the final report.

### Task 3: Recover malformed Stage 3 without inventing evidence

**Files:**
- Modify: `lib/prompts/v6/stage3.ts`
- Modify: `lib/workflow/v6/run.ts`
- Test: `tests/v6-pipeline.test.ts`

- [ ] Add a failing test where Stage 3 remains malformed after its normal repair.
- [ ] Add a compact Stage 3 recovery request using the same source facts, source direction, student continuation, and exact Stage 3 schema.
- [ ] If recovery still fails, continue through a conservative final-report path and mark the report as recovered; do not fabricate quoted evidence.

### Task 4: Keep diagnostics out of the student UI

**Files:**
- Modify: `app/api/v6/evaluate/route.ts`
- Modify: `public/essayflow-evaluate.html`
- Test: `tests/api-v6-evaluate.test.ts`

- [ ] Add a failing API test proving schema paths such as `factChecks` and `undefined` are not sent to the browser.
- [ ] Return a stable recovery/status message while retaining detailed diagnostics in server logs.
- [ ] Verify the report renders normally after a recovered pipeline.

### Task 5: Verify and deploy

**Files:**
- Verify all modified files.

- [ ] Run `npm test` and require all tests to pass.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Push the verified commit to `origin/main`.
- [ ] Deploy to the existing `essayflow-scoring-service` Vercel production project and verify `Ready` status.
