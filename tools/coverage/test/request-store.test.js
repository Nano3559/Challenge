'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const { loadRequests, normalizeRequest, cookiesFromHeader } = require('../lib/request-store');
const { CoverageError } = require('../lib/errors');

const fixtures = path.join(__dirname, 'fixtures');

test('carga JSONL, normaliza headers y descarta líneas inválidas con warning', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-requests-'));
  const file = path.join(tmp, 'requests.jsonl');
  fs.writeFileSync(
    file,
    [
      JSON.stringify({ method: 'GET', url: 'http://localhost:3000/api/x?q=1', status: 200, headers: { 'X-Test': 'a' } }),
      '{ linea rota',
      JSON.stringify({ method: 'POST', path: '/api/y', status: 201 }),
    ].join('\n'),
  );

  const store = loadRequests(file);
  assert.equal(store.requests.length, 2);
  assert.equal(store.warnings.length, 1);
  assert.equal(store.requests[0].query.q, '1');
  assert.equal(store.requests[0].headers['x-test'], 'a');
  assert.equal(store.requests[1].method, 'POST');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('carga solicitudes desde un JSON array y desde un directorio', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-requests-dir-'));
  const requests = [{ method: 'GET', path: '/api/a', status: 200 }];
  fs.writeFileSync(path.join(tmp, 'a.json'), JSON.stringify(requests));
  fs.mkdirSync(path.join(tmp, 'nested'));
  fs.writeFileSync(path.join(tmp, 'nested', 'b.jsonl'), JSON.stringify({ method: 'GET', path: '/api/b', status: 204 }));

  const store = loadRequests(tmp);
  assert.equal(store.requests.length, 2);
  assert.equal(store.files.length, 2);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('normaliza query duplicada, cookies y status inválido', () => {
  const request = normalizeRequest({
    method: 'get',
    url: 'http://localhost:3000/api/x?a=1&a=2',
    headers: { Cookie: 'session=abc; theme=dark' },
    status: 'no-es-numero',
  });

  assert.equal(request.method, 'GET');
  assert.deepEqual(request.query.a, ['1', '2']);
  assert.deepEqual(Object.keys(request.cookies).sort(), ['session', 'theme']);
  assert.equal(request.status, null);
  assert.equal(cookiesFromHeader('a=1; b=2').b, '***');
});

test('falla si la ruta de solicitudes no existe o no tiene archivos', () => {
  assert.throws(
    () => loadRequests(path.join(fixtures, 'no-existe')),
    (error) => error instanceof CoverageError && error.code === 'REQUESTS_NOT_FOUND',
  );

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-empty-'));
  assert.throws(
    () => loadRequests(tmp),
    (error) => error instanceof CoverageError && error.code === 'NO_REQUEST_FILES',
  );
  fs.rmSync(tmp, { recursive: true, force: true });
});
