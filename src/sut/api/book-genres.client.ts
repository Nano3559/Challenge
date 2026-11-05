import { BaseApiClient } from '@src/core';

export class BookGenresClient extends BaseApiClient {
  list() { return this.get('/api/book-genres'); }
  getById(id: number) { return this.get(`/api/book-genres/${id}`); }
}
