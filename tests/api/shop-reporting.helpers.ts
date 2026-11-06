import { expect, type OrderSandbox } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { buildUser } from '@src/sut/data/users';
import { buildBook } from '@src/sut/data/books';
import { reportingStock } from '@src/sut/data/book-shop-reporting';
import { bookShopAccountSchema, bookShopOrderSchema, loginResponseSchema } from '@src/sut/schemas';

export async function reportingBuyer(sandbox: OrderSandbox) {
  const payload = buildUser();
  const response = await sandbox.users.create(payload);
  expect(response.status()).toBe(201);
  const user = await response.json();
  const login = await sandbox.auth.login(payload);
  expect(login.status()).toBe(200);
  const session = await login.json();
  expectSchema(loginResponseSchema, session);
  const accountClient = sandbox.accountsForToken(session.access_token);
  const accountResponse = await accountClient.create();
  expect(accountResponse.status()).toBe(201);
  const account = await accountResponse.json();
  expectSchema(bookShopAccountSchema, account);
  return { user, payload, account, accountClient, token: session.access_token, orders: sandbox.forToken(session.access_token) };
}

export async function reportingOrder(sandbox: OrderSandbox, buyer: Awaited<ReturnType<typeof reportingBuyer>>) {
  const bookResponse = await sandbox.books.create(buildBook());
  expect(bookResponse.status()).toBe(201);
  const book = await bookResponse.json();
  expect((await sandbox.items.create({ book_id: book.id, ...reportingStock })).status()).toBe(201);
  const response = await buyer.orders.addItem(book.id);
  expect(response.status()).toBe(201);
  const order = await response.json();
  expectSchema(bookShopOrderSchema, order);
  return { book, order };
}
