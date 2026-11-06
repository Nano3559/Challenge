import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { bookShopAccountSchema, managedShopAccountListSchema } from '@src/sut/schemas';
import { expectedShopRoles } from '@src/sut/data/book-shop-roles';
import { missingManagedAccountId, invalidManagedAccountRoles, ignoredManagedAccountFields } from '@src/sut/data/book-shop-manage-accounts';
import { reportingBuyer } from './shop-reporting.helpers';

test.describe('Administración de cuentas de tienda', () => {
  test('lista cuentas con datos de usuario y rol, incluyendo cuenta propia de prueba', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const response = await sandbox.clients.admin.accounts();
    expect(response.status()).toBe(200);
    const accounts = await response.json();
    expectSchema(managedShopAccountListSchema, accounts);
    expect(accounts).toContainEqual({
      id: buyer.account.id, user_id: buyer.user.id, user_name: `${buyer.payload.firstname} ${buyer.payload.lastname}`,
      avatar: buyer.payload.avatar, role_id: 2, role_name: 'reader', created_at: buyer.account.created_at,
    });
  });

  for (const session of ['anonymous', 'invalidToken', 'reader', 'staff'] as const) {
    test(`listado rechaza sesión ${session}`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
      expect((await sandbox.clients[session].accounts()).status()).toBe(401);
    });

    test(`PATCH rechaza sesión ${session} sin cambiar la cuenta`, { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
      const buyer = await reportingBuyer(orderSandbox);
      const response = await sandbox.clients[session].changeAccountRole(buyer.account.id, { role_id: 1 });
      expect(response.status()).toBe(401);
      const persisted = await buyer.accountClient.getCurrent();
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(buyer.account);
    });
  }

  test('listado devuelve 404 para usuario sin cuenta', { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
    const response = await sandbox.clients.withoutAccount.accounts();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'User does not have a book shop account' } });
  });

  test('PATCH devuelve 404 para usuario sin cuenta y conserva el destino', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    expect((await sandbox.clients.withoutAccount.changeAccountRole(buyer.account.id, { role_id: 1 })).status()).toBe(404);
    const persisted = await buyer.accountClient.getCurrent();
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual(buyer.account);
  });

  for (const role of expectedShopRoles) {
    test(`admin asigna rol ${role.name} y persiste únicamente role_id`, { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
      const buyer = await reportingBuyer(orderSandbox);
      try {
        const response = await sandbox.clients.admin.changeAccountRole(buyer.account.id, { role_id: role.id });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expectSchema(bookShopAccountSchema, body);
        expect(body).toEqual({ ...buyer.account, role_id: role.id });
        const persisted = await buyer.accountClient.getCurrent();
        expect(persisted.status()).toBe(200);
        expect(await persisted.json()).toEqual(body);
        const list = await sandbox.clients.admin.accounts();
        expect(list.status()).toBe(200);
        expect(await list.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: buyer.account.id, role_id: role.id, role_name: role.name })]));
      } finally {
        expect((await sandbox.clients.admin.changeAccountRole(buyer.account.id, { role_id: buyer.account.role_id })).status()).toBe(200);
      }
    });
  }

  test('rechaza roles ausentes o inválidos con 404 y conserva la cuenta', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    for (const data of invalidManagedAccountRoles) {
      const response = await sandbox.clients.admin.changeAccountRole(buyer.account.id, data);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'Role not found' } });
      const persisted = await buyer.accountClient.getCurrent();
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(buyer.account);
    }
  });

  for (const id of [missingManagedAccountId, 'qa-invalid-id', ''] as const) {
    test(`devuelve 404 para cuenta no resoluble ${id}`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
      const response = await sandbox.clients.admin.changeAccountRole(id, { role_id: 2 });
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: { message: 'Account not found' } });
    });
  }

  test('ignora cambios de fondos, propietario y colecciones enviados junto al rol', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const response = await sandbox.clients.admin.changeAccountRole(buyer.account.id, { role_id: 2, ...ignoredManagedAccountFields });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(buyer.account);
    const persisted = await buyer.accountClient.getCurrent();
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual(buyer.account);
  });

  test('un comprador no puede ascender su propia cuenta', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const response = await sandbox.forToken(buyer.token).changeAccountRole(buyer.account.id, { role_id: 1 });
    expect(response.status()).toBe(401);
    const persisted = await buyer.accountClient.getCurrent();
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual(buyer.account);
  });

  test('otorga y revoca permisos efectivos sin renovar el token del comprador', { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
    const buyer = await reportingBuyer(orderSandbox);
    const ownClient = sandbox.forToken(buyer.token);
    expect((await ownClient.accounts()).status()).toBe(401);
    try {
      expect((await sandbox.clients.admin.changeAccountRole(buyer.account.id, { role_id: 1 })).status()).toBe(200);
      expect((await ownClient.accounts()).status()).toBe(200);
      expect((await ownClient.statistics('all')).status()).toBe(200);
    } finally {
      expect((await sandbox.clients.admin.changeAccountRole(buyer.account.id, { role_id: 2 })).status()).toBe(200);
    }
    expect((await ownClient.accounts()).status()).toBe(401);
    expect((await ownClient.statistics('all')).status()).toBe(401);
  });
});
