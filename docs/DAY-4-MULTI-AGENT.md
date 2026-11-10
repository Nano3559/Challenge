# Day 4 — multi-agent feature and test workflow

## Architecture

The project is a Playwright + TypeScript API/UI test framework. Its target application, `gad-gui-api-demo`, is an external SUT; the standing project decision is that GAD is read-only. GitHub Actions runs `API Coverage`, compares base and PR OpenAPI/c8 metrics, posts a PR summary, and now uploads `day4-agent-handoff` with the coverage report and actionable gaps.

Two local Codex sessions use separate role prompts:

1. **Feature Development Agent** reads the engineer request and relevant repository files, updates first-party framework code and a Markdown behavior specification, validates it, and commits/pushes to the existing PR branch.
2. **Test Generation Agent** reads the latest CI handoff, the relevant feature specification, test conventions, nearby examples, and read-only GAD behavior. It generates a small test batch, validates the change scope and duplicate titles, runs the tests and `ci:check`, records the bounded attempt, and commits/pushes to the same PR branch.

The CI artifact is the handoff between roles. The engineer starts each local Codex role from the artifact produced by the previous phase. A push to the PR branch triggers the existing CI validation again. GitHub Actions does not invoke an LLM and this pipeline requires no Claude or model API key.

## Repository-specific limits

This repository contains the test framework, clients, fixtures, and documentation; it does not own the GAD API server. Agent 1 may implement first-party changes under `src/` and specify expected behavior under `docs/`. If a feature request requires a new endpoint inside GAD, Agent 1 must stop and request an explicit change to the read-only GAD decision. The generic endpoint acceptance scenario cannot be demonstrated against GAD while that constraint remains.

The test agent can edit `tests/api/**`, test support under `src/sut/api/**`, `src/sut/data/**`, `src/sut/schemas/**`, and `src/sut/fixtures/**`, relevant `docs/**`, plus `.agents/day4/attempt-state.json`. It cannot edit production/application code, GAD, coverage tools, package manifests, or CI configuration. A batch contains at most five tests. The retry state caps successful batches at three per active PR task.

## Run the workflow

### Start Agent 1

1. In GitHub Actions, run **Day 4 Agent Handoff** with `agent=feature-development`, the existing PR head branch, and the engineer's feature request.
2. Download the `day4-agent-task` artifact and open a Codex session using `.agents/day4/feature-development.md`.
3. Have the agent implement only first-party behavior, update the relevant spec in `docs/`, and run the helper after review:

   ```bash
   npm run agents:finish-feature -- --branch <pr-head-branch> --spec-file docs/<feature>.md --publish
   ```

   Add `--test-file <path>` for any existing/feature smoke tests the feature agent is responsible for running. The helper refuses to publish changes outside `src/` and `docs/`, and resets the test-batch retry counter when beginning a new specification task.

### Start Agent 2

1. Wait for the feature push's **API Coverage** workflow to finish. It creates a `day4-agent-handoff` artifact on the run, including `agent-handoff.json` and `agent-handoff.md`.
2. Run **Day 4 Agent Handoff** with `agent=test-generation`, the same PR head branch, and the API Coverage run ID. Download the resulting `day4-agent-task` artifact.
3. Start a separate Codex session with `.agents/day4/test-generation.md`. The role reads the handoff first and selects one logical batch of no more than five tests.
4. After editing, validate and publish to the same branch:

   ```bash
   npm run agents:finish-tests -- \
     --handoff <path-to-agent-handoff.json> \
     --branch <same-pr-head-branch> \
     --test-file tests/api/<changed-file>.spec.ts \
     --publish
   ```

   Add one `--test-file` for each generated or relevant existing API test. The guard checks the artifact SHA and branch, retry budget, allowed paths, newly added non-duplicate test names, and assertions. It runs `npm run ci:check` and the specified Playwright tests before incrementing state, committing, and pushing. Without `--publish`, it validates but does not commit or push.

5. The push triggers API Coverage again. The next handoff shows the new comparison and updated remaining-attempt count. Stop when the relevant gaps are covered or no attempts remain.

## CI artifact content

`day4-agent-handoff/agent-handoff.json` is versioned and contains:

- PR branch, base ref, head SHA, Actions run URL, and max/remaining retries.
- Base/PR test status and line, branch, function, statement, and OpenAPI deltas.
- Uncovered OpenAPI endpoints and structured missing scenarios (method, category, severity, behavior description, parameter/status when present).
- Uncovered functions, branches, newly uncovered lines, and relevant c8 source files.
- Scope policy for Agent 2. Missing measurements remain `null`/unavailable; they are not converted to 0%.

The adjacent Markdown file is a concise task brief for the local session. The standard per-ref and HTML artifacts remain available in the same API Coverage run.

Example:

```json
{
  "schemaVersion": 1,
  "task": { "id": "feature/items@abc123", "branch": "feature/items", "baseRef": "main", "headSha": "abc123", "maxRetries": 3, "completedAttempts": 0, "remainingAttempts": 3 },
  "coverage": { "api": { "available": true, "base": 90, "pr": 90, "delta": 0 }, "code": { "available": true, "delta": { "lines": 0, "branches": 0 } } },
  "gaps": { "uncoveredEndpoints": [{ "endpoint": "/api/items", "methods": ["GET"] }], "uncoveredFunctions": [], "uncoveredBranches": [], "missingTestScenarios": [{ "endpoint": "/api/items", "methods": ["GET"], "expectedBehavior": "Returns active items." }], "sourceFiles": [] }
}
```

## Logs and validation

Agent role prompts require a concise completion report with artifact/run SHA, files, tests, coverage before/after, attempt, commit SHA, and remaining gaps. The helper prints each executed command and fails closed on an invalid scope, branch, stale artifact, duplicate/no-assertion test batch, failed test, or exceeded retry limit.

Run the helper tests with `npm run test:coverage:unit`; they run alongside the existing coverage tooling tests. `npm run ci:check` runs lint and TypeScript checks.

## Scope not automated inside GitHub Actions

Without a model credential or an authorized remote agent runner, GitHub Actions cannot autonomously reason about feature code or write tests. The local Codex sessions provide the agent reasoning; Actions provides the reproducible CI evidence and artifact handoff. This is deliberate: no API key is stored in GitHub, no model API is called, and commits are pushed only from the local session after validation.
