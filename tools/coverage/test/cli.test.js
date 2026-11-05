'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const cli = path.join(__dirname, '..', 'bin', 'coverage-cli.js');
const fixtures = path.join(__dirname, 'fixtures');
const spec = path.join(fixtures, 'demo-openapi.json');
const requests = path.join(fixtures, 'demo-requests.jsonl');

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-cli-'));
}

test('CLI escribe JSON válidos y baseline, y sale 0 si el gate se cumple', (t) => {
  const out = tempDir();
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));

  const result = runCli([
    '--spec',
    spec,
    '--requests',
    requests,
    '--out',
    out,
    '--min-coverage',
    '50',
    '--console-limit',
    '3',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OpenAPI Coverage Report/);
  assert.match(result.stdout, /GLOBAL .*72\.22%/);
  assert.match(result.stdout, /GATE DE COBERTURA: OK/);

  const report = JSON.parse(fs.readFileSync(path.join(out, 'coverage-report.json'), 'utf8'));
  const gaps = JSON.parse(fs.readFileSync(path.join(out, 'coverage-gaps.json'), 'utf8'));
  const baseline = fs.readFileSync(path.join(out, 'day-1-baseline.md'), 'utf8');

  assert.equal(report.summary.global.percentage, 72.22);
  assert.equal(gaps.summary.total, 6);
  assert.equal(gaps.gaps[0].category, 'uncovered_endpoint');
  assert.match(baseline, /Day 1 Baseline/);

  for (const gap of gaps.gaps) {
    assert.ok(gap.category && gap.endpoint && gap.method && gap.description);
  }
});

test('CLI sale 1 si la cobertura está por debajo del umbral', (t) => {
  const out = tempDir();
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));

  const result = runCli([
    '--spec',
    spec,
    '--requests',
    requests,
    '--out',
    out,
    '--min-coverage',
    '90',
    '--quiet',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /GATE DE COBERTURA: FALLÓ/);
  assert.match(result.stderr, /72\.22% < umbral 90\.00%/);
});

test('CLI sale 1 si se exige cero brechas críticas', (t) => {
  const out = tempDir();
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));

  const result = runCli([
    '--spec',
    spec,
    '--requests',
    requests,
    '--out',
    out,
    '--fail-on-critical-gaps',
    '--quiet',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /2 brechas críticas/);
});

test('CLI integra estimaciones IA reales registradas y las refleja en el baseline', (t) => {
  const out = tempDir();
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));

  const result = runCli([
    '--spec',
    spec,
    '--requests',
    requests,
    '--out',
    out,
    '--ai-estimates',
    path.join(fixtures, 'demo-ai-estimates.json'),
    '--quiet',
  ]);

  assert.equal(result.status, 0, result.stderr);
  const baseline = fs.readFileSync(path.join(out, 'day-1-baseline.md'), 'utf8');
  assert.match(baseline, /70\.00%/);
  assert.match(baseline, /75\.00%/);
  assert.match(baseline, /5\.00 puntos porcentuales/);
});

test('CLI devuelve error de uso claro ante opciones inválidas', () => {
  const result = runCli(['--spec', spec, '--min-coverage', '200']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--min-coverage debe ser un número entre 0 y 100/);
});
