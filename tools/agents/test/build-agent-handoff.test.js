'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildHandoff, formatDelta, formatPct, renderMarkdown } = require('../bin/build-agent-handoff');
const cliPath = path.resolve(__dirname, '../bin/build-agent-handoff.js');

test('crea un handoff con gaps OpenAPI, gaps c8 y delta, limitado a tres intentos', () => {
  const comparison = {
    measurement: { status: 'available', baseRun: 'failed', headRun: 'passed' },
    apiCoverage: { available: true, base: { global: 70 }, head: { global: 75 }, delta: 5 },
    codeCoverage: {
      available: true,
      base: { lines: { pct: 20 } }, head: { lines: { pct: 25 } }, delta: { lines: 5 },
      newlyUncoveredLines: [{ file: 'src/handler.js', line: 14 }],
      files: [{
        path: 'src/handler.js', head: { lines: { total: 10, covered: 8 } },
        uncoveredFunctions: ['checkPermission'], uncoveredBranches: [{ id: '3:0:1', line: 3 }], newlyUncoveredLines: [14],
      }],
    },
  };
  const handoff = buildHandoff({
    comparison,
    apiGaps: { gaps: [{ id: 'uncovered_endpoint|GET|/api/items', category: 'uncovered_endpoint', endpoint: '/api/items', methods: ['GET'], severity: 'high', description: 'Returns matching items.' }] },
    source: { branch: 'feature/items', baseRef: 'main', headSha: 'abc123', runUrl: 'https://example.test/run/1' },
  });

  assert.equal(handoff.task.maxRetries, 3);
  assert.equal(handoff.task.remainingAttempts, 3);
  assert.equal(handoff.coverage.api.delta, 5);
  assert.equal(handoff.gaps.uncoveredEndpoints.length, 1);
  assert.deepEqual(handoff.gaps.uncoveredFunctions, [{ file: 'src/handler.js', name: 'checkPermission' }]);
  assert.equal(handoff.gaps.missingTestScenarios[0].endpoint, '/api/items');
  assert.deepEqual(handoff.gaps.sourceFiles[0].uncoveredBranches, [{ id: '3:0:1', line: 3 }]);
  assert.match(renderMarkdown(handoff), /base \*\*failed\*\*, PR \*\*passed\*\*/);
});

test('mantiene faltantes como unavailable y no convierte null en cero', () => {
  const handoff = buildHandoff({
    comparison: {}, apiGaps: null,
    source: { branch: 'main', baseRef: 'main', headSha: 'def456', runUrl: 'https://example.test/run/2' },
  });
  assert.equal(formatPct(null), 'Unavailable');
  assert.equal(formatDelta(null), 'Unavailable');
  assert.equal(handoff.coverage.api.base, null);
  assert.equal(handoff.measurement.status, 'unavailable');
  assert.match(renderMarkdown(handoff), /gap data is unavailable/);
});

test('CLI escribe los paquetes JSON y Markdown desde artifacts de coverage', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'day4-agent-handoff-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const comparison = path.join(directory, 'comparison.json');
  const gaps = path.join(directory, 'gaps.json');
  const output = path.join(directory, 'out');
  fs.writeFileSync(comparison, JSON.stringify({
    measurement: { status: 'available' },
    apiCoverage: { available: true, base: { global: 45 }, head: { global: 55 }, delta: 10 },
    codeCoverage: { available: false },
  }));
  fs.writeFileSync(gaps, JSON.stringify({ gaps: [] }));
  const result = spawnSync(process.execPath, [
    cliPath, '--comparison', comparison, '--api-gaps', gaps, '--out', output,
    '--branch', 'feature/catalog', '--base-ref', 'main', '--head-sha', 'a1b2c3', '--run-url', 'https://example.test/run/8',
  ], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const handoff = JSON.parse(fs.readFileSync(path.join(output, 'agent-handoff.json'), 'utf8'));
  assert.equal(handoff.task.branch, 'feature/catalog');
  assert.equal(handoff.coverage.api.delta, 10);
  assert.equal(handoff.gaps.apiAvailable, true);
  assert.equal(fs.existsSync(path.join(output, 'agent-handoff.md')), true);
});
