import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { shopManagedUsersSchema, shopTeamSchema } from '@src/sut/schemas';
import { expectedShopTeam } from '@src/sut/data/book-shop-reporting';
import { buildUser, missingUserId } from '@src/sut/data/users';

test.describe('Gestión de usuarios y equipo', () => {
  for (const session of ['admin', 'staff'] as const) {
    test(`usuarios: ${session} consulta nombres de usuarios propios y múltiples IDs`, { tag: '@regression' }, async ({ orderSandbox, shopReportingSandbox: sandbox }) => {
      const first = buildUser();
      const second = buildUser();
      const aResponse = await orderSandbox.users.create(first);
      const bResponse = await orderSandbox.users.create(second);
      expect(aResponse.status()).toBe(201);
      expect(bResponse.status()).toBe(201);
      const a = await aResponse.json();
      const b = await bResponse.json();
      const single = await sandbox.clients[session].users([a.id]);
      expect(single.status()).toBe(200);
      expect(await single.json()).toEqual({ [a.id]: { name: `${first.firstname} ${first.lastname}` } });
      const response = await sandbox.clients[session].users([a.id, b.id, a.id, missingUserId]);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(shopManagedUsersSchema, body);
      expect(body).toEqual({ [a.id]: { name: `${first.firstname} ${first.lastname}` }, [b.id]: { name: `${second.firstname} ${second.lastname}` } });
    });

    test(`equipo: ${session} consulta personal y excluye lectores`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
      const response = await sandbox.clients[session].team();
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(shopTeamSchema, body);
      expect(body).toEqual(expectedShopTeam);
    });
  }
  for (const session of ['anonymous', 'invalidToken', 'reader'] as const) {
    test(`usuarios: rechaza sesión ${session}`, { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
      expect((await sandbox.clients[session].users([missingUserId])).status()).toBe(401);
    });
  }

  test('usuarios: devuelve 404 sin cuenta de tienda', { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
    expect((await sandbox.clients.withoutAccount.users([missingUserId])).status()).toBe(404);
  });

  test('usuarios: devuelve 404 si falta query id', { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
    const response = await sandbox.clients.admin.users();
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { message: 'User not found' } });
  });

  test('usuarios: ID inexistente devuelve mapa vacío', { tag: '@regression' }, async ({ shopReportingSandbox: sandbox }) => {
    const response = await sandbox.clients.admin.users([missingUserId]);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({});
  });
});
