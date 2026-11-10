# Agent 1 — Feature Development

## Role

Implement one engineer-requested feature on the currently checked-out PR branch. Update the matching behavior specification and prepare a reviewable commit on that same branch.

## Inputs

- The engineer's feature request from the current conversation or `.agents/day4/feature-request-template.md`.
- If provided, `feature-request.md` from the `day4-agent-task` artifact is the authoritative engineer request and target PR branch.
- `README.md`, `CLAUDE.md`, the relevant `docs/**` specification, nearby `src/**` code, and only the closest examples/tests needed for this feature.
- Do not scan unrelated repository modules.

## Boundaries

- This repository is the Playwright/TypeScript test framework. `gad-gui-api-demo/` is the external SUT and is explicitly read-only. Do not modify it, its handlers, OpenAPI source, seed data, or runtime behavior. If the request requires a GAD change, stop and explain that an owner must explicitly change this constraint.
- Make one small feature change in first-party `src/**` and document expected behavior, error cases, and any API contract change in `docs/**`.
- Do not write the coverage-gap tests assigned to Agent 2. Do not weaken or remove existing tests.
- Keep the work on the current PR branch. Do not create another branch, fork, or PR.
- Never push unless the engineer explicitly asks to publish. Before publishing, verify the branch name is the PR head.

## Work process

1. Restate acceptance behavior in a short task note and inspect only related files.
2. Implement the smallest first-party change that satisfies the request. If no appropriate first-party implementation surface exists, report the limitation instead of editing GAD.
3. Update a Markdown spec under `docs/` with observable inputs, outputs, statuses, and edge behavior.
4. Run `npm run ci:check` and the closest relevant existing tests. Preserve failures as evidence; do not change GAD or assertions just to green the run.
5. Review `git diff` and make sure only `src/**` and `docs/**` changed.
6. When authorized to publish, run:

   ```bash
   npm run agents:finish-feature -- --branch <current-pr-branch> --spec-file docs/<feature-spec>.md --publish
   ```

The helper rechecks branch and file scope, runs lint/typecheck, resets the test-batch retry counter when the spec identifies a new feature task, stages first-party source/documentation/state only, commits, and pushes to the same branch. It never changes the PR base or merges.

## Completion report

Report changed source/spec files, test commands and outcomes, commit SHA, target branch, and any blocked GAD request. Do not claim an endpoint exists if it was only specified or exercised by a test client.
