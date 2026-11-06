import { test, expect } from '@src/sut/fixtures';
import { buildUser } from '@src/sut/data/users';
import { buildBook } from '@src/sut/data/books';
import { orderStock } from '@src/sut/data/book-shop-orders';
import { expectSchema } from '@src/core';
import { loginResponseSchema, bookShopOrderSchema } from '@src/sut/schemas';

// Caracterización de una ruta ausente: no acredita altas/bajas funcionales de ítems.
test.describe('Ruta OpenAPI /book-shop-order-items no implementada', () => {
  for (const method of ['add', 'remove'] as const) {
    test(`${method}: responde 404 anónimo`, { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
      const response = await sandbox.anonymousOrderItems[method](1);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({});
    });

    test(`${method}: responde 404 con comprador válido y conserva su pedido`, { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
      const payload = buildUser();
      expect((await sandbox.users.create(payload)).status()).toBe(201);
      const login = await sandbox.auth.login(payload);
      expect(login.status()).toBe(200);
      const session = await login.json();
      expectSchema(loginResponseSchema, session);
      expect((await sandbox.accountsForToken(session.access_token).create()).status()).toBe(201);
      const bookResponse = await sandbox.books.create(buildBook());
      expect(bookResponse.status()).toBe(201);
      const book = await bookResponse.json();
      expect((await sandbox.items.create({ book_id: book.id, ...orderStock })).status()).toBe(201);
      const orders = sandbox.forToken(session.access_token);
      const created = await orders.addItem(book.id);
      expect(created.status()).toBe(201);
      const before = await created.json();
      expectSchema(bookShopOrderSchema, before);

      const response = await sandbox.orderItemsForToken(session.access_token)[method](book.id);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({});
      const after = await orders.getById(before.id);
      expect(after.status()).toBe(200);
      expect(await after.json()).toEqual(before);
    });
  }
});
