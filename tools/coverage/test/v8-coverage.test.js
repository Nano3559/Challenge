'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const { inspectV8Coverage } = require('../bin/validate-v8-coverage');

test('detects executed application files in raw V8 data', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v8-coverage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'gad-gui-api-demo');
  const raw = path.join(root, 'raw');
  const source = path.join(app, 'server.js');
  fs.mkdirSync(app, { recursive: true });
  fs.mkdirSync(raw);
  fs.writeFileSync(source, 'module.exports = true;');
  fs.writeFileSync(path.join(raw, 'coverage.json'), JSON.stringify({ result: [
    { url: pathToFileURL(source).href, functions: [{ ranges: [{ count: 1 }] }] },
  ] }));

  assert.deepEqual(inspectV8Coverage(raw, app), { rawFiles: 1, appScripts: 1, executedScripts: 1 });
});

test('does not count runtime files or unexecuted app files as app coverage', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v8-coverage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'gad-gui-api-demo');
  const raw = path.join(root, 'raw');
  fs.mkdirSync(app);
  fs.mkdirSync(raw);
  fs.writeFileSync(path.join(raw, 'coverage.json'), JSON.stringify({ result: [
    { url: 'node:internal/modules/cjs/loader', functions: [{ ranges: [{ count: 8 }] }] },
    { url: pathToFileURL(path.join(app, 'server.js')).href, functions: [{ ranges: [{ count: 0 }] }] },
  ] }));

  assert.deepEqual(inspectV8Coverage(raw, app), { rawFiles: 1, appScripts: 1, executedScripts: 0 });
});
