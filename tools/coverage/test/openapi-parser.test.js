'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const {
  loadOpenApiFile,
  parseOpenApiText,
  extractOpenApi,
  mergeParameters,
} = require('../lib/openapi-parser');
const { CoverageError } = require('../lib/errors');

const fixtures = path.join(__dirname, 'fixtures');

test('parsea OpenAPI JSON y extrae paths, métodos, parámetros y respuestas', () => {
  const spec = loadOpenApiFile(path.join(fixtures, 'demo-openapi.json'));

  assert.equal(spec.openapi, '3.0.1');
  assert.equal(spec.endpoints.length, 4);
  assert.equal(spec.operations.length, 5);
  assert.deepEqual(
    spec.operations.map((operation) => `${operation.method} ${operation.path}`).sort(),
    ['GET /cookies', 'GET /items', 'GET /items/{id}', 'GET /ping', 'POST /items'],
  );

  const getItem = spec.operations.find((operation) => operation.method === 'GET' && operation.path === '/items/{id}');
  assert.deepEqual(
    getItem.parameters.map((parameter) => `${parameter.in}:${parameter.name}`),
    ['path:id', 'header:X-Tenant', 'query:expand'],
  );
  assert.deepEqual(
    getItem.responses.map((response) => response.code),
    ['200', '404'],
  );
});

test('resuelve $ref locales y combina parámetros de path item sin duplicar', () => {
  const spec = loadOpenApiFile(path.join(fixtures, 'demo-openapi.json'));
  const listItems = spec.operations.find((operation) => operation.method === 'GET' && operation.path === '/items');

  assert.deepEqual(
    listItems.parameters.map((parameter) => `${parameter.in}:${parameter.name}`),
    ['query:limit', 'header:X-Trace'],
  );

  const merged = mergeParameters(
    [{ name: 'id', in: 'path', required: true }],
    [
      { name: 'id', in: 'path', required: true, description: 'override' },
      { name: 'q', in: 'query', required: false },
    ],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].description, 'override');
});

test('parsea OpenAPI YAML y normaliza el prefijo absoluto del servidor', () => {
  const spec = loadOpenApiFile(path.join(fixtures, 'demo-openapi.yaml'));

  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.operations.length, 1);
  assert.deepEqual(spec.basePaths.sort(), ['', '/api']);
  assert.equal(spec.operations[0].responses.length, 2);
});

test('rechaza Swagger 2.0 y archivos sin paths', () => {
  assert.throws(
    () => extractOpenApi({ swagger: '2.0', paths: {} }, { source: 'swagger.json' }),
    (error) => error instanceof CoverageError && error.code === 'UNSUPPORTED_VERSION',
  );
  assert.throws(
    () => extractOpenApi({ openapi: '3.0.1' }, { source: 'no-paths.json' }),
    (error) => error instanceof CoverageError && error.code === 'MISSING_PATHS',
  );
  assert.throws(() => parseOpenApiText('', 'empty.json'), /vacío/);
});

test('falla con un mensaje claro si el spec no existe', () => {
  assert.throws(
    () => loadOpenApiFile(path.join(fixtures, 'no-existe.json')),
    (error) => error instanceof CoverageError && error.code === 'SPEC_NOT_FOUND',
  );
});

test('soporta archivos .json con contenido válido y extensión desconocida', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-spec-'));
  const target = path.join(tmp, 'spec.openapi');
  fs.writeFileSync(target, JSON.stringify({ openapi: '3.0.1', paths: { '/x': { get: { responses: {} } } } }));
  const spec = loadOpenApiFile(target);
  assert.equal(spec.operations.length, 1);
  fs.rmSync(tmp, { recursive: true, force: true });
});
