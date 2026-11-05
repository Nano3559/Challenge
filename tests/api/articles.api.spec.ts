import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { articleListSchema } from '@src/sut/schemas';

test.describe('GET /api/articles', () => {
  test('devuelve el listado de artículos', { tag: '@smoke' }, async ({ articlesClient }) => {
    const response = await articlesClient.list();

    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(articleListSchema, body);
    expect(body.length).toBeGreaterThan(0);
  });
});
