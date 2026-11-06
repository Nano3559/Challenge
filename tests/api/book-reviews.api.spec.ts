import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { reviewBooks } from '@src/sut/data/book-reviews';
import { bookReviewListSchema, bookReviewStatsSchema, bookReviewStatsListSchema } from '@src/sut/schemas';

test.describe('GET /api/book-shop-book-reviews', () => {
  for (const book of [reviewBooks.first, reviewBooks.second]) {
    test(`devuelve reseñas filtradas y anónimas para el libro ${book.id}`, { tag: '@smoke' }, async ({ bookReviewsClient }) => {
      const response = await bookReviewsClient.listByBook(book.id);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookReviewListSchema, body);
      expect(body).toHaveLength(book.count);
      expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ book_id: book.id })]));
      for (const review of body) expect(review.book_id).toBe(book.id);
    });

    test(`calcula cantidad y media redondeada para el libro ${book.id}`, { tag: '@regression' }, async ({ bookReviewsClient }) => {
      const response = await bookReviewsClient.statisticsByBook(book.id);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookReviewStatsSchema, body);
      expect(body).toEqual({ book_id: String(book.id), mean: book.mean, numberOfReviews: book.count });
    });
  }

  test('devuelve una lista vacía si el libro no tiene reseñas', { tag: '@regression' }, async ({ bookReviewsClient }) => {
    const response = await bookReviewsClient.listByBook(reviewBooks.missingId);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookReviewListSchema, body);
    expect(body).toEqual([]);
  });

  test('devuelve una lista vacía para un identificador textual sin coincidencias', { tag: '@regression' }, async ({ bookReviewsClient }) => {
    const response = await bookReviewsClient.query({ book_id: reviewBooks.unmatchedId });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  test('devuelve media y cantidad cero si no hay reseñas', { tag: '@regression' }, async ({ bookReviewsClient }) => {
    const response = await bookReviewsClient.statisticsByBook(reviewBooks.missingId);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookReviewStatsSchema, body);
    expect(body).toEqual({ book_id: String(reviewBooks.missingId), mean: 0, numberOfReviews: 0 });
  });

  test('devuelve estadísticas de varios libros incluyendo uno sin reseñas', { tag: '@regression' }, async ({ bookReviewsClient }) => {
    const { first, second, missingId } = reviewBooks;
    const response = await bookReviewsClient.statisticsByBooks([first.id, second.id, missingId]);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookReviewStatsListSchema, body);
    expect(body).toEqual([
      { book_id: String(first.id), mean: first.mean, numberOfReviews: first.count },
      { book_id: String(second.id), mean: second.mean, numberOfReviews: second.count },
      { book_id: String(missingId), mean: 0, numberOfReviews: 0 },
    ]);
  });

  test('preserva el orden y las repeticiones de book_ids', { tag: '@regression' }, async ({ bookReviewsClient }) => {
    const { first, second } = reviewBooks;
    const response = await bookReviewsClient.statisticsByBooks([second.id, first.id, second.id]);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookReviewStatsListSchema, body);
    expect(body).toEqual([
      { book_id: String(second.id), mean: second.mean, numberOfReviews: second.count },
      { book_id: String(first.id), mean: first.mean, numberOfReviews: first.count },
      { book_id: String(second.id), mean: second.mean, numberOfReviews: second.count },
    ]);
  });

  test('devuelve 404 cuando no se especifican filtros', { tag: '@regression' }, async ({ bookReviewsClient }) => {
    const response = await bookReviewsClient.query();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Not Found' } });
  });

  test('devuelve 404 con book_ids sin mean', { tag: '@regression' }, async ({ bookReviewsClient }) => {
    const response = await bookReviewsClient.query({ book_ids: [reviewBooks.first.id, reviewBooks.second.id].join(',') });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Not Found' } });
  });
});
