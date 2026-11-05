import { BaseApiClient } from '@src/core';
import type { UserCreate } from '@src/sut/data/users';

export class UsersClient extends BaseApiClient {
  list() { return this.get('/api/users'); }
  getById(id: number | string) { return this.get(`/api/users/${encodeURIComponent(id)}`); }
  headById(id: number | string) { return this.head(`/api/users/${encodeURIComponent(id)}`); }
  create(user: Partial<UserCreate>) { return this.post('/api/users', user); }
  updateById(id: number | string, user: Partial<UserCreate>) { return this.put(`/api/users/${encodeURIComponent(id)}`, user); }
  patchById(id: number | string, user: Partial<UserCreate>) { return this.patch(`/api/users/${encodeURIComponent(id)}`, user); }
  deleteById(id: number | string) { return this.delete(`/api/users/${encodeURIComponent(id)}`); }
  createFromRawJson(payload: string) { return this.postRawJson('/api/users', payload); }
  updateFromRawJson(method: 'PUT' | 'PATCH', id: number | string, payload: string) {
    return this.sendRawJson(method, `/api/users/${encodeURIComponent(id)}`, payload);
  }
}
