import { BaseApiClient } from '@src/core';

export type ReviewQuery = { book_id?: string; mean?: 'true' | 'false'; book_ids?: string };

export class BookReviewsClient extends BaseApiClient {
  query(params?: ReviewQuery) { return this.get('/api/book-shop-book-reviews', params); }
  listByBook(bookId: number) { return this.query({ book_id: String(bookId) }); }
  statisticsByBook(bookId: number) { return this.query({ book_id: String(bookId), mean: 'true' }); }
  statisticsByBooks(bookIds: number[]) { return this.query({ book_ids: bookIds.join(','), mean: 'true' }); }
}
