import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { expectedOrderStatuses, missingOrderStatusId } from '@src/sut/data/book-shop-order-statuses';
import { bookShopOrderStatusSchema, bookShopOrderStatusListSchema } from '@src/sut/schemas';

test.describe('Catálogo público de estados de pedidos', () => {
  test('lista estados y transiciones sin autenticación', { tag: '@regression' }, async ({ bookShopOrderStatusesClient: client }) => {
    const response = await client.list();
    expect(response.status()).toBe(200);
    const statuses = await response.json();
    expectSchema(bookShopOrderStatusListSchema, statuses);
    expect(statuses).toEqual(expectedOrderStatuses);
  });

  test('consulta cada estado por ID y coincide con el catálogo', { tag: '@regression' }, async ({ bookShopOrderStatusesClient: client }) => {
    for (const status of expectedOrderStatuses) {
      const response = await client.getById(status.id);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopOrderStatusSchema, body);
      expect(body).toEqual(status);
    }
  });

  test('devuelve 404 para un estado inexistente', { tag: '@regression' }, async ({ bookShopOrderStatusesClient: client }) => {
    const response = await client.getById(missingOrderStatusId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});
