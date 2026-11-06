import { BaseApiClient } from '@src/core';
import type { ItemCreate, ItemValues } from '@src/sut/data/book-shop-items';

export class BookShopItemsClient extends BaseApiClient {
  list() { return this.get('/api/book-shop-items'); }
  listManaged() { return this.get('/api/book-shop-manage/items'); }
  getByBookId(bookId: number) { return this.get(`/api/book-shop-manage/items/by-book/${bookId}`); }
  // Ruta efectiva del handler, distinta de la consulta por path del OpenAPI.
  findByBookId(bookId: number) { return this.get('/api/book-shop-manage/items', { book_id: bookId }); }
  create(item: ItemCreate) { return this.post('/api/book-shop-manage/items', item); }
  updateById(id: number, values: ItemValues) { return this.patch(`/api/book-shop-manage/items/${id}`, values); }
  deleteById(id: number) { return this.delete(`/api/book-shop-manage/items/${id}`); }
}
