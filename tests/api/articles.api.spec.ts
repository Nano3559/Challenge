import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { knownArticle, missingArticleId } from '@src/sut/data/articles';
import { articleListSchema, articleSchema } from '@src/sut/schemas';

test.describe('GET /api/articles', () => {
  test('devuelve el listado de artículos', { tag: '@smoke' }, async ({ articlesClient }) => {
    const response = await articlesClient.list();

    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(articleListSchema, body);
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('GET /api/articles/:id', () => {
  test('devuelve el artículo solicitado', { tag: '@smoke' }, async ({ articlesClient }) => {
    const response = await articlesClient.getById(knownArticle.id);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(articleSchema, body);
    expect(body).toMatchObject({
      id: knownArticle.id,
      title: knownArticle.title,
      user_id: knownArticle.userId,
    });
  });

  test('devuelve 404 si el artículo no existe', { tag: '@regression' }, async ({ articlesClient }) => {
    const response = await articlesClient.getById(missingArticleId);

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});
