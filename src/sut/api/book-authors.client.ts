import { BaseApiClient } from '@src/core';

export class BookAuthorsClient extends BaseApiClient {
  list() { return this.get('/api/book-authors'); }
  getById(id: number) { return this.get(`/api/book-authors/${id}`); }
}
