'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../bin/finish-feature-batch');

test('parses a feature specification and optional validation test files', () => {
  const result = parseArgs([
    '--branch', 'feature/items', '--spec-file', 'docs/features/items.md',
    '--test-file', 'tests/api/items.api.spec.ts', '--publish',
  ]);
  assert.equal(result.branch, 'feature/items');
  assert.equal(result.specFile, 'docs/features/items.md');
  assert.deepEqual(result.testFiles, ['tests/api/items.api.spec.ts']);
  assert.equal(result.publish, true);
});

test('rejects a GAD feature specification path', () => {
  assert.throws(() => parseArgs(['--branch', 'feature/items', '--spec-file', 'gad-gui-api-demo/openapi.md']), /under docs/);
});
