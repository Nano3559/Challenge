'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createFeatureTask } = require('../bin/create-feature-task');

test('packages a feature request with its target PR branch and GAD boundary', (t) => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'day4-feature-task-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  const file = createFeatureTask({ branch: 'feature/api-items', request: 'Add pagination to first-party item results.', output });
  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /feature\/api-items/);
  assert.match(content, /Add pagination/);
  assert.match(content, /read-only/);
});

test('requires a request and a safe branch name', () => {
  assert.throws(() => createFeatureTask({ branch: 'main', request: ' ', output: os.tmpdir() }), /cannot be empty/);
  assert.throws(() => createFeatureTask({ branch: 'main;push', request: 'Build a feature.', output: os.tmpdir() }), /plain target PR branch/);
});
