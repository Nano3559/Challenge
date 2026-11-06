import { test, expect, type OrderSandbox } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import type { BookShopPaymentCardsClient } from '@src/sut/api/book-shop-payment-cards.client';
import { paymentCardSchema, paymentCardUpdateResponseSchema, maskedPaymentCardSchema, shopTopupHistorySchema } from '@src/sut/schemas';
import { buildPaymentCard, initialCardBalance, validTopupAmounts, invalidCardFields, invalidTopupAmounts, invalidTopupCvvs, ignoredCardFields } from '@src/sut/data/book-shop-payment-cards';
import { reportingBuyer } from './shop-reporting.helpers';

async function savedCard(client: BookShopPaymentCardsClient, accountId: number) {
  const data = buildPaymentCard();
  const response = await client.update(data);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expectSchema(paymentCardUpdateResponseSchema, body);
  expect(body).toEqual({ ...data, account_id: accountId, balance: initialCardBalance });
  await expect.poll(async () => {
    const persisted = await client.getCurrent();
    if (persisted.status() === 404) return undefined;
    expect(persisted.status()).toBe(200);
    return (await persisted.json()).card_number;
  }).toBe('*'.repeat(16) + data.card_number.slice(-4));
  const persisted = await client.getCurrent();
  expect(persisted.status()).toBe(200);
  const card = await persisted.json();
  expectSchema(maskedPaymentCardSchema, card);
  expect(card).toEqual({ card_number: '*'.repeat(16) + data.card_number.slice(-4), balance: initialCardBalance });
  return { ...data, account_id: accountId, balance: initialCardBalance };
}

async function unchanged(client: BookShopPaymentCardsClient, expected: { card_number: string; balance: number }) {
  const response = await client.getCurrent();
  expect(response.status()).toBe(200);
  const body = await response.json();
  expectSchema(maskedPaymentCardSchema, body);
  expect(body).toEqual({ card_number: '*'.repeat(16) + expected.card_number.slice(-4), balance: expected.balance });
}

async function buyerWithCard(sandbox: OrderSandbox, forToken: (token: string) => BookShopPaymentCardsClient) {
  const buyer = await reportingBuyer(sandbox);
  const client = forToken(buyer.token);
  return { buyer, client, card: await savedCard(client, buyer.account.id) };
}

test.describe('Tarjetas ficticias y recargas locales', () => {
  const operations = [
    { name: 'GET', call: (client: BookShopPaymentCardsClient) => client.getCurrent() },
    { name: 'PUT', call: (client: BookShopPaymentCardsClient) => client.update(buildPaymentCard()) },
    { name: 'DELETE', call: (client: BookShopPaymentCardsClient) => client.remove() },
    { name: 'topup', call: (client: BookShopPaymentCardsClient) => client.topup({ amount: 100, cvv: '12345' }) },
  ];
  for (const { name, call } of operations) {
    for (const session of ['anonymous', 'invalidToken'] as const) {
      test(`${name}: rechaza sesión ${session}`, { tag: '@regression' }, async ({ paymentCardsSandbox: sandbox }) => {
        expect((await call(sandbox[session])).status()).toBe(401);
      });
    }

    test(`${name}: devuelve 404 sin cuenta`, { tag: '@regression' }, async ({ paymentCardsSandbox: sandbox }) => {
      const response = await call(sandbox.withoutAccount);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'Account not found' } });
    });
  }

  test('GET, DELETE y topup devuelven 404 si no hay tarjeta', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const client = sandbox.forToken(buyer.token);
    for (const call of [() => client.getCurrent(), () => client.remove(), () => client.topup({ amount: 100, cvv: '12345' })]) {
      const response = await call();
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'Card not found' } });
    }
  });

  test('PUT crea y GET recupera únicamente la tarjeta de su cuenta', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
    const { buyer, client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
    expect(card.account_id).toBe(buyer.account.id);
    await unchanged(client, card);
  });

  test('PUT reemplaza tarjeta y conserva su cuenta', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
    const { buyer, client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
    const replacement = await savedCard(client, buyer.account.id);
    expect(replacement.account_id).toBe(card.account_id);
    expect(replacement.card_number).not.toBe(card.card_number);
  });

  for (const field of ['card_number', 'cvv', 'expiration_date'] as const) {
    test(`PUT rechaza ${field} inválido y conserva la tarjeta`, { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
      const { client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
      for (const value of invalidCardFields[field]) {
        const response = await client.update({ ...buildPaymentCard(), [field]: value });
        expect(response.status()).toBe(422);
        await unchanged(client, card);
      }
    });
  }

  test('PUT rechaza registrar de nuevo el mismo número en su cuenta', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
    const { client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
    const response = await client.update(card);
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: { message: 'Card already in use' } });
    await unchanged(client, card);
  });

  test('PUT ignora balance y account_id enviados por el cliente', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const client = sandbox.forToken(buyer.token);
    const data = buildPaymentCard();
    const response = await client.update({ ...data, ...ignoredCardFields });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ...data, account_id: buyer.account.id, balance: initialCardBalance });
    await expect.poll(async () => (await client.getCurrent()).status()).toBe(200);
    const persisted = await client.getCurrent();
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual({ card_number: '*'.repeat(16) + data.card_number.slice(-4), balance: initialCardBalance });
  });

  test('DELETE elimina la tarjeta propia y conserva la de otro comprador', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
    const first = await buyerWithCard(orderSandbox, sandbox.forToken);
    const second = await buyerWithCard(orderSandbox, sandbox.forToken);
    const response = await first.client.remove();
    expect(response.status()).toBe(200);
    expect((await first.client.getCurrent()).status()).toBe(404);
    expect((await first.client.remove()).status()).toBe(404);
    await unchanged(second.client, second.card);
  });

  test('topup rechaza CVV ausente o incorrecto sin cambiar saldos', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox, shopReportingSandbox }) => {
    const { buyer, client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
    for (const cvv of invalidTopupCvvs) {
      const response = await client.topup({ amount: 100, cvv });
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Invalid CVV' } });
      await unchanged(client, card);
    }
    const accountResponse = await buyer.accountClient.getCurrent();
    expect(accountResponse.status()).toBe(200);
    expect(await accountResponse.json()).toEqual(buyer.account);
    const history = await shopReportingSandbox.forToken(buyer.token).history();
    expect(history.status()).toBe(200);
    expect(await history.json()).toEqual([]);
  });

  test('topup rechaza importes inválidos o fuera de rango sin cambiar saldos', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox, shopReportingSandbox }) => {
    const { buyer, client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
    for (const amount of invalidTopupAmounts) {
      expect((await client.topup({ amount, cvv: card.cvv })).status()).toBe(422);
      await unchanged(client, card);
    }
    const accountResponse = await buyer.accountClient.getCurrent();
    expect(accountResponse.status()).toBe(200);
    expect(await accountResponse.json()).toEqual(buyer.account);
    const history = await shopReportingSandbox.forToken(buyer.token).history();
    expect(history.status()).toBe(200);
    expect(await history.json()).toEqual([]);
  });

  test('topup rechaza saldo insuficiente de tarjeta', { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox }) => {
    const { client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
    const response = await client.topup({ amount: initialCardBalance + 100, cvv: card.cvv });
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: { message: 'Not enough balance' } });
    await unchanged(client, card);
  });

  for (const amount of validTopupAmounts) {
    test(`topup de ${amount} descuenta tarjeta y acredita cuenta e historial propios`, { tag: '@regression' }, async ({ orderSandbox, paymentCardsSandbox: sandbox, shopReportingSandbox }) => {
      // Preparación de dos cuentas/tarjetas más la acreditación diferida de hasta 15 s.
      test.setTimeout(45_000);
      const { buyer, client, card } = await buyerWithCard(orderSandbox, sandbox.forToken);
      const other = await buyerWithCard(orderSandbox, sandbox.forToken);
      const response = await client.topup({ amount, cvv: card.cvv, card_number: card.card_number });
      expect(response.status()).toBe(200);
      const updated = await response.json();
      expectSchema(paymentCardSchema, updated);
      expect(updated).toMatchObject({ ...card, balance: initialCardBalance - amount });
      await unchanged(client, updated);
      const reporting = shopReportingSandbox.forToken(buyer.token);
      await expect.poll(async () => {
        const history = await reporting.history();
        expect(history.status()).toBe(200);
        return (await history.json()).length;
      }, { timeout: 20_000 }).toBe(1);
      const history = await reporting.history();
      expect(history.status()).toBe(200);
      const entries = await history.json();
      expectSchema(shopTopupHistorySchema, entries);
      expect(entries[0]).toMatchObject({
        account_id: buyer.account.id, activityType: 'topup', balanceBefore: buyer.account.funds, balanceAfter: buyer.account.funds + amount,
        paymentDetails: { amount, currency: 'PLN', status: 'completed', order_id: null },
      });
      const accountResponse = await buyer.accountClient.getCurrent();
      expect(accountResponse.status()).toBe(200);
      expect((await accountResponse.json()).funds).toBe(buyer.account.funds + amount);
      await unchanged(other.client, other.card);
      const otherAccount = await other.buyer.accountClient.getCurrent();
      expect(otherAccount.status()).toBe(200);
      expect(await otherAccount.json()).toEqual(other.buyer.account);
      const otherHistory = await shopReportingSandbox.forToken(other.buyer.token).history();
      expect(otherHistory.status()).toBe(200);
      expect(await otherHistory.json()).toEqual([]);
    });
  }
});
