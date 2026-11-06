import { test, expect, type InventorySandbox } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { BookShopItemsClient } from '@src/sut/api/book-shop-items.client';
import { buildBook, missingBookId } from '@src/sut/data/books';
import { buildUser } from '@src/sut/data/users';
import { itemValues, updatedItemValues, itemBoundaries, invalidItemValues, missingShopItemId, type ItemValues } from '@src/sut/data/book-shop-items';
import { bookSchema, bookShopItemSchema, bookShopItemListSchema, loginResponseSchema } from '@src/sut/schemas';

test.describe.configure({ mode: 'default' });
type Item = { id: number; book_id: number; price: number; quantity: number; created_at: string };

async function withBook(sandbox: InventorySandbox, run: (bookId: number) => Promise<void>) {
  const created = await sandbox.books.create(buildBook());
  const book = await created.json();
  try {
    expect(created.status()).toBe(201);
    expectSchema(bookSchema, book);
    await run(book.id);
  } finally {
    expect((await sandbox.books.deleteById(book.id)).status()).toBe(200);
    const deleted = await sandbox.books.getById(book.id);
    expect(deleted.status()).toBe(200);
    expect(await deleted.json()).toMatchObject({ id: book.id, _inactive: true });
  }
}

async function expectHidden(sandbox: InventorySandbox, item: Item) {
  const managed = await sandbox.manager.listManaged();
  expect(managed.status()).toBe(200);
  expect(await managed.json()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id })]));
  const publicList = await sandbox.reader.list();
  expect(publicList.status()).toBe(200);
  expect(await publicList.json()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id })]));
}

async function withItem(sandbox: InventorySandbox, run: (item: Item) => Promise<void>, values: ItemValues = itemValues) {
  await withBook(sandbox, async (bookId) => {
    const created = await sandbox.manager.create({ book_id: bookId, ...values });
    const item = await created.json();
    try {
      expect(created.status()).toBe(201);
      expectSchema(bookShopItemSchema, item);
      expect(item).toMatchObject({ book_id: bookId, ...values });
      await run(item);
    } finally {
      // El endpoint permite baja lógica; la copia completa se descarta al terminar el worker.
      // El caso positivo de DELETE puede haberlo dado de baja antes del finally.
      const cleanup = await sandbox.manager.deleteById(item.id);
      expect([200, 404]).toContain(cleanup.status());
      const deleted = await sandbox.manager.findByBookId(bookId);
      expect(deleted.status()).toBe(404);
      expect(await deleted.json()).toEqual({ error: { message: 'Item not found' } });
      await expectHidden(sandbox, item);
    }
  });
}

async function expectPreserved(client: BookShopItemsClient, item: Item) {
  const response = await client.findByBookId(item.book_id);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(item);
}

async function withoutShop(sandbox: InventorySandbox, run: (client: BookShopItemsClient) => Promise<void>) {
  const payload = buildUser();
  const created = await sandbox.users.create(payload);
  const user = await created.json();
  const login = await sandbox.auth.login(payload);
  expect(login.status()).toBe(200);
  const session = await login.json();
  expectSchema(loginResponseSchema, session);
  try {
    expect(created.status()).toBe(201);
    await run(sandbox.forToken(session.access_token));
  } finally {
    expect((await sandbox.usersForToken(session.access_token).deleteById(user.id)).status()).toBe(200);
    expect((await sandbox.users.getById(user.id)).status()).toBe(404);
  }
}

test.describe('GET /api/book-shop-items', () => {
  test('permite al lector consultar inventario activo', { tag: '@smoke' }, async ({ inventorySandbox: sandbox }) => {
    await withItem(sandbox, async (item) => {
      const response = await sandbox.reader.list();
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopItemListSchema, body);
      expect(body).toEqual(expect.arrayContaining([item]));
    });
  });

  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    const response = await sandbox.anonymous.list();
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 404 si el usuario no tiene cuenta de tienda', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    await withoutShop(sandbox, async (client) => {
      const response = await client.list();
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
    });
  });
});

test.describe('GET /api/book-shop-manage/items', () => {
  test('permite al gestor listar el ítem propio', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    await withItem(sandbox, async (item) => {
      const response = await sandbox.manager.listManaged();
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopItemListSchema, body);
      expect(body).toEqual(expect.arrayContaining([item]));
    });
  });

  for (const role of ['anonymous', 'reader'] as const) {
    test(`devuelve 401 con ${role}`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      const response = await sandbox[role].listManaged();
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: role === 'anonymous' ? 'Access token for given user is invalid!' : 'User does not have a permission' } });
    });
  }
});

test.describe('POST /api/book-shop-manage/items', () => {
  test('crea inventario para un libro propio y permite consultarlo', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    await withItem(sandbox, async (item) => {
      const response = await sandbox.manager.findByBookId(item.book_id);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopItemSchema, body);
      expect(body).toEqual(item);
    });
  });

  for (const values of itemBoundaries) {
    test(`acepta límites price=${values.price}, quantity=${values.quantity}`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      await withItem(sandbox, async (item) => {
        expect(item).toMatchObject(values);
      }, values);
    });
  }

  test('devuelve 409 al duplicar inventario del mismo libro', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    await withItem(sandbox, async (item) => {
      const response = await sandbox.manager.create({ book_id: item.book_id, ...itemValues });
      expect(response.status()).toBe(409);
      expect(await response.json()).toEqual({ error: { message: 'Item already exists' } });
      await expectPreserved(sandbox.manager, item);
    });
  });

  for (const [name, payload] of Object.entries({ 'libro inexistente': { book_id: missingBookId, ...itemValues }, 'libro ausente': itemValues })) {
    test(`devuelve 404 con ${name}`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      const response = await sandbox.manager.create(payload);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'Book not found' } });
    });
  }

  for (const role of ['anonymous', 'reader'] as const) {
    test(`devuelve 401 con ${role}`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      const response = await sandbox[role].create({ book_id: missingBookId, ...itemValues });
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: role === 'anonymous' ? 'Access token for given user is invalid!' : 'User does not have a permission' } });
    });
  }

  for (const invalid of invalidItemValues) {
    test(`devuelve 422 con ${invalid.name}`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      await withBook(sandbox, async (bookId) => {
        const response = await sandbox.manager.create({ book_id: bookId, ...invalid.payload });
        expect(response.status()).toBe(422);
        expect(await response.json()).toEqual({ error: { message: invalid.message } });
      });
    });
  }
});

test.describe('PATCH /api/book-shop-manage/items/:id', () => {
  test('actualiza precio y cantidad y persiste el cambio', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    await withItem(sandbox, async (item) => {
      const response = await sandbox.manager.updateById(item.id, updatedItemValues);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopItemSchema, body);
      expect(body).toEqual({ ...item, ...updatedItemValues });
      await expectPreserved(sandbox.manager, body);
    });
  });

  for (const role of ['anonymous', 'reader'] as const) {
    test(`devuelve 401 con ${role} y conserva el ítem`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      await withItem(sandbox, async (item) => {
        const response = await sandbox[role].updateById(item.id, updatedItemValues);
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: { message: role === 'anonymous' ? 'Access token for given user is invalid!' : 'User does not have a permission' } });
        await expectPreserved(sandbox.manager, item);
      });
    });
  }

  test('devuelve 404 si el ítem no existe', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    const response = await sandbox.manager.updateById(missingShopItemId, updatedItemValues);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Item not found' } });
  });

  for (const invalid of invalidItemValues) {
    test(`devuelve 422 con ${invalid.name} y conserva el ítem`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      await withItem(sandbox, async (item) => {
        const response = await sandbox.manager.updateById(item.id, invalid.payload);
        expect(response.status()).toBe(422);
        expect(await response.json()).toEqual({ error: { message: invalid.message } });
        await expectPreserved(sandbox.manager, item);
      });
    });
  }
});

test.describe('DELETE /api/book-shop-manage/items/:id', () => {
  test('da de baja el ítem y lo excluye de los listados', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    await withItem(sandbox, async (item) => {
      const response = await sandbox.manager.deleteById(item.id);
      expect(response.status()).toBe(200);
      expect(await response.json()).toMatchObject({ id: item.id, _inactive: true });
      await expectHidden(sandbox, item);
    });
  });

  for (const role of ['anonymous', 'reader'] as const) {
    test(`devuelve 401 con ${role} y conserva el ítem`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      await withItem(sandbox, async (item) => {
        const response = await sandbox[role].deleteById(item.id);
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: { message: role === 'anonymous' ? 'Access token for given user is invalid!' : 'User does not have a permission' } });
        await expectPreserved(sandbox.manager, item);
      });
    });
  }

  test('devuelve 404 si el ítem no existe', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    const response = await sandbox.manager.deleteById(missingShopItemId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Item not found' } });
  });
});

test.describe('GET /api/book-shop-manage/items/by-book/:bookId', () => {
  test('la ruta por path devuelve 200 pero no filtra por bookId', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    const response = await sandbox.manager.getByBookId(missingBookId);
    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  for (const role of ['anonymous', 'reader'] as const) {
    test(`devuelve 401 con ${role}`, { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
      const response = await sandbox[role].getByBookId(missingBookId);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: role === 'anonymous' ? 'Access token for given user is invalid!' : 'User does not have a permission' } });
    });
  }
});

test.describe('GET /api/book-shop-manage/items?book_id', () => {
  test('devuelve 404 si no hay inventario para el libro', { tag: '@regression' }, async ({ inventorySandbox: sandbox }) => {
    const response = await sandbox.manager.findByBookId(missingBookId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Item not found' } });
  });
});
