import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { buildArticle } from '@src/sut/data/articles';
import { buildComment, missingCommentId, updatedCommentBody, invalidCommentPayloads } from '@src/sut/data/comments';
import { commentSchema, commentListSchema } from '@src/sut/schemas';

test.describe('Comentarios de artículos', () => {
  test('listado público valida su esquema', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const response = await sandbox.anonymous.list();
    expect(response.status()).toBe(200);
    expectSchema(commentListSchema, await response.json());
  });

  for (const method of ['getById', 'headById'] as const) {
    test(`${method}: ID inexistente devuelve 404`, { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
      expect((await sandbox.anonymous[method](missingCommentId)).status()).toBe(404);
    });
  }

  test('alta, consulta pública, HEAD, PUT, PATCH y baja persistentes de comentario propio', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const articleResponse = await sandbox.articles.create(buildArticle());
    expect(articleResponse.status()).toBe(201);
    const article = await articleResponse.json();
    const createdIds: number[] = [];
    try {
      const payload = buildComment(article.id);
      const created = await sandbox.owner.create(payload);
      expect(created.status()).toBe(201);
      const original = await created.json();
      createdIds.push(original.id);
      expectSchema(commentSchema, original);
      expect(original).toMatchObject(payload);
      const read = await sandbox.anonymous.getById(original.id);
      expect(read.status()).toBe(200);
      expect(await read.json()).toEqual(original);
      expect((await sandbox.anonymous.headById(original.id)).status()).toBe(200);
      const replacedPayload = { ...payload, body: updatedCommentBody };
      const replaced = await sandbox.owner.replace(original.id, replacedPayload);
      expect(replaced.status()).toBe(200);
      const replacement = await replaced.json();
      expectSchema(commentSchema, replacement);
      expect(replacement).toMatchObject({ ...replacedPayload, id: original.id, user_id: original.user_id });
      const patched = await sandbox.owner.update(original.id, { body: payload.body });
      expect(patched.status()).toBe(200);
      expect(await patched.json()).toEqual(original);
      for (const method of ['replace', 'update', 'remove'] as const) {
        const rejected = await sandbox.other[method](original.id, replacedPayload);
        expect(rejected.status()).toBe(401);
      }
      for (const method of ['POST', 'PUT', 'PATCH'] as const) {
        const malformed = await sandbox.owner.malformed(method, original.id);
        expect(malformed.status()).toBe(400);
      }
      const preserved = await sandbox.anonymous.getById(original.id);
      expect(preserved.status()).toBe(200);
      expect(await preserved.json()).toEqual(original);
      expect((await sandbox.owner.remove(original.id)).status()).toBe(200);
      expect((await sandbox.anonymous.getById(original.id)).status()).toBe(404);
      expect((await sandbox.owner.remove(original.id)).status()).toBe(404);
      const list = await sandbox.anonymous.list();
      expect(list.status()).toBe(200);
      expect(await list.json()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: original.id })]));
    } finally {
      for (const id of createdIds) expect([200, 404]).toContain((await sandbox.owner.remove(id)).status());
      expect((await sandbox.articles.deleteById(article.id)).status()).toBe(200);
    }
  });

  test('rechaza escrituras sin token', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const payload = buildComment(1);
    expect((await sandbox.anonymous.create(payload)).status()).toBe(401);
    expect((await sandbox.anonymous.replace(missingCommentId, payload)).status()).toBe(401);
    expect((await sandbox.anonymous.update(missingCommentId, payload)).status()).toBe(401);
    expect((await sandbox.anonymous.remove(missingCommentId)).status()).toBe(401);
  });

  test('POST y PATCH rechazan campos inválidos; PATCH inexistente y DELETE devuelven 404', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    for (const payload of invalidCommentPayloads) {
      expect((await sandbox.owner.create(payload)).status()).toBe(422);
      expect((await sandbox.owner.replace(missingCommentId, payload)).status()).toBe(422);
      expect((await sandbox.owner.update(missingCommentId, payload)).status()).toBe(422);
    }
    expect((await sandbox.owner.update(missingCommentId, { body: updatedCommentBody })).status()).toBe(404);
    expect((await sandbox.owner.remove(missingCommentId)).status()).toBe(404);
  });

  test('PUT de ID inexistente crea un comentario con ID asignado por GAD', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const articleResponse = await sandbox.articles.create(buildArticle());
    expect(articleResponse.status()).toBe(201);
    const article = await articleResponse.json();
    const createdIds: number[] = [];
    try {
      const response = await sandbox.owner.replace(missingCommentId, buildComment(article.id));
      expect(response.status()).toBe(201);
      const comment = await response.json();
      createdIds.push(comment.id);
      expectSchema(commentSchema, comment);
      expect(comment.article_id).toBe(article.id);
      const persisted = await sandbox.anonymous.getById(comment.id);
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(comment);
    } finally {
      for (const id of createdIds) expect((await sandbox.owner.remove(id)).status()).toBe(200);
      expect((await sandbox.articles.deleteById(article.id)).status()).toBe(200);
    }
  });
});
