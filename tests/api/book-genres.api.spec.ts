import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { bookGenreSchema, bookGenreListSchema } from '@src/sut/schemas';
import { knownBookGenreId, missingBookCatalogId } from '@src/sut/data/book-catalogs';

test.describe('GET /api/book-genres', () => {
  test('devuelve el catálogo de géneros sin autorización', { tag: '@smoke' }, async ({ bookGenresClient }) => {
    const response = await bookGenresClient.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookGenreListSchema, body);
    expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: knownBookGenreId })]));
  });
});

test.describe('GET /api/book-genres/:id', () => {
  test('devuelve el género solicitado y coincide con el catálogo', { tag: '@regression' }, async ({ bookGenresClient }) => {
    const response = await bookGenresClient.getById(knownBookGenreId);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookGenreSchema, body);
    expect(body.id).toBe(knownBookGenreId);
    const listed = await bookGenresClient.list();
    expect(listed.status()).toBe(200);
    expect(await listed.json()).toEqual(expect.arrayContaining([body]));
  });

  test('devuelve 404 si el género no existe', { tag: '@regression' }, async ({ bookGenresClient }) => {
    const response = await bookGenresClient.getById(missingBookCatalogId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});
