'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildComparison } = require('../lib/comparison');
const { buildHtml, buildSummaryMarkdown } = require('../lib/comparison-report');

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
