'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadOpenApiFile } = require('../lib/openapi-parser');
const { loadRequests } = require('../lib/request-store');
const { buildCoverageReport } = require('../lib/analyzer');
const { loadAiEstimates, compareEstimates } = require('../lib/ai-estimates');
const { buildBaselineMarkdown } = require('../lib/baseline');

const fixtures = path.join(__dirname, 'fixtures');

function build() {
  const spec = loadOpenApiFile(path.join(fixtures, 'demo-openapi.json'));
  const requestStore = loadRequests(path.join(fixtures, 'demo-requests.jsonl'));
  return buildCoverageReport({ spec, requestStore, generatedAt: '2026-11-05T10:20:00.000Z' });
}

test('el baseline incluye todas las secciones obligatorias', () => {
  const { report, gapReport } = build();
  const markdown = buildBaselineMarkdown({
    report,
    gapReport,
    aiEstimates: { provided: false, reason: 'No se ejecutó.' },
    aiComparison: null,
    inputs: { testsPath: 'tests', command: 'node coverage-cli.js' },
  });

  for (const section of [
    '## 1. Objetivo del análisis',
    '## 2. Archivos analizados',
    '## 3. Cobertura calculada por la herramienta',
    '## 4. Primera estimación de IA',
    '## 5. Segunda estimación de IA',
    '## 6. Variación entre ambas estimaciones',
    '## 7. Comparación entre IA y herramienta',
    '## 8. Principales brechas identificadas',
    '## 9. Conclusiones y recomendaciones',
    '## 10. Limitaciones de la medición',
  ]) {
    assert.ok(markdown.includes(section), `Falta la sección ${section}`);
  }
  assert.match(markdown, /72\.22%/);
  assert.match(markdown, /No se ejecutó una estimación real de IA/);
  assert.match(markdown, /No se presentan porcentajes inventados/);
});

test('con dos estimaciones calcula variación y diferencias contra la herramienta', () => {
  const { report, gapReport } = build();
  const aiEstimates = loadAiEstimates(path.join(fixtures, 'demo-ai-estimates.json'));
  const aiComparison = compareEstimates(aiEstimates, report.summary.global.percentage);
  const markdown = buildBaselineMarkdown({
    report,
    gapReport,
    aiEstimates,
    aiComparison,
    inputs: { testsPath: 'tests', command: 'node coverage-cli.js' },
  });

  assert.equal(aiComparison.variationBetweenEstimates, 5);
  assert.equal(aiComparison.estimates[0].absoluteDifferenceVsTool, 2.22);
  assert.match(markdown, /5\.00 puntos porcentuales/);
  assert.match(markdown, /IA 1 \| 70\.00% \| -2\.22 pp/);
  assert.match(markdown, /IA 2 \| 75\.00% \| \+2\.78 pp/);
  assert.match(markdown, /herramienta es la fuente de verdad/i);
});

test('rechaza estimaciones IA sin cobertura numérica válida', () => {
  const invalid = path.join(fixtures, 'invalid-ai.json');
  const fs = require('node:fs');
  fs.writeFileSync(invalid, JSON.stringify({ estimates: [{ id: 1, estimatedCoverage: 'mucho' }] }));
  assert.throws(() => loadAiEstimates(invalid), /estimatedCoverage/);
  fs.rmSync(invalid, { force: true });
});
