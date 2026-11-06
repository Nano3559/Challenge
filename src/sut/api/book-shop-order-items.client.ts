import { BaseApiClient } from '@src/core';

// Ruta OpenAPI distinta de /book-shop-orders/items; actualmente no implementada por GAD.
export class BookShopOrderItemsClient extends BaseApiClient {
  add(bookId: number) { return this.post('/api/book-shop-order-items', { book_id: bookId }); }
  remove(bookId: number) { return this.deleteWithBody('/api/book-shop-order-items', { book_id: bookId }); }
}
