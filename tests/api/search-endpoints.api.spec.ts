import { test, expect } from '@src/sut/fixtures';
import { CommentsClient } from '@src/sut/api/comments.client';
import { UsersClient } from '@src/sut/api/users.client';
import { ArticlesClient } from '@src/sut/api/articles.client';
import { startAccountSandbox } from '@src/sut/fixtures/account-sandbox';

test.describe('Rutas de búsqueda documentadas', () => {
  test('comments/search y users/search reflejan el estado real de sus handlers', { tag: '@regression' }, async ({ playwright }) => {
    const sandbox = await startAccountSandbox();
    const context = await playwright.request.newContext({ baseURL: sandbox.baseUrl });
    try {
      const articles = new ArticlesClient(context);
      const comments = new CommentsClient(context);
      const users = new UsersClient(context);
      const articleSearch = await articles.search({ q: 'api' });
      expect(articleSearch.status()).toBe(404);
      const commentSearch = await comments.search({ q: 'api' });
      expect(commentSearch.status()).toBe(404);
      const userSearch = await users.search({ q: 'api' });
      expect(userSearch.status()).toBe(404);

      const searches: Array<{ client: ArticlesClient | CommentsClient | UsersClient; params: Record<string, string | number>[] }> = [
        { client: articles, params: [
          { id: 1 }, { user_id: 1 }, { date: '2024-01-01' }, { _sort: 'id' }, { _order: 'asc' },
          { _limit: 10 }, { _page: 1 }, { _start: 0 }, { _end: 10 }, { _embed: 'comments' }, { _expand: 'user' },
        ] },
        { client: comments, params: [
          { id: 1 }, { user_id: 1 }, { article_id: 1 }, { date: '2024-01-01' }, { _sort: 'id' }, { _order: 'asc' },
          { _limit: 10 }, { _page: 1 }, { _start: 0 }, { _end: 10 }, { _expand: 'user' },
        ] },
        { client: users, params: [
          { id: 1 }, { firstname: 'Ana' }, { lastname: 'QA' }, { email: 'ana@example.test' }, { _sort: 'id' },
          { _order: 'asc' }, { _limit: 10 }, { _page: 1 }, { _start: 0 }, { _end: 10 }, { _embed: 'articles' },
        ] },
      ];
      for (const { client, params } of searches) {
        for (const query of params) expect((await client.search(query)).status()).toBe(404);
      }
    } finally { await context.dispose(); await sandbox.dispose(); }
  });
});
