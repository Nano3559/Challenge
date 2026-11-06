import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { shopStatsSchemas } from '@src/sut/schemas';
import { statsKinds, reportingStock, reportingShipping } from '@src/sut/data/book-shop-reporting';
import { reportingBuyer, reportingOrder } from './shop-reporting.helpers';

test.describe('Estadísticas de tienda', () => {
  for (const kind of statsKinds) {
    test(`${kind}: administrador consulta métricas`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
      const response = await sandbox.clients.admin.statistics(kind);
      expect(response.status()).toBe(200);
      expectSchema(shopStatsSchemas[kind], await response.json());
    });

    for (const session of ['anonymous', 'invalidToken', 'reader', 'staff'] as const) {
      test(`${kind}: rechaza sesión ${session}`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
        expect((await sandbox.clients[session].statistics(kind)).status()).toBe(401);
      });
    }

    test(`${kind}: devuelve 404 sin cuenta`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
      expect((await sandbox.clients.withoutAccount.statistics(kind)).status()).toBe(404);
    });
  }

  test('all concuerda con cada proyección y totales de pedidos', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const response = await sandbox.clients.admin.statistics('all');
    expect(response.status()).toBe(200);
    const all = await response.json();
    expectSchema(shopStatsSchemas.all, all);
    for (const kind of ['orders', 'users', 'items'] as const) {
      const projection = await sandbox.clients.admin.statistics(kind);
      expect(projection.status()).toBe(200);
      const body = await projection.json();
      expectSchema(shopStatsSchemas[kind], body);
      expect(all).toMatchObject(body);
    }
    const ordersResponse = await orderSandbox.admin.listManaged();
    expect(ordersResponse.status()).toBe(200);
    const orders: { total_cost: number; book_ids: number[]; status_id: number }[] = await ordersResponse.json();
    expect(all.totalOrders).toBe(orders.length);
    expect(all.totalCost).toBe(orders.reduce((sum, order) => sum + order.total_cost, 0));
    expect(all.totalBooks).toBe(orders.reduce((sum, order) => sum + order.book_ids.length, 0));
    expect(all.totalBooksSold).toBe(orders.filter((order) => [40, 99].includes(order.status_id)).reduce((sum, order) => sum + order.book_ids.length, 0));
    expect(Object.values(all.totalStatusesPerType).reduce<number>((sum, count) => sum + Number(count), 0)).toBe(all.totalOrders);
    expect(Object.values(all.totalItemsPerPrice).reduce<number>((sum, count) => sum + Number(count), 0)).toBe(all.totalItems);
    expect(Object.values(all.totalItemsPerQuantity).reduce<number>((sum, count) => sum + Number(count), 0)).toBe(all.totalItems);
  });

  test('un pedido propio actualiza métricas de libros, usuario, costos e inventario', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const beforeResponse = await sandbox.clients.admin.statistics('all');
    expect(beforeResponse.status()).toBe(200);
    const before = await beforeResponse.json();
    const { book, order } = await reportingOrder(orderSandbox, buyer);
    const response = await sandbox.clients.admin.statistics('all');
    expect(response.status()).toBe(200);
    const after = await response.json();
    expectSchema(shopStatsSchemas.all, after);
    expect(after).toMatchObject({
      totalOrders: before.totalOrders + 1, totalBooks: before.totalBooks + 1, totalBooksSold: before.totalBooksSold,
      totalCost: before.totalCost + reportingStock.price + reportingShipping, totalItems: before.totalItems + 1,
    });
    expect(after.totalBooksPerType[book.id]).toBe(1);
    expect(after.booksPerUser[buyer.user.id]).toBe(1);
    expect(after.costsPerUser[buyer.user.id]).toBe(order.total_cost);
    expect(after.booksPerUserPerOrderStatus[buyer.user.id]).toEqual({ '1': 1 });
    expect(after.totalStatusesPerType['1']).toBe((before.totalStatusesPerType['1'] ?? 0) + 1);
    expect(after.totalPartialCosts.shipping).toBe((before.totalPartialCosts.shipping ?? 0) + reportingShipping);
    expect(after.totalPartialCosts.books).toBe((before.totalPartialCosts.books ?? 0) + reportingStock.price);
    expect(after.totalItemsPerPrice[reportingStock.price]).toBe((before.totalItemsPerPrice[reportingStock.price] ?? 0) + 1);
    expect(after.totalItemsPerQuantity[reportingStock.quantity]).toBe((before.totalItemsPerQuantity[reportingStock.quantity] ?? 0) + 1);
  });

  test('devuelve 404 para categoría inexistente', { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
    const response = await sandbox.clients.admin.unknownStatistics();
    expect(response.status()).toBe(404);
  });
});
