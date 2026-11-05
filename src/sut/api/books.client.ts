import { BaseApiClient } from '@src/core';
import type { BookCreate, BookCollection } from '@src/sut/data/books';

export class BooksClient extends BaseApiClient {
  list() { return this.get('/api/books'); }
  listWithoutItems() { return this.get('/api/book-shop-manage/books-without-items'); }
  getById(id: number) { return this.get(`/api/books/${id}`); }
  create(book: Partial<BookCreate>) { return this.post('/api/books', book); }
  patchById(id: number, book: Partial<BookCreate> & { active?: boolean }) { return this.patch(`/api/books/${id}`, book); }
  deleteById(id: number) { return this.delete(`/api/books/${id}`); }
  toggle(collection: BookCollection, id: number) { return this.post(`/api/books/${collection}/${id}`); }
  createFromRawJson(payload: string) { return this.postRawJson('/api/books', payload); }
  patchFromRawJson(id: number, payload: string) { return this.sendRawJson('PATCH', `/api/books/${id}`, payload); }
}
