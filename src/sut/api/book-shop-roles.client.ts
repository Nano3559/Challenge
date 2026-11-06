import { BaseApiClient } from '@src/core';

export class BookShopRolesClient extends BaseApiClient {
  list() { return this.get('/api/book-shop-roles'); }
  getById(id: number) { return this.get(`/api/book-shop-roles/${id}`); }
  create(data: { id: number; name: string }) { return this.post('/api/book-shop-roles', data); }
  replace(id: number, data: { name: string }) { return this.put(`/api/book-shop-roles/${id}`, data); }
  update(id: number, data: { name: string }) { return this.patch(`/api/book-shop-roles/${id}`, data); }
  remove(id: number) { return this.delete(`/api/book-shop-roles/${id}`); }
}
