# AI-assisted test generation status

The former `ai-test-generation.yml` workflow invoked Claude and required Anthropic credentials. It was removed at the user's request. The replacement local Codex roles, CI handoff artifact, retry guard, and same-PR-branch validation process are documented in [Day 4 Multi-Agent Pipeline](DAY-4-MULTI-AGENT.md).

The API Coverage workflow compares OpenAPI and c8/V8 coverage, publishes an HTML artifact, and updates the PR comment. It also publishes `day4-agent-handoff`, which a local Agent 2 session can consume without a Claude API key. GitHub Actions packages artifacts but does not call a model provider.
