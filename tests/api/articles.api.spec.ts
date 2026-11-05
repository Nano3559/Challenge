import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { buildArticle, buildArticleWithoutTitle, knownArticle, malformedArticleJson, missingArticleId } from '@src/sut/data/articles';
import { articleListSchema, articleSchema } from '@src/sut/schemas';

import { ArticlesClient } from '@src/sut/api/articles.client';
import type { ArticleCreate } from '@src/sut/data/articles';

async function withOwnedArticle(client: ArticlesClient, run: (id: number, original: ArticleCreate & { id: number; user_id: number | string }) => Promise<void>) {
  const created = await client.create(buildArticle());
  const original = await created.json();
  try {
    expect(created.status()).toBe(201);
    expectSchema(articleSchema, original);
    await run(original.id, original);
  } finally {
    const cleanup = await client.deleteById(original.id);
    expect(cleanup.status()).toBe(200);
    expect((await client.getById(original.id)).status()).toBe(404);
  }
}
// GAD consulta el archivo de datos al validar escrituras; evitar escrituras solapadas.
test.describe.configure({ mode: 'default' });

test.describe('POST /api/articles', () => {
  test('devuelve 400 con JSON malformado', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    const response = await registeredArticlesClient.createFromRawJson(malformedArticleJson);

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      error: 'SyntaxError: Unexpected data in JSON. Please check Your JSON.',
      details: malformedArticleJson,
    });
  });

  test('crea un artículo con autorización', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    const article = buildArticle();
    const response = await registeredArticlesClient.create(article);
    const body = await response.json();

    try {
      expect(response.status()).toBe(201);
      expectSchema(articleSchema, body);
      expect(body).toMatchObject(article);
    } finally {
      const cleanup = await registeredArticlesClient.deleteById(body.id);
      expect(cleanup.status()).toBe(200);
      const deleted = await registeredArticlesClient.getById(body.id);
      expect(deleted.status()).toBe(404);
    }
  });

  test('devuelve 401 al crear sin autorización', { tag: '@regression' }, async ({ articlesClient }) => {
    const response = await articlesClient.create(buildArticle());

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token not provided!' } });
  });

  test('devuelve 422 si falta el título con autorización', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    const response = await registeredArticlesClient.create(buildArticleWithoutTitle());

    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({
      error: {
        message: 'One of mandatory field is missing',
        details: ['user_id', 'title', 'body', 'date'],
      },
    });
  });
});

test.describe('PUT /api/articles/:id', () => {
  test('crea con 201 al usar PUT sobre un id inexistente con admin', { tag: '@regression' }, async ({ authenticatedArticlesClient }) => {
    const payload = buildArticle();
    const absent = await authenticatedArticlesClient.getById(missingArticleId);
    expect(absent.status()).toBe(404);
    const response = await authenticatedArticlesClient.updateById(missingArticleId, payload);
    const body = await response.json();
    try {
      expect(response.status()).toBe(201);
      expectSchema(articleSchema.omit({ user_id: true }), body);
      expect(body).toMatchObject({ ...payload, user_id: 'admin' });
      const persisted = await authenticatedArticlesClient.getById(body.id);
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(body);
    } finally {
      expect((await authenticatedArticlesClient.deleteById(body.id)).status()).toBe(200);
      expect((await authenticatedArticlesClient.getById(body.id)).status()).toBe(404);
    }
  });

  test('devuelve 422 sin título y conserva el artículo', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    await withOwnedArticle(registeredArticlesClient, async (id, original) => {
      const response = await registeredArticlesClient.updateById(id, buildArticleWithoutTitle());
      expect(response.status()).toBe(422);
      expect(await response.json()).toEqual({ error: {
        message: 'One of mandatory field is missing', details: ['user_id', 'title', 'body', 'date'],
      } });
      const preserved = await registeredArticlesClient.getById(id);
      expect(preserved.status()).toBe(200);
      expect(await preserved.json()).toEqual(original);
    });
  });

  test('actualiza un artículo con autorización y persiste los cambios', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    const created = await registeredArticlesClient.create(buildArticle());
    const original = await created.json();

    try {
      expect(created.status()).toBe(201);
      expectSchema(articleSchema, original);
      const update = buildArticle();
      const response = await registeredArticlesClient.updateById(original.id, update);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(articleSchema, body);
      expect(body).toMatchObject({ ...update, id: original.id, user_id: original.user_id });

      const persisted = await registeredArticlesClient.getById(original.id);
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(body);
    } finally {
      const cleanup = await registeredArticlesClient.deleteById(original.id);
      expect(cleanup.status()).toBe(200);
      const deleted = await registeredArticlesClient.getById(original.id);
      expect(deleted.status()).toBe(404);
    }
  });

  test('devuelve 401 sin autorización y conserva el artículo', { tag: '@regression' }, async ({
    articlesClient,
    registeredArticlesClient,
  }) => {
    const created = await registeredArticlesClient.create(buildArticle());
    const original = await created.json();

    try {
      expect(created.status()).toBe(201);
      expectSchema(articleSchema, original);
      const response = await articlesClient.updateById(original.id, buildArticle());

      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Access token not provided!' } });

      const preserved = await registeredArticlesClient.getById(original.id);
      expect(preserved.status()).toBe(200);
      expect(await preserved.json()).toEqual(original);
    } finally {
      const cleanup = await registeredArticlesClient.deleteById(original.id);
      expect(cleanup.status()).toBe(200);
      const deleted = await registeredArticlesClient.getById(original.id);
      expect(deleted.status()).toBe(404);
    }
  });
});

test.describe('DELETE /api/articles/:id', () => {
  test('devuelve 401 sin autorización y conserva el artículo', { tag: '@regression' }, async ({
    articlesClient,
    registeredArticlesClient,
  }) => {
    const article = buildArticle();
    const created = await registeredArticlesClient.create(article);
    const body = await created.json();

    try {
      expect(created.status()).toBe(201);
      expectSchema(articleSchema, body);
      expect(body).toMatchObject(article);

      const response = await articlesClient.deleteById(body.id);

      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Access token not provided!' } });

      const preserved = await registeredArticlesClient.getById(body.id);
      expect(preserved.status()).toBe(200);
      const preservedBody = await preserved.json();
      expectSchema(articleSchema, preservedBody);
      expect(preservedBody).toEqual(body);
    } finally {
      const cleanup = await registeredArticlesClient.deleteById(body.id);
      expect(cleanup.status()).toBe(200);
      const deleted = await registeredArticlesClient.getById(body.id);
      expect(deleted.status()).toBe(404);
    }
  });
});

for (const method of ['PUT', 'PATCH', 'DELETE'] as const) {
  test.describe(`${method} /api/articles/:id — JSON malformado`, () => {
    test('devuelve 400 y conserva el artículo', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
      await withOwnedArticle(registeredArticlesClient, async (id, original) => {
        const response = await registeredArticlesClient.updateFromRawJson(method, id, malformedArticleJson);
        expect(response.status()).toBe(400);
        expect(await response.json()).toEqual({
          error: 'SyntaxError: Unexpected data in JSON. Please check Your JSON.', details: malformedArticleJson,
        });
        const preserved = await registeredArticlesClient.getById(id);
        expect(preserved.status()).toBe(200);
        expect(await preserved.json()).toEqual(original);
      });
    });
  });
}

test.describe('PATCH /api/articles/:id', () => {
  test('actualiza solo el título y persiste los demás campos', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    await withOwnedArticle(registeredArticlesClient, async (id, original) => {
      const { title } = buildArticle();
      const response = await registeredArticlesClient.patchById(id, { title });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(articleSchema, body);
      expect(body).toEqual({ ...original, title });
      const persisted = await registeredArticlesClient.getById(id);
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(body);
    });
  });

  test('devuelve 401 sin autorización y conserva el artículo', { tag: '@regression' }, async ({ articlesClient, registeredArticlesClient }) => {
    await withOwnedArticle(registeredArticlesClient, async (id, original) => {
      const response = await articlesClient.patchById(id, { title: buildArticle().title });
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Access token not provided!' } });
      const preserved = await registeredArticlesClient.getById(id);
      expect(preserved.status()).toBe(200);
      expect(await preserved.json()).toEqual(original);
    });
  });

  test('devuelve 422 con título vacío y conserva el artículo', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    await withOwnedArticle(registeredArticlesClient, async (id, original) => {
      const response = await registeredArticlesClient.patchById(id, { title: '' });
      expect(response.status()).toBe(422);
      expect(await response.json()).toEqual({ error: {
        message: 'One of field is invalid (empty, invalid or too long) or there are some additional fields: Field validation: "title" is empty! Mandatory fields: [user_id,title,body,date]',
        details: ['id', 'user_id', 'title', 'body', 'date', 'image'],
      } });
      const preserved = await registeredArticlesClient.getById(id);
      expect(preserved.status()).toBe(200);
      expect(await preserved.json()).toEqual(original);
    });
  });

  test('devuelve 404 si el artículo no existe', { tag: '@regression' }, async ({ registeredArticlesClient }) => {
    const response = await registeredArticlesClient.patchById(missingArticleId, { title: buildArticle().title });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});

test.describe('GET /api/articles', () => {
  test('devuelve el listado de artículos', { tag: '@smoke' }, async ({ articlesClient }) => {
    const response = await articlesClient.list();

    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(articleListSchema, body);
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('HEAD /api/articles/:id', () => {
  test('devuelve 200 sin cuerpo si el artículo existe', { tag: '@regression' }, async ({ articlesClient }) => {
    const response = await articlesClient.headById(knownArticle.id);

    expect(response.status()).toBe(200);
    expect(await response.text()).toBe('');
  });

  test('devuelve 404 sin cuerpo si el artículo no existe', { tag: '@regression' }, async ({ articlesClient }) => {
    const response = await articlesClient.headById(missingArticleId);

    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('');
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
