import { BaseApiClient } from '@src/core';

export class BookShopOrderStatusesClient extends BaseApiClient {
  list() { return this.get('/api/book-shop-order-statuses'); }
  getById(id: number) { return this.get(`/api/book-shop-order-statuses/${id}`); }
}
