import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { shopPaymentHistorySchema } from '@src/sut/schemas';
import { reportingStock, reportingShipping } from '@src/sut/data/book-shop-reporting';
import { orderStatus } from '@src/sut/data/book-shop-orders';
import { reportingBuyer, reportingOrder } from './shop-reporting.helpers';

test.describe('Historial local de pagos', () => {
  for (const session of ['anonymous', 'invalidToken'] as const) {
    test(`rechaza sesión ${session}`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
      const response = await sandbox.clients[session].history();
      expect(response.status()).toBe(401);
    });
  }

  test('devuelve 404 sin cuenta de tienda', { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
    const response = await sandbox.clients.withoutAccount.history();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
  });

  test('devuelve historial vacío para un comprador nuevo', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const response = await shopReportingSandbox.forToken(buyer.token).history();
    expect(response.status()).toBe(200);
    expectSchema(shopPaymentHistorySchema, await response.json());
    expect(await response.json()).toEqual([]);
  });

  test('registra compra con importe, saldos e ID del pedido correctos y aísla cuentas', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const other = await reportingBuyer(orderSandbox);
    const { order } = await reportingOrder(orderSandbox, buyer);
    const beforeResponse = await buyer.accountClient.getCurrent();
    expect(beforeResponse.status()).toBe(200);
    const before = await beforeResponse.json();
    expect((await buyer.orders.updateStatus(order.id, orderStatus.sent)).status()).toBe(200);
    const client = shopReportingSandbox.forToken(buyer.token);
    await expect.poll(async () => {
      const response = await client.history();
      expect(response.status()).toBe(200);
      return (await response.json()).length;
    }).toBe(1);
    const historyResponse = await client.history();
    expect(historyResponse.status()).toBe(200);
    const entries = await historyResponse.json();
    expectSchema(shopPaymentHistorySchema, entries);
    expect(entries[0]).toMatchObject({
      account_id: buyer.account.id, activityType: 'payment', balanceBefore: before.funds,
      balanceAfter: before.funds - reportingStock.price - reportingShipping,
      paymentDetails: { order_id: order.id, amount: reportingStock.price + reportingShipping, currency: 'PLN', status: 'completed', paymentMethod: 'credit_card' },
    });
    const afterResponse = await buyer.accountClient.getCurrent();
    expect(afterResponse.status()).toBe(200);
    expect((await afterResponse.json()).funds).toBe(entries[0].balanceAfter);
    const otherResponse = await shopReportingSandbox.forToken(other.token).history(buyer.account.id);
    expect(otherResponse.status()).toBe(200);
    expect(await otherResponse.json()).toEqual([]);
    const ownWithOtherId = await client.history(other.account.id);
    expect(ownWithOtherId.status()).toBe(200);
    expect(await ownWithOtherId.json()).toEqual(entries);
  });
});
