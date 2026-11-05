import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { BookShopAccountsClient } from '@src/sut/api/book-shop-accounts.client';
import { UsersClient } from '@src/sut/api/users.client';
import { AuthClient } from '@src/sut/api/auth.client';
import { buildUser } from '@src/sut/data/users';
import { missingShopAccountId, shopAddress, invalidShopAddress, shopRoleSelection, type ShopAddress } from '@src/sut/data/book-shop-accounts';
import { bookShopAccountSchema, bookCollectionsSchema, bookShopAuthorizationSchema, loginResponseSchema } from '@src/sut/schemas';

test.describe.configure({ mode: 'default' });
type Snapshot = Required<ShopAddress> & { id: number; user_id: number; role_id: number };

async function snapshot(client: BookShopAccountsClient): Promise<Snapshot> {
  const response = await client.getCurrent();
  expect(response.status()).toBe(200);
  const body = await response.json();
  expectSchema(bookShopAccountSchema, body);
  for (const field of Object.keys(shopAddress)) expect(typeof body[field]).toBe('string');
  return body;
}

async function expectUnchanged(client: BookShopAccountsClient, before: Snapshot) {
  expect(await snapshot(client)).toEqual(before);
}

async function withoutShop(
  users: UsersClient, auth: AuthClient, usersForToken: (token: string) => UsersClient,
  accountsForToken: (token: string) => BookShopAccountsClient,
  run: (accounts: BookShopAccountsClient) => Promise<void>,
) {
  const payload = buildUser();
  const created = await users.create(payload);
  const user = await created.json();
  const login = await auth.login(payload);
  expect(login.status()).toBe(200);
  const session = await login.json();
  expectSchema(loginResponseSchema, session);
  try {
    expect(created.status()).toBe(201);
    await run(accountsForToken(session.access_token));
  } finally {
    expect((await usersForToken(session.access_token).deleteById(user.id)).status()).toBe(200);
    expect((await users.getById(user.id)).status()).toBe(404);
  }
}

test.describe('GET /api/book-shop-accounts', () => {
  test('devuelve 404 sin token', { tag: '@regression' }, async ({ bookShopAccountsClient }) => {
    const response = await bookShopAccountsClient.getCurrent();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Not Found' } });
  });

  test('devuelve 404 con token inválido', { tag: '@regression' }, async ({ bookShopAccountsForToken }) => {
    const response = await bookShopAccountsForToken('invalid-token').getCurrent();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Not Found' } });
  });

  test('devuelve 404 para usuario sin cuenta de tienda', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken, bookShopAccountsForToken }) => {
    await withoutShop(usersClient, authClient, usersClientForToken, bookShopAccountsForToken, async (client) => {
      const response = await client.getCurrent();
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
    });
  });
});

test.describe('POST /api/book-shop-accounts', () => {
  test('crea cuenta con valores iniciales en una base desechable', { tag: '@regression' }, async ({ accountSandbox }) => {
    const payload = buildUser();
    const createdUser = await accountSandbox.users.create(payload);
    expect(createdUser.status()).toBe(201);
    const user = await createdUser.json();
    const login = await accountSandbox.auth.login(payload);
    expect(login.status()).toBe(200);
    const credentials = await login.json();
    expectSchema(loginResponseSchema, credentials);
    const client = accountSandbox.forToken(credentials.access_token);
    const response = await client.create();
    expect(response.status()).toBe(201);
    const body = await response.json();
    expectSchema(bookShopAccountSchema, body);
    expect(body).toMatchObject({
      user_id: user.id, role_id: 2, funds: 10000,
      wishlist_books_ids: [], read_books_ids: [], owned_books_ids: [], purchased_book_ids: [], favorite_books_ids: [],
      country: '', city: '', street: '', postal_code: '',
    });
    expect(Number.isNaN(Date.parse(body.created_at))).toBe(false);
    const persisted = await client.getCurrent();
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual(body);
    // La fixture detiene la instancia y elimina la copia completa, con cuenta y propietario juntos.
  });

  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ bookShopAccountsClient }) => {
    const response = await bookShopAccountsClient.create();
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 409 si la cuenta ya existe y la conserva', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const before = await snapshot(readerBookShopAccount);
    const response = await readerBookShopAccount.create();
    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ error: { message: 'User already has a book shop account' } });
    await expectUnchanged(readerBookShopAccount, before);
  });
});

test.describe('GET /api/book-shop-accounts/my-books', () => {
  test('devuelve las colecciones personales de la cuenta', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const account = await snapshot(readerBookShopAccount);
    const response = await readerBookShopAccount.getMyBooks();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookCollectionsSchema, body);
    expect(body).toEqual(bookCollectionsSchema.parse(account));
  });

  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ bookShopAccountsClient }) => {
    const response = await bookShopAccountsClient.getMyBooks();
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 404 sin cuenta de tienda', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken, bookShopAccountsForToken }) => {
    await withoutShop(usersClient, authClient, usersClientForToken, bookShopAccountsForToken, async (client) => {
      const response = await client.getMyBooks();
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
    });
  });
});

test.describe('GET /api/book-shop-accounts/:id', () => {
  test('devuelve la cuenta de su propietario', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const before = await snapshot(readerBookShopAccount);
    const response = await readerBookShopAccount.getById(before.id);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopAccountSchema, body);
    expect(body).toEqual(before);
  });

  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ readerBookShopAccount, bookShopAccountsClient }) => {
    const before = await snapshot(readerBookShopAccount);
    const response = await bookShopAccountsClient.getById(before.id);
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 404 para una cuenta inexistente', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const response = await readerBookShopAccount.getById(missingShopAccountId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 404 para una cuenta ajena', { tag: '@regression' }, async ({ readerBookShopAccount, managerBookShopAccount }) => {
    const other = await snapshot(managerBookShopAccount);
    const response = await readerBookShopAccount.getById(other.id);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });
});

test.describe('PATCH /api/book-shop-accounts/:id', () => {
  test('actualiza dirección, persiste y restaura la cuenta completa', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const before = await snapshot(readerBookShopAccount);
    try {
      const response = await readerBookShopAccount.updateById(before.id, shopAddress);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopAccountSchema, body);
      expect(body).toEqual({ ...before, ...shopAddress });
      const persisted = await readerBookShopAccount.getById(before.id);
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(body);
    } finally {
      const { country, city, street, postal_code } = before;
      const restored = await readerBookShopAccount.updateById(before.id, { country, city, street, postal_code });
      expect(restored.status()).toBe(200);
      await expectUnchanged(readerBookShopAccount, before);
    }
  });

  test('devuelve 401 sin autorización y conserva la cuenta', { tag: '@regression' }, async ({ readerBookShopAccount, bookShopAccountsClient }) => {
    const before = await snapshot(readerBookShopAccount);
    const response = await bookShopAccountsClient.updateById(before.id, shopAddress);
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
    await expectUnchanged(readerBookShopAccount, before);
  });

  for (const [name, payload] of Object.entries({ 'cuerpo vacío': {}, 'campo demasiado largo': invalidShopAddress, 'cambio de rol': { role_id: 1 } })) {
    test(`devuelve 403 con ${name} y conserva la cuenta`, { tag: '@regression' }, async ({ readerBookShopAccount }) => {
      const before = await snapshot(readerBookShopAccount);
      const response = await readerBookShopAccount.updateById(before.id, payload);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body).toMatchObject({ error: { message: expect.any(String) } });
      await expectUnchanged(readerBookShopAccount, before);
    });
  }

  test('devuelve 404 para una cuenta inexistente', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const response = await readerBookShopAccount.updateById(missingShopAccountId, shopAddress);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 404 para una cuenta ajena y la conserva', { tag: '@regression' }, async ({ readerBookShopAccount, managerBookShopAccount }) => {
    const other = await snapshot(managerBookShopAccount);
    const response = await readerBookShopAccount.updateById(other.id, shopAddress);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
    await expectUnchanged(managerBookShopAccount, other);
  });
});

test.describe('POST /api/book-shop-authorize', () => {
  test('autoriza el rol del lector y devuelve su identidad', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const account = await snapshot(readerBookShopAccount);
    const response = await readerBookShopAccount.authorize(shopRoleSelection.allowed);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopAuthorizationSchema, body);
    expect(body).toEqual({ id: account.id, user_id: account.user_id, role_id: account.role_id });
  });

  test('autoriza sin filtro de roles', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const response = await readerBookShopAccount.authorize();
    expect(response.status()).toBe(200);
    expectSchema(bookShopAuthorizationSchema, await response.json());
  });

  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ bookShopAccountsClient }) => {
    const response = await bookShopAccountsClient.authorize(shopRoleSelection.allowed);
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });

  test('devuelve 403 si no tiene el rol requerido', { tag: '@regression' }, async ({ readerBookShopAccount }) => {
    const response = await readerBookShopAccount.authorize(shopRoleSelection.denied);
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ error: { message: 'User does not have the required role' } });
  });

  test('devuelve 404 sin cuenta de tienda', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken, bookShopAccountsForToken }) => {
    await withoutShop(usersClient, authClient, usersClientForToken, bookShopAccountsForToken, async (client) => {
      const response = await client.authorize(shopRoleSelection.allowed);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
    });
  });
});
