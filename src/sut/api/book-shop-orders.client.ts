import { BaseApiClient } from '@src/core';

export class BookShopOrdersClient extends BaseApiClient {
  list() { return this.get('/api/book-shop-orders'); }
  getById(id: number) { return this.get(`/api/book-shop-orders/${id}`); }
  create() { return this.post('/api/book-shop-orders', {}); }
  updateStatus(id: number, statusId: number) { return this.patch(`/api/book-shop-orders/${id}`, { status_id: statusId }); }
  addItem(bookId: number) { return this.post('/api/book-shop-orders/items', { book_id: bookId }); }
  removeItem(bookId: number) { return this.deleteWithBody('/api/book-shop-orders/items', { book_id: bookId }); }
  applyCoupon(code: string, orderId?: number) { return this.post('/api/book-shop-orders/coupon', { coupon_code: code, order_id: orderId }); }
  listManaged() { return this.get('/api/book-shop-manage/orders'); }
  manageStatus(id: number, statusId: number) { return this.patch(`/api/book-shop-manage/orders/${id}`, { status_id: statusId }); }
}
