import { BaseApiClient } from '@src/core';

/** Cliente del recurso articles de GAD (json-server: /api/articles). */
export class ArticlesClient extends BaseApiClient {
  list(params?: { userId?: number; q?: string; _limit?: number }) {
    return this.get('/api/articles', params);
  }
}
