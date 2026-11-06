import { test, expect, type OrderSandbox } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { BookShopOrdersClient } from '@src/sut/api/book-shop-orders.client';
import { BookShopAccountsClient } from '@src/sut/api/book-shop-accounts.client';
import { buildUser } from '@src/sut/data/users';
import { buildBook, missingBookId } from '@src/sut/data/books';
import { orderStatus, missingOrderId, invalidOrderStatus, orderStock, expensiveOrderStock, emptyOrderStock, shippingCost, orderCoupons } from '@src/sut/data/book-shop-orders';
import { bookShopOrderSchema, bookShopOrderListSchema, bookShopAccountSchema, bookShopItemSchema, bookSchema, loginResponseSchema } from '@src/sut/schemas';
import type { z } from 'zod';

test.describe.configure({ mode: 'default' });
type Order = z.infer<typeof bookShopOrderSchema>;
type Buyer = { id: number; orders: BookShopOrdersClient; account: BookShopAccountsClient };

async function buyer(sandbox: OrderSandbox, withAccount = true): Promise<Buyer> {
  const payload = buildUser();
  const created = await sandbox.users.create(payload);
  expect(created.status()).toBe(201);
  const user = await created.json();
  const login = await sandbox.auth.login(payload);
  expect(login.status()).toBe(200);
  const session = await login.json();
  expectSchema(loginResponseSchema, session);
  const account = sandbox.accountsForToken(session.access_token);
  if (withAccount) {
    const createdAccount = await account.create();
    expect(createdAccount.status()).toBe(201);
    expectSchema(bookShopAccountSchema, await createdAccount.json());
  }
  // Cliente, cuenta y pedidos se descartan juntos al eliminar la base aislada del worker.
  return { id: user.id, orders: sandbox.forToken(session.access_token), account };
}

async function stock(sandbox: OrderSandbox, values = orderStock) {
  const created = await sandbox.books.create(buildBook());
  expect(created.status()).toBe(201);
  const book = await created.json();
  expectSchema(bookSchema, book);
  const response = await sandbox.items.create({ book_id: book.id, ...values });
  expect(response.status()).toBe(201);
  const item = await response.json();
  expectSchema(bookShopItemSchema, item);
  return { book, item };
}

async function emptyOrder(owner: Buyer): Promise<Order> {
  const response = await owner.orders.create();
  expect(response.status()).toBe(201);
  const body = await response.json();
  expectSchema(bookShopOrderSchema, body);
  expect(body).toMatchObject({ user_id: owner.id, status_id: orderStatus.new, book_ids: [], books_cost: {}, partial_costs: {}, total_cost: 0 });
  return body;
}

async function filledOrder(sandbox: OrderSandbox, owner: Buyer, values = orderStock) {
  const inventory = await stock(sandbox, values);
  const response = await owner.orders.addItem(inventory.book.id);
  expect(response.status()).toBe(201);
  const order = await response.json();
  expectSchema(bookShopOrderSchema, order);
  expect(order).toMatchObject({ user_id: owner.id, book_ids: [inventory.book.id], total_cost: values.price + shippingCost });
  return { ...inventory, order: order as Order };
}

async function expectOrder(client: BookShopOrdersClient, expected: Order) {
  const response = await client.getById(expected.id);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expectSchema(bookShopOrderSchema, body);
  expect(body).toEqual(expected);
}

function unauthorized(call: (client: BookShopOrdersClient) => ReturnType<BookShopOrdersClient['list']>) {
  test('devuelve 401 sin autorización', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const response = await call(sandbox.anonymous);
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
  });
}

test.describe('GET /api/book-shop-orders', () => {
  test('lista solo los pedidos del comprador', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    const response = await owner.orders.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopOrderListSchema, body);
    expect(body).toEqual([order]);
  });

  test('devuelve lista vacía para un comprador sin pedidos', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const response = await owner.orders.list();
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  unauthorized((client) => client.list());

  test('devuelve 404 si el usuario no tiene cuenta de tienda', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox, false);
    const response = await owner.orders.list();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
  });
});

test.describe('POST /api/book-shop-orders', () => {
  test('crea un pedido vacío y persiste sus valores iniciales', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    await expectOrder(owner.orders, order);
    expect(order.total_cost).toBe(0);
  });

  test('devuelve 409 si ya hay un pedido activo', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    const response = await owner.orders.create();
    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ error: { message: 'User already has an active order. Complete or cancel it first.' } });
    await expectOrder(owner.orders, order);
  });

  unauthorized((client) => client.create());
});

test.describe('POST /api/book-shop-orders/items', () => {
  test('crea automáticamente el pedido al agregar su primer libro', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order, item, book } = await filledOrder(sandbox, owner);
    expect(order.books_cost).toEqual({ [book.id]: item.price });
    expect(order.partial_costs).toEqual({ shipping: shippingCost, books: item.price });
    await expectOrder(owner.orders, order);
  });

  test('agrega un segundo libro y recalcula costos', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const first = await filledOrder(sandbox, owner);
    const second = await stock(sandbox);
    const response = await owner.orders.addItem(second.book.id);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopOrderSchema, body);
    expect(body.book_ids).toEqual([first.book.id, second.book.id]);
    expect(body.total_cost).toBe(first.item.price + second.item.price + shippingCost);
    await expectOrder(owner.orders, body);
  });

  test('devuelve 409 si el libro ya está en el pedido', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order, book } = await filledOrder(sandbox, owner);
    const response = await owner.orders.addItem(book.id);
    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ error: { message: 'Item already in order' } });
    await expectOrder(owner.orders, order);
  });

  test('devuelve 409 si el stock es cero', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { book } = await stock(sandbox, emptyOrderStock);
    const response = await owner.orders.addItem(book.id);
    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ error: { message: 'Item is not in stock' } });
    expect(await (await owner.orders.list()).json()).toEqual([]);
  });

  test('devuelve 404 si no hay inventario para el libro', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const response = await owner.orders.addItem(missingBookId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Item not found for the given book id' } });
  });

  unauthorized((client) => client.addItem(missingBookId));
});

test.describe('DELETE /api/book-shop-orders/items', () => {
  test('retira un libro y recalcula el pedido vacío', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { book } = await filledOrder(sandbox, owner);
    const response = await owner.orders.removeItem(book.id);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopOrderSchema, body);
    expect(body).toMatchObject({ book_ids: [], books_cost: {}, partial_costs: { books: 0 }, total_cost: 0 });
    await expectOrder(owner.orders, body);
  });

  test('devuelve 404 si el libro no pertenece al pedido y lo conserva', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order } = await filledOrder(sandbox, owner);
    const response = await owner.orders.removeItem(missingBookId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Item not found in order' } });
    await expectOrder(owner.orders, order);
  });

  test('devuelve 404 si no hay pedido activo', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const response = await owner.orders.removeItem(missingBookId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Order not found' } });
    const listed = await owner.orders.list();
    expect(listed.status()).toBe(200);
    expect(await listed.json()).toEqual([]);
  });

  unauthorized((client) => client.removeItem(missingBookId));
});

test.describe('PATCH /api/book-shop-orders/:id', () => {
  test('cancela un pedido vacío y permite crear otro', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    const response = await owner.orders.updateStatus(order.id, orderStatus.cancelled);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopOrderSchema, body);
    expect(body.status_id).toBe(orderStatus.cancelled);
    await expectOrder(owner.orders, body);
    const next = await emptyOrder(owner);
    expect(next.id).not.toBe(order.id);
  });

  test('envía el pedido, descuenta fondos una vez y reduce stock', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order, book, item } = await filledOrder(sandbox, owner);
    const funds = (await (await owner.account.getCurrent()).json()).funds;
    const response = await owner.orders.updateStatus(order.id, orderStatus.sent);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopOrderSchema, body);
    expect(body.status_id).toBe(orderStatus.sent);
    await expectOrder(owner.orders, body);
    await expect.poll(async () => (await (await owner.account.getCurrent()).json()).funds).toBe(funds - order.total_cost);
    await expect.poll(async () => (await (await sandbox.items.findByBookId(book.id)).json()).quantity).toBe(item.quantity - 1);
  });

  test('devuelve 409 si la transición no está permitida', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    const response = await owner.orders.updateStatus(order.id, invalidOrderStatus);
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({ error: { message: `Cannot change order status to the requested one: "${invalidOrderStatus}"` } });
    await expectOrder(owner.orders, order);
  });

  test('devuelve 422 al enviar un pedido vacío', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    const response = await owner.orders.updateStatus(order.id, orderStatus.sent);
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: { message: 'Order has no items' } });
    await expectOrder(owner.orders, order);
  });

  test('devuelve 422 sin fondos suficientes y conserva el stock', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order, book, item } = await filledOrder(sandbox, owner, expensiveOrderStock);
    const response = await owner.orders.updateStatus(order.id, orderStatus.sent);
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: { message: 'Not enough funds' } });
    await expectOrder(owner.orders, order);
    expect((await (await sandbox.items.findByBookId(book.id)).json()).quantity).toBe(item.quantity);
  });

  test('devuelve 404 si no hay pedido activo', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const response = await owner.orders.updateStatus(missingOrderId, orderStatus.cancelled);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: "Order not found or is not in the 'new' status" } });
  });

  unauthorized((client) => client.updateStatus(missingOrderId, orderStatus.sent));
});

test.describe('POST /api/book-shop-orders/coupon', () => {
  for (const [name, coupon] of Object.entries({ fijo: orderCoupons.fixed, porcentaje: orderCoupons.percentage, limitado: orderCoupons.capped })) {
    test(`aplica cupón ${name} y persiste el total`, { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
      const owner = await buyer(sandbox);
      const { order } = await filledOrder(sandbox, owner);
      const response = await owner.orders.applyCoupon(coupon.code, order.id);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopOrderSchema, body);
      expect(body.total_cost).toBe(coupon.total);
      expect(body.partial_costs[coupon.code]).toBeLessThan(0);
      await expectOrder(owner.orders, body);
    });
  }

  test('devuelve 409 al aplicar dos veces el mismo cupón', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order } = await filledOrder(sandbox, owner);
    const first = await owner.orders.applyCoupon(orderCoupons.fixed.code, order.id);
    expect(first.status()).toBe(200);
    const before = await first.json();
    const response = await owner.orders.applyCoupon(orderCoupons.fixed.code, order.id);
    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ error: { message: 'Coupon already applied' } });
    await expectOrder(owner.orders, before);
  });

  test('devuelve 404 si el cupón no existe', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order } = await filledOrder(sandbox, owner);
    const response = await owner.orders.applyCoupon(orderCoupons.missing, order.id);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Coupon not found or is invalid' } });
    await expectOrder(owner.orders, order);
  });

  test('devuelve 404 si no hay pedido activo', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const response = await owner.orders.applyCoupon(orderCoupons.fixed.code);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: "Order not found or is not in the 'new' status" } });
  });

  unauthorized((client) => client.applyCoupon(orderCoupons.fixed.code));
});

test.describe('GET /api/book-shop-manage/orders', () => {
  test('permite al personal consultar pedidos de otros compradores', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    const response = await sandbox.manager.listManaged();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopOrderListSchema, body);
    expect(body).toEqual(expect.arrayContaining([order]));
  });

  test('devuelve 401 para un lector sin permiso de gestión', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const response = await sandbox.reader.listManaged();
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'User does not have a permission' } });
  });

  test('devuelve 404 si el usuario no tiene cuenta de tienda', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox, false);
    const response = await owner.orders.listManaged();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
  });

  unauthorized((client) => client.listManaged());
});

test.describe('PATCH /api/book-shop-manage/orders/:id', () => {
  test('pasa un pedido enviado a pendiente sin volver a cobrar', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order, book, item } = await filledOrder(sandbox, owner);
    const before = await (await owner.account.getCurrent()).json();
    const sent = await owner.orders.updateStatus(order.id, orderStatus.sent);
    expect(sent.status()).toBe(200);
    await expect.poll(async () => (await (await owner.account.getCurrent()).json()).funds).toBe(before.funds - order.total_cost);
    const response = await sandbox.manager.manageStatus(order.id, orderStatus.pending);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(bookShopOrderSchema, body);
    expect(body.status_id).toBe(orderStatus.pending);
    await expectOrder(owner.orders, body);
    expect((await (await owner.account.getCurrent()).json()).funds).toBe(before.funds - order.total_cost);
    expect((await (await sandbox.items.findByBookId(book.id)).json()).quantity).toBe(item.quantity - 1);
  });

  test('devuelve 409 si el personal intenta una transición no permitida', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const order = await emptyOrder(owner);
    const response = await sandbox.manager.manageStatus(order.id, invalidOrderStatus);
    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ error: { message: 'Cannot change order status. Not allowed by current status' } });
    await expectOrder(owner.orders, order);
  });

  test('devuelve 422 por fondos insuficientes en gestión', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const owner = await buyer(sandbox);
    const { order, book, item } = await filledOrder(sandbox, owner, expensiveOrderStock);
    const before = await (await sandbox.managerAccount.getCurrent()).json();
    expect(before.funds).toBeLessThan(order.total_cost);
    const response = await sandbox.manager.manageStatus(order.id, orderStatus.sent);
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: { message: 'Not enough funds' } });
    await expectOrder(owner.orders, order);
    expect((await (await sandbox.managerAccount.getCurrent()).json()).funds).toBe(before.funds);
    expect((await (await sandbox.items.findByBookId(book.id)).json()).quantity).toBe(item.quantity);
  });

  test('devuelve 404 si el pedido no existe', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const response = await sandbox.manager.manageStatus(missingOrderId, orderStatus.sent);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'Order not found' } });
  });

  test('devuelve 401 para un lector sin permiso de gestión', { tag: '@regression' }, async ({ orderSandbox: sandbox }) => {
    const response = await sandbox.reader.manageStatus(missingOrderId, orderStatus.sent);
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'User does not have a permission' } });
  });

  unauthorized((client) => client.manageStatus(missingOrderId, orderStatus.sent));
});
