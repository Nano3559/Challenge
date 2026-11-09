# AI-assisted test generation

## Trigger and limits

Run **AI Test Generation** from GitHub Actions → Run workflow. Enter one module or OpenAPI tag and the target base branch. This opt-in workflow generates one batch of at most five tests, allows at most eight agent turns, executes the new tests and the closest existing tests, runs `npm run ci:check`, records coverage, and opens a pull request only when there is a meaningful change. It never merges the pull request.

The agent reads:

- `README.md` and `CLAUDE.md` for project architecture and coding conventions.
- `.claude/skills/add-api-test/SKILL.md` for the repository's API-test process.
- The relevant OpenAPI operation and `coverage-gaps.json` for current gaps.
- The nearest existing API tests, clients, data builders, schemas, fixtures, and read-only GAD handler needed to understand actual behavior.

Tests must follow the current Playwright + TypeScript architecture, validate behavior, use existing fixtures/builders, and preserve GAD as read-only. The agent gets one focused correction pass after a failed test run. It must not weaken assertions, skip failures, or edit production code to make a test pass. If the API cannot produce an OpenAPI response, the test and PR must describe the observed discrepancy instead of claiming the gap was closed.

## Required external configuration

The repository did not contain an AI provider credential or endpoint. Add one of these GitHub Actions repository secrets before running the workflow:

- `ANTHROPIC_API_KEY`, or
- `CLAUDE_CODE_OAUTH_TOKEN`.

The workflow uses the official `anthropics/claude-code-action@v1`, selected because this repo already has Claude-specific conventions and agents. It invokes the action only from a manual workflow dispatch; it does not send every PR's source to an AI provider automatically. Keys are passed via GitHub Secrets and are never committed. The provider setup is documented by [Anthropic's Claude Code Action setup guide](https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md).

The workflow token has `contents: write`, `pull-requests: write`, and `issues: write` only for the manual agent job that pushes its branch and opens/updates the generated PR. Coverage comparison has `contents: read`; the separate PR-comment workflow has only artifact read and issue-comment permissions.

## Pull request contents

The workflow requires the agent to commit `AI_TEST_GENERATION_SUMMARY.md` on its generated branch. The summary includes the module, test count, initial/final contract coverage and delta, execution results, and remaining gaps. The workflow uses it as the PR body and links the Actions run. If no provider secret is available, the workflow stops with a specific message before invoking the agent.

## Coverage scope

The PR comparison covers both the repository's OpenAPI contract metrics and c8/V8 code metrics for Node JavaScript loaded during API tests. Browser-only frontend scripts are not instrumented in this workflow. Missing branch/ref coverage files remain unavailable; they are not presented as 0%. The HTML report includes normalized file coverage, new covered/uncovered lines, uncovered functions and branches, and file regressions.
