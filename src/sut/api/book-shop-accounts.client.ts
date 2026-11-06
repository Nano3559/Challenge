import { BaseApiClient } from '@src/core';
import type { ShopAddress } from '@src/sut/data/book-shop-accounts';

export class BookShopAccountsClient extends BaseApiClient {
  getCurrent() { return this.get('/api/book-shop-accounts'); }
  getById(id: number) { return this.get(`/api/book-shop-accounts/${id}`); }
  getMyBooks() { return this.get('/api/book-shop-accounts/my-books'); }
  create(data: Record<string, unknown> = {}) { return this.post('/api/book-shop-accounts', data); }
  uploadFiles(form: FormData) { return this.postMultipart('/api/book-shop-accounts/files', form); }
  updateById(id: number, address: ShopAddress & Record<string, unknown>) { return this.patch(`/api/book-shop-accounts/${id}`, address); }
  authorize(roleIds?: number[]) { return this.post('/api/book-shop-authorize', roleIds ? { role_ids: roleIds } : {}); }
}
