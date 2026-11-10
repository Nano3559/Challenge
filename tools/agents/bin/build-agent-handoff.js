'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith('--') || !args[index + 1] || args[index + 1].startsWith('--')) {
      throw new Error(`Expected a value after ${key}.`);
    }
    options[key.slice(2)] = args[index + 1];
    index += 1;
  }
  for (const key of ['comparison', 'api-gaps', 'out', 'branch', 'base-ref', 'head-sha', 'run-url']) {
    if (!options[key]) throw new Error(`Missing required option --${key}.`);
  }
  return options;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Invalid JSON in ${file}: ${error.message}`, { cause: error });
  }
}

function buildHandoff({ comparison, apiGaps, source }) {
  const gaps = Array.isArray(apiGaps?.gaps) ? apiGaps.gaps : [];
  const codeFiles = comparison?.codeCoverage?.files || [];
  const codeGapFiles = codeFiles.filter((file) => file.uncoveredFunctions?.length
    || file.uncoveredBranches?.length || file.newlyUncoveredLines?.length
    || (file.head?.lines?.total > file.head?.lines?.covered));
  const code = comparison?.codeCoverage;
  const api = comparison?.apiCoverage;
  const state = readJson(path.resolve('.agents/day4/attempt-state.json')) || {};
  const maxRetries = Math.min(3, Math.max(1, Number(state.maxRetries) || 3));
  const currentAttempt = Math.max(0, Number(state.completedAttempts) || 0);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    task: {
      id: state.taskId || `${source.branch}@${source.headSha}`,
      specification: typeof state.taskId === 'string' && state.taskId.startsWith('docs/') ? state.taskId : null,
      branch: source.branch,
      baseRef: source.baseRef,
      headSha: source.headSha,
      runUrl: source.runUrl,
      maxRetries,
      completedAttempts: currentAttempt,
      remainingAttempts: Math.max(0, maxRetries - currentAttempt),
    },
    measurement: {
      status: comparison?.measurement?.status || 'unavailable',
      baseTests: comparison?.measurement?.baseRun || 'unknown',
      prTests: comparison?.measurement?.headRun || 'unknown',
    },
    coverage: {
      api: {
        available: Boolean(api?.available),
        base: api?.base?.global ?? null,
        pr: api?.head?.global ?? null,
        delta: api?.delta ?? null,
      },
      code: {
        available: Boolean(code?.available),
        base: code?.base || null,
        pr: code?.head || null,
        delta: code?.delta || null,
      },
      apiGapsAvailable: Array.isArray(apiGaps?.gaps),
      codeGapsAvailable: Array.isArray(code?.files),
    },
    gaps: {
      apiAvailable: Array.isArray(apiGaps?.gaps),
      codeAvailable: Array.isArray(code?.files),
      uncoveredEndpoints: gaps.filter((gap) => gap.category === 'uncovered_endpoint'),
      untestedMethods: gaps.filter((gap) => gap.category === 'untested_method'),
      uncoveredFunctions: codeGapFiles.flatMap((file) => (file.uncoveredFunctions || []).map((name) => ({ file: file.path, name }))),
      uncoveredBranches: codeGapFiles.flatMap((file) => (file.uncoveredBranches || []).map((branch) => ({ file: file.path, ...branch }))),
      newlyUncoveredLines: (code?.newlyUncoveredLines || []).map((line) => ({ ...line })),
      missingTestScenarios: gaps.map((gap) => ({
        id: gap.id,
        category: gap.category,
        endpoint: gap.endpoint,
        methods: gap.methods || (gap.method && gap.method !== '*' ? [gap.method] : []),
        severity: gap.severity,
        expectedBehavior: gap.description,
        parameter: gap.parameter || null,
        statusCode: gap.statusCode || null,
      })),
      sourceFiles: codeGapFiles.map((file) => ({
        path: file.path,
        lineCoverage: file.head?.lines || null,
        uncoveredFunctions: file.uncoveredFunctions || [],
        uncoveredBranches: file.uncoveredBranches || [],
        newlyUncoveredLines: file.newlyUncoveredLines || [],
      })),
      introducedApiGaps: (api?.introducedGaps || []).map((id) => ({ id })),
      topCoverageGaps: [...gaps.slice(0, 5), ...codeGapFiles.slice(0, 5).map((file) => ({
        category: 'uncovered_code',
        endpoint: file.path,
        method: null,
        description: `${file.uncoveredFunctions?.length || 0} uncovered functions, ${file.uncoveredBranches?.length || 0} uncovered branches, ${file.newlyUncoveredLines?.length || 0} newly uncovered lines.`,
      }))],
    },
    policy: {
      testAgentMayModify: ['tests/api/**/*.spec.ts', 'src/sut/api/**', 'src/sut/data/**', 'src/sut/schemas/**', 'src/sut/fixtures/**', 'docs/**', '.agents/day4/attempt-state.json'],
      testSupportMayModify: ['src/sut/api/**', 'src/sut/data/**', 'src/sut/schemas/**', 'src/sut/fixtures/**'],
      forbidden: ['gad-gui-api-demo/**', 'src/core/**', 'tools/**', '.github/**', 'package.json', 'package-lock.json'],
      requireBehaviorAssertions: true,
      requireNoDuplicateTestTitles: true,
      requireTestsAndCiCheckBeforePush: true,
    },
  };
}

function renderMarkdown(handoff) {
  const { task, measurement, coverage, gaps } = handoff;
  const lines = [
    '# Day 4 Agent Handoff', '',
    `- Branch: \`${task.branch}\` (base: \`${task.baseRef}\`)`,
    `- Head: \`${task.headSha}\``,
    ...(task.specification ? [`- Feature specification: \`${task.specification}\``] : []),
    `- Coverage run: ${task.runUrl}`,
    `- Test status: base **${measurement.baseTests}**, PR **${measurement.prTests}**`,
    `- Attempts: ${task.completedAttempts}/${task.maxRetries} completed; ${task.remainingAttempts} remaining`, '',
    '## Coverage delta', '',
    '| Metric | Base | PR | Delta |', '|---|---:|---:|---:|',
    `| OpenAPI overall | ${formatPct(coverage.api.base)} | ${formatPct(coverage.api.pr)} | ${formatDelta(coverage.api.delta)} |`,
  ];
  for (const metric of ['lines', 'branches', 'functions', 'statements']) {
    lines.push(`| ${metric} | ${formatPct(coverage.code.base?.[metric]?.pct)} | ${formatPct(coverage.code.pr?.[metric]?.pct)} | ${formatDelta(coverage.code.delta?.[metric])} |`);
  }
  lines.push('', '## Highest priority documented gaps', '');
  if (!gaps.apiAvailable) lines.push('- OpenAPI gap data is unavailable; do not infer that no gaps exist.');
  else if (!gaps.missingTestScenarios.length) lines.push('- No uncovered OpenAPI scenarios were reported.');
  for (const gap of gaps.missingTestScenarios.slice(0, 20)) {
    const method = gap.methods.length ? gap.methods.join(', ') : 'method in spec';
    lines.push(`- [${gap.severity || 'unranked'}] ${method} \`${gap.endpoint}\`: ${gap.expectedBehavior}`);
  }
  lines.push('', '## Code gaps', '');
  if (!gaps.codeAvailable) lines.push('- c8 file gap data is unavailable.');
  for (const file of gaps.sourceFiles.slice(0, 20)) {
    lines.push(`- \`${file.path}\`: ${file.uncoveredFunctions.length} functions, ${file.uncoveredBranches.length} branches, ${file.newlyUncoveredLines.length} newly uncovered lines`);
  }
  lines.push('', 'Use the Agent 2 role prompt. Do not edit production code or GAD. Validate the batch before pushing.', '');
  return lines.join('\n');
}

function formatPct(value) { return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : 'Unavailable'; }
function formatDelta(value) { return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)} pp` : 'Unavailable'; }

function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const comparison = readJson(path.resolve(options.comparison));
  if (!comparison) throw new Error(`Coverage comparison not found: ${options.comparison}`);
  const apiGaps = readJson(path.resolve(options['api-gaps']));
  const handoff = buildHandoff({
    comparison,
    apiGaps,
    source: {
      branch: options.branch,
      baseRef: options['base-ref'],
      headSha: options['head-sha'],
      runUrl: options['run-url'],
    },
  });
  const output = path.resolve(options.out);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'agent-handoff.json'), `${JSON.stringify(handoff, null, 2)}\n`);
  fs.writeFileSync(path.join(output, 'agent-handoff.md'), `${renderMarkdown(handoff)}\n`);
  console.log(`Day 4 handoff written to ${output}; ${handoff.gaps.missingTestScenarios.length} OpenAPI scenarios, ${handoff.gaps.sourceFiles.length} code files, ${handoff.task.remainingAttempts} attempts remaining.`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(`[day4-handoff] ${error.message}`); process.exitCode = 1; }
}

module.exports = { buildHandoff, formatDelta, formatPct, main, parseArgs, renderMarkdown };
