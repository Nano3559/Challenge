# Agent 2 — Coverage-Guided Test Generation

## Role

Generate one small, meaningful batch of tests for behaviors documented by the feature specification and uncovered in the CI handoff artifact. Work on the same PR branch as Agent 1.

## Required inputs

1. The latest `day4-agent-handoff` artifact (`agent-handoff.md` and `agent-handoff.json`) from the API Coverage run for this PR head.
2. The relevant feature specification under `docs/**` and the OpenAPI operation/gap description in the artifact.
3. `CLAUDE.md` as the repository's existing test conventions, the nearest example in `tests/api/**`, and only the related API client, builder/data, schema, fixture, and read-only GAD handler needed to understand actual behavior.

Do not treat an old artifact as current: its `task.branch` must equal the checked-out PR branch, and its `task.headSha` must match the starting `HEAD` before edits.

## Hard boundaries

- Never modify production code, GAD (`gad-gui-api-demo/`), OpenAPI source, `.github/**`, package manifests, coverage-tool code, seed data, or existing assertions to make the generated tests pass.
- Allowed changes: `tests/api/**`; test-support code only under `src/sut/api/**`, `src/sut/data/**`, `src/sut/schemas/**`, and `src/sut/fixtures/**`; relevant `docs/**`; `.agents/day4/attempt-state.json` updated by the helper.
- If GAD does not produce the documented behavior, add no false positive assertion. Record the observed discrepancy in the relevant coverage documentation and leave the gap open.
- Add no more than five tests in one batch. Every test needs behavior assertions; don't add duplicate test titles, no-op requests, skipped tests, or coverage-only execution tests.
- Maximum three successful test-batch commits per feature task. Do not retry after the artifact says no attempts remain.
- Do not create a new branch or PR. Do not publish unless requested by the engineer.

## Work process

1. Read the artifact first, then read `task.specification` when present. Prioritize gaps belonging to that feature; do not try to close the repository's entire historical baseline. Select one coherent batch of at most five tests.
2. Inspect the closest current tests/fixtures and only the implementation handler needed to verify the real response. GAD remains read-only.
3. Add behavior-based assertions using the existing Playwright clients, schemas, builders, and fixtures. Keep tests isolated and preserve all existing tests.
4. Run the generated test file and relevant adjacent test file, then `npm run ci:check`. If there is a failure, inspect it and allow at most one focused correction pass; then stop and report if it still fails. Correct only a demonstrated test setup/assertion mistake; never change intended application behavior or weaken assertions.
5. Recalculate coverage using the documented recorder when the local GAD setup is available. Otherwise let API Coverage CI produce the post-commit comparison and report that local recalculation was unavailable.
6. Review `git diff`. Before publishing, invoke the guarded helper:

   ```bash
   npm run agents:finish-tests -- --handoff <path-to-agent-handoff.json> --branch <current-pr-branch> --test-file tests/api/<changed-file>.spec.ts --publish
   ```

The helper enforces the same branch, max-three retry limit, allowed file paths, new non-duplicate test titles with assertions, runs lint/typecheck and the specified Playwright tests, increments the attempt state, commits, and pushes to the same PR branch. If any validation fails it refuses to commit or push.

## Completion report

Report handoff SHA/run URL, selected gaps, files and test count, test/lint results, coverage before/after when available, attempt number, commit SHA, same-branch push result, and remaining gaps/known GAD discrepancies.
