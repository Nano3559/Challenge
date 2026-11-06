import { BaseApiClient } from '@src/core';

export class CommentsClient extends BaseApiClient {
  list() { return this.get('/api/comments'); }
  search(params?: Record<string, string | number>) { return this.get('/api/comments/search', params); }
  getById(id: number | string) { return this.get(`/api/comments/${id}`); }
  headById(id: number | string) { return this.head(`/api/comments/${id}`); }
  create(data: Record<string, unknown>) { return this.post('/api/comments', data); }
  replace(id: number, data: Record<string, unknown>) { return this.put(`/api/comments/${id}`, data); }
  update(id: number, data: Record<string, unknown>) { return this.patch(`/api/comments/${id}`, data); }
  remove(id: number) { return this.delete(`/api/comments/${id}`); }
  malformed(method: 'POST' | 'PUT' | 'PATCH', id = 0) {
    if (method === 'POST') return this.postRawJson('/api/comments', '{');
    return this.sendRawJson(method, `/api/comments/${id}`, '{');
  }
}
