'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadOpenApiFile } = require('../lib/openapi-parser');
const { loadRequests, normalizeRequest } = require('../lib/request-store');
const {
  buildCoverageReport,
  matchRequest,
  statusMatches,
  normalizePathname,
  _private,
} = require('../lib/analyzer');

const fixtures = path.join(__dirname, 'fixtures');

function analyze() {
  const spec = loadOpenApiFile(path.join(fixtures, 'demo-openapi.json'));
  const requestStore = loadRequests(path.join(fixtures, 'demo-requests.jsonl'));
  return buildCoverageReport({ spec, requestStore, generatedAt: '2026-11-05T10:10:00.000Z' });
}

test('calcula cobertura de endpoints, operaciones, status y parámetros sin confundirlos', () => {
  const { report } = analyze();

  assert.equal(report.summary.endpoints.total, 4);
  assert.equal(report.summary.endpoints.covered, 3);
  assert.equal(report.summary.endpoints.uncovered, 1);
  assert.equal(report.summary.endpoints.fullyCovered, 1);
  assert.equal(report.summary.endpoints.partiallyCovered, 2);
  assert.equal(report.summary.endpoints.percentage, 75);

  assert.equal(report.summary.operations.total, 5);
  assert.equal(report.summary.operations.covered, 4);
  assert.equal(report.summary.operations.percentage, 80);

  assert.equal(report.summary.statusCodes.total, 7);
  assert.equal(report.summary.statusCodes.covered, 4);
  assert.equal(report.summary.statusCodes.percentage, 57.14);

  assert.equal(report.summary.parameters.total, 6);
  assert.equal(report.summary.parameters.covered, 5);
  assert.equal(report.summary.parameters.percentage, 83.33);

  assert.equal(report.summary.global.coveredUnits, 13);
  assert.equal(report.summary.global.totalUnits, 18);
  assert.equal(report.summary.global.percentage, 72.22);
});

test('distingue endpoint full, partial y sin cobertura', () => {
  const { report } = analyze();
  const byPath = Object.fromEntries(report.endpoints.map((endpoint) => [endpoint.path, endpoint]));

  assert.equal(byPath['/cookies'].coverage, 'full');
  assert.equal(byPath['/items'].coverage, 'partial');
  assert.equal(byPath['/items/{id}'].coverage, 'partial');
  assert.equal(byPath['/ping'].coverage, 'none');
});

test('genera brechas con categoría, endpoint, método y severidad', () => {
  const { gapReport } = analyze();

  assert.equal(gapReport.summary.total, 6);
  assert.equal(gapReport.summary.critical, 2);
  assert.deepEqual(gapReport.summary.byCategory, {
    uncovered_endpoint: 1,
    untested_method: 1,
    unexecuted_status_code: 3,
    untested_parameter: 1,
  });

  const untestedMethod = gapReport.gaps.find((gap) => gap.category === 'untested_method');
  assert.equal(untestedMethod.endpoint, '/ping');
  assert.equal(untestedMethod.method, 'GET');
  assert.equal(untestedMethod.severity, 'critical');

  const missingStatus = gapReport.gaps.find(
    (gap) => gap.category === 'unexecuted_status_code' && gap.method === 'POST' && gap.statusCode === '400',
  );
  assert.ok(missingStatus);
  assert.equal(missingStatus.severity, 'high');

  const missingParameter = gapReport.gaps.find(
    (gap) => gap.category === 'untested_parameter' && gap.parameter === 'X-Tenant',
  );
  assert.ok(missingParameter);
  assert.equal(missingParameter.parameterIn, 'header');
  assert.equal(missingParameter.severity, 'medium');

  for (const gap of gapReport.gaps) {
    assert.equal(typeof gap.id, 'string');
    assert.equal(typeof gap.description, 'string');
    assert.ok(['uncovered_endpoint', 'untested_method', 'unexecuted_status_code', 'untested_parameter'].includes(gap.category));
    assert.ok(gap.endpoint);
    assert.ok(gap.method);
  }
});

test('marca solicitudes que no coinciden con la spec', () => {
  const { report } = analyze();
  assert.equal(report.requests.total, 5);
  assert.equal(report.requests.matched, 4);
  assert.equal(report.requests.unmatched, 1);
  assert.equal(report.unmatchedRequests[0].path, '/api/not-documented');
});

test('hace match con prefijo de servidor y extrae path params', () => {
  const spec = loadOpenApiFile(path.join(fixtures, 'demo-openapi.json'));
  const matcher = _private.buildOperationMatcher(spec);
  const request = normalizeRequest({
    method: 'GET',
    url: 'http://localhost:3000/api/items/42?expand=true',
    status: 200,
  });
  const match = matchRequest(matcher, request, spec.basePaths);

  assert.ok(match);
  assert.equal(match.operation.path, '/items/{id}');
  assert.equal(match.pathParams.id, '42');
  assert.equal(match.operation.method, 'GET');
});

test('normaliza paths y soporta status default y rangos', () => {
  assert.equal(normalizePathname('/api/items/?x=1'), '/api/items');
  assert.equal(normalizePathname('api//items'), '/api/items');
  assert.equal(statusMatches('default', 418, ['200', '404']), true);
  assert.equal(statusMatches('default', 200, ['200', '404']), false);
  assert.equal(statusMatches('2XX', 204, []), true);
  assert.equal(statusMatches('4XX', 200, []), false);
});

test('el modelo de cobertura documenta que una solicitud no cubre todos los parámetros', () => {
  const { report } = analyze();
  assert.match(report.coverageModel.parameterCoverage, /NO cubre automáticamente/);
  assert.ok(report.coverageModel.limitations.length >= 3);
});
