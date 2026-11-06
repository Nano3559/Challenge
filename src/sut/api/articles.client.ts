import { BaseApiClient } from '@src/core';
import type { ArticleCreate } from '@src/sut/data/articles';

/** Cliente del recurso articles de GAD (json-server: /api/articles). */
export class ArticlesClient extends BaseApiClient {
  create(article: Partial<ArticleCreate>) {
    return this.post('/api/articles', article);
  }

  createFromRawJson(payload: string) {
    return this.postRawJson('/api/articles', payload);
  }

  deleteById(id: number) {
    return this.delete(`/api/articles/${id}`);
  }

  updateById(id: number, article: Partial<ArticleCreate>) {
    return this.put(`/api/articles/${id}`, article);
  }

  patchById(id: number, article: Partial<ArticleCreate>) {
    return this.patch(`/api/articles/${id}`, article);
  }

  updateFromRawJson(method: 'PUT' | 'PATCH' | 'DELETE', id: number, payload: string) {
    return this.sendRawJson(method, `/api/articles/${id}`, payload);
  }

  list(params?: { userId?: number; q?: string; _limit?: number }) {
    return this.get('/api/articles', params);
  }

  search(params?: Record<string, string | number>) {
    return this.get('/api/articles/search', params);
  }

  getById(id: number) {
    return this.get(`/api/articles/${id}`);
  }

  headById(id: number) {
    return this.head(`/api/articles/${id}`);
  }
}
