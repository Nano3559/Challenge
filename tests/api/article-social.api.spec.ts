import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { buildArticle, missingArticleId } from '@src/sut/data/articles';
import { buildComment } from '@src/sut/data/comments';
import { buildUser } from '@src/sut/data/users';
import { articleLabelIds, tooManyLabelIds, socialOwnerId } from '@src/sut/data/article-social';
import { labelListSchema, articleLabelSchema, likeCountSchema, bookmarkSchema } from '@src/sut/schemas';
import { ArticleSocialClient } from '@src/sut/api/article-social.client';

test.describe('Etiquetas, likes y marcadores de artículos', () => {
  test('configuración predeterminada mantiene funciones sociales desactivadas', { tag: '@regression' }, async ({ request }) => {
    const client = new ArticleSocialClient(request);
    expect((await client.labels()).status()).toBe(404);
    expect((await client.articleLikes(missingArticleId)).status()).toBe(404);
    expect((await client.bookmarks()).status()).toBe(404);
  });

  test('catálogo público de etiquetas y ausencia de etiquetas para ID inexistente', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const response = await sandbox.anonymousSocial.labels();
    expect(response.status()).toBe(200);
    const labels = await response.json();
    expectSchema(labelListSchema, labels);
    expect(labels).toEqual(expect.arrayContaining(articleLabelIds.map((id) => expect.objectContaining({ id }))));
    expect((await sandbox.anonymousSocial.articleLabels(missingArticleId)).status()).toBe(404);
  });

  test('propietario asigna etiquetas a artículo propio; otros usuarios y datos inválidos se rechazan', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const response = await sandbox.articles.create(buildArticle());
    expect(response.status()).toBe(201);
    const article = await response.json();
    try {
      const created = await sandbox.social.setLabels(article.id, { article_id: article.id, label_ids: articleLabelIds });
      expect(created.status()).toBe(201);
      const association = await created.json();
      expectSchema(articleLabelSchema, association);
      expect(association).toMatchObject({ article_id: article.id, label_ids: articleLabelIds });
      const read = await sandbox.anonymousSocial.articleLabels(article.id);
      expect(read.status()).toBe(200);
      expect(await read.json()).toEqual(association);
      expect((await sandbox.otherSocial.setLabels(article.id, { article_id: article.id, label_ids: [] })).status()).toBe(401);
      expect((await sandbox.anonymousSocial.setLabels(article.id, { article_id: article.id, label_ids: [] })).status()).toBe(401);
      expect((await sandbox.social.setLabels(article.id, { article_id: article.id, label_ids: tooManyLabelIds })).status()).toBe(422);
      expect((await sandbox.social.malformedLabels(article.id)).status()).toBe(400);
      const preserved = await sandbox.anonymousSocial.articleLabels(article.id);
      expect(preserved.status()).toBe(200);
      expect(await preserved.json()).toEqual(association);
    } finally { expect((await sandbox.articles.deleteById(article.id)).status()).toBe(200); }
  });

  test('likes de artículo y comentario alternan y se reflejan en contadores y mylikes', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const response = await sandbox.articles.create(buildArticle());
    expect(response.status()).toBe(201);
    const article = await response.json();
    const commentResponse = await sandbox.owner.create(buildComment(article.id));
    expect(commentResponse.status()).toBe(201);
    const comment = await commentResponse.json();
    try {
      for (const [resource, id, read] of [
        ['article_id', article.id, () => sandbox.anonymousSocial.articleLikes(article.id)],
        ['comment_id', comment.id, () => sandbox.anonymousSocial.commentLikes(comment.id)],
      ] as const) {
        const before = await read();
        expect(before.status()).toBe(200);
        expectSchema(likeCountSchema, await before.json());
        expect(await before.json()).toEqual({ likes: 0 });
        expect((await sandbox.social.like({ [resource]: id, user_id: socialOwnerId }, socialOwnerId)).status()).toBe(201);
        const after = await read();
        expect(after.status()).toBe(200);
        expect(await after.json()).toEqual({ likes: 1 });
        expect((await sandbox.social.like({ [resource]: id, user_id: socialOwnerId }, socialOwnerId)).status()).toBe(200);
        const removed = await read();
        expect(removed.status()).toBe(200);
        expect(await removed.json()).toEqual({ likes: 0 });
      }
      const mine = await sandbox.social.myLikes(article.id, socialOwnerId);
      expect(mine.status()).toBe(200);
      expect(await mine.json()).toEqual({ likes: { [article.id]: false } });
      const query = await sandbox.anonymousSocial.articleLikesQuery(article.id);
      expect(query.status()).toBe(200);
      expect(await query.json()).toEqual({ likes: { [article.id]: 0 } });
    } finally {
      expect((await sandbox.owner.remove(comment.id)).status()).toBe(200);
      expect((await sandbox.articles.deleteById(article.id)).status()).toBe(200);
    }
  });

  test('likes rechaza token ausente, destinos ambiguos y JSON malformado', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    expect((await sandbox.anonymousSocial.like({ article_id: missingArticleId, user_id: socialOwnerId }, socialOwnerId)).status()).toBe(401);
    expect((await sandbox.social.like({ article_id: 1, comment_id: 1, user_id: socialOwnerId }, socialOwnerId)).status()).toBe(422);
    expect((await sandbox.social.like({ user_id: socialOwnerId }, socialOwnerId)).status()).toBe(422);
    expect((await sandbox.social.malformedLike()).status()).toBe(400);
  });

  test('marcadores nuevos crean colección, alternan y se aíslan entre usuarios', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    const user = buildUser();
    const createdUser = await sandbox.users.create(user);
    expect(createdUser.status()).toBe(201);
    const login = await sandbox.auth.login(user);
    expect(login.status()).toBe(200);
    const client = sandbox.socialForToken((await login.json()).access_token);
    const response = await sandbox.articles.create(buildArticle());
    expect(response.status()).toBe(201);
    const article = await response.json();
    try {
      const initial = await client.bookmarks();
      expect(initial.status()).toBe(200);
      expect(await initial.json()).toEqual({});
      const added = await client.bookmark(article.id);
      expect(added.status()).toBe(201);
      expectSchema(bookmarkSchema, await added.json());
      const listed = await client.bookmarks();
      expect(listed.status()).toBe(200);
      expect(await listed.json()).toEqual({ article_ids: [article.id] });
      const other = await sandbox.otherSocial.bookmarks();
      expect(other.status()).toBe(200);
      expect((await other.json()).article_ids ?? []).not.toContain(article.id);
      expect((await client.bookmark(article.id)).status()).toBe(200);
      const removed = await client.bookmarks();
      expect(removed.status()).toBe(200);
      expect(await removed.json()).toEqual({ article_ids: [] });
      expect((await client.bookmark(missingArticleId)).status()).toBe(422);
    } finally { expect((await sandbox.articles.deleteById(article.id)).status()).toBe(200); }
  });

  test('marcadores rechaza lectura y escritura sin token', { tag: '@regression' }, async ({ commentSandbox: sandbox }) => {
    expect((await sandbox.anonymousSocial.bookmarks()).status()).toBe(401);
    expect((await sandbox.anonymousSocial.bookmark(missingArticleId)).status()).toBe(401);
  });
});
