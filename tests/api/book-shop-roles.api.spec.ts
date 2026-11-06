import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { expectedShopRoles, missingShopRoleId, rejectedShopRole, rejectedShopRoleChange } from '@src/sut/data/book-shop-roles';
import { bookShopRoleSchema, bookShopRoleListSchema } from '@src/sut/schemas';
import type { BookShopRolesClient } from '@src/sut/api/book-shop-roles.client';

const roleId = expectedShopRoles[0].id;
const rejectedWrites = [
  { method: 'POST', call: (client: BookShopRolesClient) => client.create(rejectedShopRole) },
  { method: 'PUT', call: (client: BookShopRolesClient) => client.replace(roleId, rejectedShopRoleChange) },
  { method: 'PATCH', call: (client: BookShopRolesClient) => client.update(roleId, rejectedShopRoleChange) },
  { method: 'DELETE', call: (client: BookShopRolesClient) => client.remove(roleId) },
];

test.describe('Catálogo público /api/book-shop-roles', () => {
  for (const session of ['anonymous', 'admin', 'reader', 'staff', 'withoutAccount', 'invalidToken'] as const) {
    test(`lista el catálogo completo con sesión ${session}`, { tag: '@regression' }, async ({ bookShopRolesSandbox: sandbox }) => {
      const response = await sandbox[session].list();
      expect(response.status()).toBe(200);
      const roles = await response.json();
      expectSchema(bookShopRoleListSchema, roles);
      expect(roles).toEqual(expectedShopRoles);
    });
  }

  test('consulta cada rol por ID sin autenticación', { tag: '@regression' }, async ({ bookShopRolesSandbox: sandbox }) => {
    for (const role of expectedShopRoles) {
      const response = await sandbox.anonymous.getById(role.id);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(bookShopRoleSchema, body);
      expect(body).toEqual(role);
    }
  });

  test('devuelve 404 para un ID inexistente', { tag: '@regression' }, async ({ bookShopRolesSandbox: sandbox }) => {
    const response = await sandbox.anonymous.getById(missingShopRoleId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });

  for (const session of ['anonymous', 'admin'] as const) {
    for (const { method, call } of rejectedWrites) {
      test(`rechaza ${method} con sesión ${session} y conserva los roles`, { tag: '@regression' }, async ({ bookShopRolesSandbox: sandbox }) => {
        const client = sandbox[session];
        const snapshot = await sandbox.anonymous.list();
        expect(snapshot.status()).toBe(200);
        const before = await snapshot.json();
        expect(before).toEqual(expectedShopRoles);
        const response = await call(client);
        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({ error: { message: 'Not Found' } });
        const after = await sandbox.anonymous.list();
        expect(after.status()).toBe(200);
        expect(await after.json()).toEqual(before);
      });
    }
  }
});
