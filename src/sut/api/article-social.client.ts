import { BaseApiClient } from '@src/core';

export class ArticleSocialClient extends BaseApiClient {
  labels() { return this.get('/api/labels'); }
  articleLabels(id: number) { return this.get(`/api/article-labels/articles/${id}`); }
  setLabels(id: number, data: Record<string, unknown>) { return this.put(`/api/article-labels/articles/${id}`, data); }
  malformedLabels(id: number) { return this.sendRawJson('PUT', `/api/article-labels/articles/${id}`, '{'); }
  like(data: Record<string, unknown>, userId: number) { return this.postWithHeaders('/api/likes', data, { userid: String(userId) }); }
  malformedLike() { return this.postRawJson('/api/likes', '{'); }
  articleLikes(id: number) { return this.get(`/api/likes/article/${id}`); }
  commentLikes(id: number) { return this.get(`/api/likes/comment/${id}`); }
  articleLikesQuery(id: number) { return this.get('/api/likes/article', { id }); }
  myLikes(id: number, userId: number) { return this.getWithHeaders('/api/likes/article/mylikes', { id }, { userid: String(userId) }); }
  bookmarks() { return this.get('/api/bookmarks/articles'); }
  bookmark(id: number) { return this.post('/api/bookmarks/articles', { article_id: id }); }
}
