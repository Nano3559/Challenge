import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { BooksClient } from '@src/sut/api/books.client';
import { BookShopAccountsClient } from '@src/sut/api/book-shop-accounts.client';
import { AuthClient } from '@src/sut/api/auth.client';
import { UsersClient } from '@src/sut/api/users.client';
import { buildUser } from '@src/sut/data/users';
import { bookCollections, bookRequiredFields, bookUpdates, buildBook, buildBookWithout, malformedBookJson, missingBookId, type BookCollection, type BookCreate } from '@src/sut/data/books';
import { bookSchema, bookListSchema, bookShopAccountSchema, loginResponseSchema } from '@src/sut/schemas';

test.describe.configure({ mode: 'default' });
type BookRecord = BookCreate & { id: number };

async function withBook(client: BooksClient, run: (book: BookRecord) => Promise<void>) {
  const payload = buildBook();
  const created = await client.create(payload);
  const book = await created.json();
  try {
    expect(created.status()).toBe(201);
    expectSchema(bookSchema, book);
    expect(book).toMatchObject({ ...payload, cover: expect.stringContaining(payload.cover) });
    await run(book);
  } finally {
    expect((await client.deleteById(book.id)).status()).toBe(200);
    // GAD conserva los libros inactivos en GET; comprobar la baja lógica explícita.
    const deleted = await client.getById(book.id);
    expect(deleted.status()).toBe(200);
    expect(await deleted.json()).toMatchObject({ id: book.id, _inactive: true });
  }
}

async function expectBookPreserved(client: BooksClient, book: BookRecord) {
  const response = await client.getById(book.id);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(book);
}

async function withUserWithoutShop(
  users: UsersClient, auth: AuthClient,
  usersForToken: (token: string) => UsersClient,
  booksForToken: (token: string) => BooksClient,
  run: (client: BooksClient) => Promise<void>,
) {
  const payload = buildUser();
  const created = await users.create(payload);
  const user = await created.json();
  const login = await auth.login(payload);
  expect(login.status()).toBe(200);
  const body = await login.json();
  expectSchema(loginResponseSchema, body);
  const owner = usersForToken(body.access_token);
  try {
    expect(created.status()).toBe(201);
    await run(booksForToken(body.access_token));
  } finally {
    expect((await owner.deleteById(user.id)).status()).toBe(200);
    expect((await users.getById(user.id)).status()).toBe(404);
  }
}

async function restoreCollection(
  client: BooksClient, account: BookShopAccountsClient, collection: BookCollection, id: number,
) {
  const response = await account.getCurrent();
  expect(response.status()).toBe(200);
  const body = await response.json();
  if (body[bookCollections[collection]].map(String).includes(String(id))) {
    expect((await client.toggle(collection, id)).status()).toBe(200);
  }
}

test.describe('GET /api/books', () => {
  test('devuelve el catálogo con el contrato de libros', { tag: '@smoke' }, async ({ booksClient }) => {
    const response = await booksClient.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookListSchema, body);
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('POST /api/books', () => {
  test('crea un libro propio y permite consultarlo', { tag: '@regression' }, async ({ managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await managerBooksClient.getById(book.id);
      expect(response.status()).toBe(200);
      expectSchema(bookSchema, await response.json());
    });
  });

  for (const field of bookRequiredFields) {
    test(`devuelve 422 si falta ${field}`, { tag: '@regression' }, async ({ managerBooksClient }) => {
      const response = await managerBooksClient.create(buildBookWithout(field));
      expect(response.status()).toBe(422);
      expect(await response.json()).toEqual({ error: { message: 'One of mandatory field is missing', details: bookRequiredFields } });
    });
  }

  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ booksClient }) => {
    const response = await booksClient.create(buildBook());
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 401 para un lector sin permiso de gestión', { tag: '@regression' }, async ({ readerBooksClient }) => {
    const response = await readerBooksClient.create(buildBook());
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'User does not have a permission' } });
  });

  test('devuelve 400 con JSON malformado', { tag: '@regression' }, async ({ managerBooksClient }) => {
    const response = await managerBooksClient.createFromRawJson(malformedBookJson);
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: 'SyntaxError: Unexpected data in JSON. Please check Your JSON.', details: malformedBookJson });
  });
});

test.describe('GET /api/book-shop-manage/books-without-items', () => {
  test('incluye un libro propio que aún no tiene inventario', { tag: '@regression' }, async ({ managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await managerBooksClient.listWithoutItems();
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookListSchema, body);
      expect(body).toEqual(expect.arrayContaining([book]));
    });
  });

  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ booksClient }) => {
    const response = await booksClient.listWithoutItems();
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });
});

test.describe('PATCH /api/books/:id', () => {
  test('actualiza título y descripción y persiste los cambios', { tag: '@regression' }, async ({ managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await managerBooksClient.patchById(book.id, bookUpdates);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookSchema, body);
      expect(body).toEqual({ ...book, ...bookUpdates });
      const persisted = await managerBooksClient.getById(book.id);
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(body);
    });
  });

  test('devuelve 401 sin autorización y conserva el libro', { tag: '@regression' }, async ({ booksClient, managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await booksClient.patchById(book.id, bookUpdates);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
      await expectBookPreserved(managerBooksClient, book);
    });
  });

  test('devuelve 401 sin permiso de gestión y conserva el libro', { tag: '@regression' }, async ({ readerBooksClient, managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await readerBooksClient.patchById(book.id, bookUpdates);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'User does not have a permission' } });
      await expectBookPreserved(managerBooksClient, book);
    });
  });

  test('devuelve 404 si el libro no existe', { tag: '@regression' }, async ({ managerBooksClient }) => {
    const response = await managerBooksClient.patchById(missingBookId, bookUpdates);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Book not found' } });
  });

  test('devuelve 400 con cuerpo vacío y conserva el libro', { tag: '@regression' }, async ({ managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await managerBooksClient.patchById(book.id, {});
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ error: { message: 'No updates provided' } });
      await expectBookPreserved(managerBooksClient, book);
    });
  });

  test('devuelve 400 con JSON malformado y conserva el libro', { tag: '@regression' }, async ({ managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await managerBooksClient.patchFromRawJson(book.id, malformedBookJson);
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ error: 'SyntaxError: Unexpected data in JSON. Please check Your JSON.', details: malformedBookJson });
      await expectBookPreserved(managerBooksClient, book);
    });
  });

  test('rechaza active con 422 y conserva el libro', { tag: '@regression' }, async ({ managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await managerBooksClient.patchById(book.id, { active: false });
      expect(response.status()).toBe(422);
      expect(await response.json()).toMatchObject({ error: { message: 'Additional fields provided' } });
      await expectBookPreserved(managerBooksClient, book);
    });
  });
});

for (const collection of Object.keys(bookCollections) as BookCollection[]) {
  test.describe(`POST /api/books/${collection}/:id`, () => {
    test('permite al lector agregar y quitar un libro restaurando su cuenta', { tag: '@regression' }, async ({ managerBooksClient, readerBooksClient, readerBookShopAccount }) => {
      await withBook(managerBooksClient, async (book) => {
        const before = await readerBookShopAccount.getCurrent();
        expect(before.status()).toBe(200);
        const snapshot = await before.json();
        expectSchema(bookShopAccountSchema, snapshot);
        try {
          const added = await readerBooksClient.toggle(collection, book.id);
          expect(added.status()).toBe(200);
          const body = await added.json();
          expectSchema(bookShopAccountSchema, body);
          expect(body[bookCollections[collection]].map(String)).toContain(String(book.id));
          const persisted = await readerBookShopAccount.getCurrent();
          expect(persisted.status()).toBe(200);
          expect(await persisted.json()).toEqual(body);

          const removed = await readerBooksClient.toggle(collection, book.id);
          expect(removed.status()).toBe(200);
          expect(await removed.json()).toEqual(snapshot);
        } finally {
          await restoreCollection(readerBooksClient, readerBookShopAccount, collection, book.id);
          const restored = await readerBookShopAccount.getCurrent();
          expect(restored.status()).toBe(200);
          expect(await restored.json()).toEqual(snapshot);
        }
      });
    });

    test('devuelve 401 sin token', { tag: '@regression' }, async ({ booksClient }) => {
      const response = await booksClient.toggle(collection, missingBookId);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
    });

    test('devuelve 404 si el libro no existe y conserva la cuenta', { tag: '@regression' }, async ({ managerBooksClient, managerBookShopAccount }) => {
      const before = await managerBookShopAccount.getCurrent();
      expect(before.status()).toBe(200);
      const snapshot = await before.json();
      const response = await managerBooksClient.toggle(collection, missingBookId);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'Book not found' } });
      const after = await managerBookShopAccount.getCurrent();
      expect(after.status()).toBe(200);
      expect(await after.json()).toEqual(snapshot);
    });

    test('devuelve 404 si el usuario no tiene cuenta de librería', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken, booksClientForToken }) => {
      await withUserWithoutShop(usersClient, authClient, usersClientForToken, booksClientForToken, async (client) => {
        const response = await client.toggle(collection, missingBookId);
        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
      });
    });
  });
}

test.describe('DELETE /api/books/:id', () => {
  test('devuelve 401 sin autorización y conserva el libro', { tag: '@regression' }, async ({ booksClient, managerBooksClient }) => {
    await withBook(managerBooksClient, async (book) => {
      const response = await booksClient.deleteById(book.id);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
      await expectBookPreserved(managerBooksClient, book);
    });
  });

  test('devuelve 404 si el libro no existe', { tag: '@regression' }, async ({ managerBooksClient }) => {
    const response = await managerBooksClient.deleteById(missingBookId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Book not found' } });
  });
});
