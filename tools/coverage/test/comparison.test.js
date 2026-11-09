'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildComparison } = require('../lib/comparison');
const { buildHtml, buildSummaryMarkdown } = require('../lib/comparison-report');
const cliPath = path.resolve(__dirname, '../bin/compare-coverage.js');

const apiReport = (percentage, notFoundCovered) => ({
  summary: {
    global: { percentage },
    endpoints: { total: 1, covered: 1, uncovered: 0 },
    operations: { total: 1, covered: 1, uncovered: 0 },
    statusCodes: { total: 2, covered: notFoundCovered ? 2 : 1, uncovered: notFoundCovered ? 0 : 1, percentage: notFoundCovered ? 100 : 50 },
    parameters: { total: 0, covered: 0, uncovered: 0, percentage: 100 },
  },
  endpoints: [{ path: '/api/items', operations: [{ covered: true, statusCodes: [{ code: '200', covered: true }, { code: '404', covered: notFoundCovered }], parameters: [] }] }],
});

const codeSummary = (pct, lineTotal, lineCovered) => ({ total: Object.fromEntries([
  ['lines', { total: lineTotal, covered: lineCovered, pct }],
  ['branches', { total: 4, covered: Math.round(4 * pct / 100), pct }],
  ['functions', { total: 2, covered: Math.round(2 * pct / 100), pct }],
  ['statements', { total: lineTotal, covered: lineCovered, pct }],
]) });

const lcovBase = [
  'SF:src/handler.js', 'FN:1,run', 'FNDA:1,run', 'FNF:1', 'FNH:1',
  'DA:1,1', 'DA:2,0', 'DA:3,1', 'DA:4,1', 'LF:4', 'LH:3',
  'BRDA:1,0,0,1', 'BRDA:1,0,1,0', 'end_of_record', '',
].join('\n');
const lcovHead = [
  'SF:src/handler.js', 'FN:1,run', 'FNDA:0,run', 'FNF:1', 'FNH:0',
  'DA:1,1', 'DA:2,1', 'DA:3,0', 'DA:4,0', 'LF:4', 'LH:2',
  'BRDA:1,0,0,0', 'BRDA:1,0,1,0', 'end_of_record', '',
].join('\n');

test('compara coverage OpenAPI/código, deltas, líneas y gaps', () => {
  const result = buildComparison({
    base: { report: apiReport(80, false), codeSummary: codeSummary(50, 4, 2) },
    head: { report: apiReport(90, true), codeSummary: codeSummary(75, 4, 3) },
    baseGaps: { gaps: [{ id: 'GET|/items|404' }] },
    headGaps: { gaps: [] },
    baseLcov: lcovBase, headLcov: lcovHead,
    runStatus: { base: 'passed', head: 'passed' },
  });

  assert.equal(result.measurement.status, 'available');
  assert.equal(result.apiCoverage.delta, 10);
  assert.deepEqual(result.apiCoverage.resolvedGaps, ['GET|/items|404']);
  assert.equal(result.codeCoverage.delta.lines, 25);
  assert.deepEqual(result.codeCoverage.newlyCoveredLines, [{ file: 'src/handler.js', line: 2 }]);
  assert.deepEqual(result.codeCoverage.newlyUncoveredLines, [{ file: 'src/handler.js', line: 3 }, { file: 'src/handler.js', line: 4 }]);
  assert.equal(result.codeCoverage.regressions[0].path, 'src/handler.js');
  assert.deepEqual(result.codeCoverage.files[0].uncoveredFunctions, ['run']);
  assert.deepEqual(result.codeCoverage.files[0].uncoveredBranches.map(({ id, line }) => ({ id, line })), [
    { id: '1:0:0', line: 1 }, { id: '1:0:1', line: 1 },
  ]);
  assert.equal(result.codeCoverage.delta.branches, 25);
  assert.equal(result.codeCoverage.delta.functions, 25);
  const html = buildHtml(result);
  assert.match(html, /Coverage comparison/);
  assert.match(buildSummaryMarkdown(result), /\+25\.00 pp/);
});

test('representa datos faltantes como no disponibles, nunca como cero', () => {
  const result = buildComparison({ base: null, head: { report: apiReport(80, false) } });
  assert.equal(result.apiCoverage.available, false);
  assert.equal(result.codeCoverage.available, false);
  assert.equal(result.codeCoverage.head.lines, null);
  assert.match(buildSummaryMarkdown(result), /unavailable/i);
  assert.match(buildHtml(result), /Not available/);
});

test('trata archivos agregados y eliminados sin reportar líneas eliminadas como regresiones', () => {
  const base = [
    'SF:src/removed.js', 'DA:1,1', 'DA:2,1', 'end_of_record',
    'SF:src/kept.js', 'DA:1,0', 'end_of_record', '',
  ].join('\n');
  const head = [
    'SF:src/added.js', 'DA:1,1', 'DA:2,1', 'end_of_record',
    'SF:src/kept.js', 'DA:1,1', 'end_of_record', '',
  ].join('\n');
  const result = buildComparison({ baseLcov: base, headLcov: head });
  const byPath = new Map(result.codeCoverage.files.map((file) => [file.path, file]));

  assert.equal(byPath.get('src/added.js').base, null);
  assert.equal(byPath.get('src/added.js').head.lines.pct, 100);
  assert.equal(byPath.get('src/removed.js').head, null);
  assert.deepEqual(byPath.get('src/removed.js').newlyUncoveredLines, []);
  assert.deepEqual(result.codeCoverage.newlyCoveredLines, [
    { file: 'src/added.js', line: 1 },
    { file: 'src/added.js', line: 2 },
    { file: 'src/kept.js', line: 1 },
  ]);
  assert.deepEqual(result.codeCoverage.newlyUncoveredLines, []);
  assert.deepEqual(result.codeCoverage.regressions, []);
});

test('CLI genera JSON, resumen y HTML comparables con entradas sintéticas completas', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-compare-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const baseDir = path.join(root, 'base');
  const headDir = path.join(root, 'head');
  const outDir = path.join(root, 'out');
  fs.mkdirSync(baseDir);
  fs.mkdirSync(headDir);

  const writeInput = (directory, percentage, missingStatus, status) => {
    fs.writeFileSync(path.join(directory, 'run-status.json'), JSON.stringify({ status }));
    fs.writeFileSync(path.join(directory, 'coverage-report.json'), JSON.stringify(apiReport(percentage, !missingStatus)));
    fs.writeFileSync(path.join(directory, 'coverage-gaps.json'), JSON.stringify({
      summary: { critical: 0 },
      gaps: missingStatus ? [{ id: 'GET|/api/items|404', method: 'GET', endpoint: '/api/items', description: '404 response' }] : [],
    }));
    fs.writeFileSync(path.join(directory, 'coverage-summary.json'), JSON.stringify(codeSummary(percentage, 4, Math.round(4 * percentage / 100))));
    fs.writeFileSync(path.join(directory, 'lcov.info'), missingStatus ? lcovBase : lcovHead);
  };
  writeInput(baseDir, 50, true, 'passed');
  writeInput(headDir, 75, false, 'passed');

  const result = spawnSync(process.execPath, [
    cliPath, '--base', baseDir, '--head', headDir, '--out', outDir,
    '--artifact-url', 'https://github.com/example/project/actions/runs/123',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);

  const comparison = JSON.parse(fs.readFileSync(path.join(outDir, 'coverage-comparison.json'), 'utf8'));
  const summary = fs.readFileSync(path.join(outDir, 'summary.md'), 'utf8');
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.equal(comparison.measurement.status, 'available');
  assert.equal(comparison.codeCoverage.delta.lines, 25);
  assert.equal(comparison.apiCoverage.delta, 25);
  assert.match(summary, /\+25\.00 pp/);
  assert.match(summary, /GET\|\/api\/items\|404/);
  assert.match(html, /Coverage by file/);
  assert.match(html, /actions\/runs\/123/);
});
