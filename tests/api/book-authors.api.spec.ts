import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { bookAuthorSchema, bookAuthorListSchema } from '@src/sut/schemas';
import { knownBookAuthorId, missingBookCatalogId } from '@src/sut/data/book-catalogs';

test.describe('GET /api/book-authors', () => {
  test('devuelve el catálogo de autores sin autorización', { tag: '@smoke' }, async ({ bookAuthorsClient }) => {
    const response = await bookAuthorsClient.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookAuthorListSchema, body);
    expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: knownBookAuthorId })]));
  });
});

test.describe('GET /api/book-authors/:id', () => {
  test('devuelve el autor solicitado y coincide con el catálogo', { tag: '@regression' }, async ({ bookAuthorsClient }) => {
    const response = await bookAuthorsClient.getById(knownBookAuthorId);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookAuthorSchema, body);
    expect(body.id).toBe(knownBookAuthorId);
    const listed = await bookAuthorsClient.list();
    expect(listed.status()).toBe(200);
    expect(await listed.json()).toEqual(expect.arrayContaining([body]));
  });

  test('devuelve 404 si el autor no existe', { tag: '@regression' }, async ({ bookAuthorsClient }) => {
    const response = await bookAuthorsClient.getById(missingBookCatalogId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});
