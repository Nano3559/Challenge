'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, testCases } = require('../bin/finish-test-batch');

test('parses repeated API test files and explicit publish flag', () => {
  const result = parseArgs([
    '--handoff', 'handoff.json', '--branch', 'feature/items',
    '--test-file', 'tests/api/items.api.spec.ts', '--test-file', 'tests/api/items-errors.api.spec.ts', '--publish',
  ]);
  assert.equal(result.branch, 'feature/items');
  assert.equal(result.testFiles.length, 2);
  assert.equal(result.publish, true);
});

test('rejects an unsafe branch and a test file outside the API specs directory', () => {
  assert.throws(() => parseArgs(['--handoff', 'handoff.json', '--branch', 'main;git push', '--test-file', 'tests/api/x.spec.ts']), /unsupported characters/);
  assert.throws(() => parseArgs(['--handoff', 'handoff.json', '--branch', 'main', '--test-file', 'src/production.spec.ts']), /plain tests\/api/);
});

test('extracts nested test names and assertion counts for duplicate protection', () => {
  const source = `
    test.describe('Items', () => {
      test('returns owner item', async () => {
        const response = await client.get();
        expect(response.status()).toBe(200);
      });
    });
  `;
  assert.deepEqual(testCases(source, 'tests/api/items.api.spec.ts'), [
    { title: 'Items › returns owner item', assertions: 1, fileName: 'tests/api/items.api.spec.ts' },
  ]);
});
