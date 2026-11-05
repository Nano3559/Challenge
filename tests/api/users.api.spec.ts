import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { AuthClient } from '@src/sut/api/auth.client';
import { UsersClient } from '@src/sut/api/users.client';
import { buildUser, buildUserWithout, malformedUserJson, missingUserId, userRequiredFields, userUpdates, type UserCreate } from '@src/sut/data/users';
import { userSchema, publicUserSchema, userListSchema, loginResponseSchema } from '@src/sut/schemas';

test.describe.configure({ mode: 'default' });

type UserRecord = UserCreate & { id: number | string };
type UserSession = { owner: UsersClient; user: UserRecord; payload: UserCreate };

async function withUser(
  anonymous: UsersClient,
  auth: AuthClient,
  forToken: (token: string) => UsersClient,
  run: (session: UserSession) => Promise<void>,
) {
  const payload = buildUser();
  const created = await anonymous.create(payload);
  const user = await created.json();
  // Obtener primero la sesión permite limpiar también si falla el contrato de creación.
  const login = await auth.login(payload);
  expect(login.status()).toBe(200);
  const credentials = await login.json();
  expectSchema(loginResponseSchema, credentials);
  const owner = forToken(credentials.access_token);
  try {
    expect(created.status()).toBe(201);
    expectSchema(userSchema, user);
    expect(user).toMatchObject({ email: payload.email, firstname: payload.firstname, lastname: payload.lastname, avatar: payload.avatar });
    await run({ owner, user, payload });
  } finally {
    const cleanup = await owner.deleteById(user.id);
    expect(cleanup.status()).toBe(200);
    expect((await anonymous.getById(user.id)).status()).toBe(404);
  }
}

async function expectPreserved(client: UsersClient, user: UserRecord) {
  const response = await client.getById(user.id);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expectSchema(publicUserSchema, body);
  expect(body).toEqual(publicView(user));
}

function publicView(user: UserRecord) {
  return { ...user, email: '****', lastname: '****', password: '****' };
}

test.describe('GET /api/users', () => {
  test('devuelve la lista de usuarios', { tag: '@smoke' }, async ({ usersClient }) => {
    const response = await usersClient.list();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema(userListSchema, body);
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('POST /api/users', () => {
  test('crea un usuario y permite iniciar sesión', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
    await withUser(usersClient, authClient, usersClientForToken, async ({ user }) => {
      const response = await usersClient.getById(user.id);
      expect(response.status()).toBe(200);
      expectSchema(publicUserSchema, await response.json());
    });
  });

  test('devuelve 409 con email duplicado', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
    await withUser(usersClient, authClient, usersClientForToken, async ({ user, payload }) => {
      const response = await usersClient.create(payload);
      expect(response.status()).toBe(409);
      expect(await response.json()).toEqual({ error: { message: 'Email not unique' } });
      await expectPreserved(usersClient, user);
    });
  });

  for (const field of userRequiredFields) {
    test(`devuelve 422 si falta ${field}`, { tag: '@regression' }, async ({ usersClient }) => {
      const response = await usersClient.create(buildUserWithout(field));
      expect(response.status()).toBe(422);
      expect(await response.json()).toEqual({ error: {
        message: 'One of mandatory field is missing', details: userRequiredFields,
      } });
    });
  }

  test('devuelve 422 con email inválido', { tag: '@regression' }, async ({ usersClient }) => {
    const response = await usersClient.create({ ...buildUser(), email: 'invalid-email' });
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: { message: 'Invalid email' } });
  });

  test('devuelve 400 con JSON malformado', { tag: '@regression' }, async ({ usersClient }) => {
    const response = await usersClient.createFromRawJson(malformedUserJson);
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: 'SyntaxError: Unexpected data in JSON. Please check Your JSON.', details: malformedUserJson });
  });
});

test.describe('GET /api/users/:id', () => {
  test('devuelve el usuario solicitado', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
    await withUser(usersClient, authClient, usersClientForToken, async ({ user }) => {
      const response = await usersClient.getById(user.id);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expectSchema(publicUserSchema, body);
      expect(body).toEqual(publicView(user));
    });
  });

  test('devuelve 404 si el usuario no existe', { tag: '@regression' }, async ({ usersClient }) => {
    const response = await usersClient.getById(missingUserId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});

for (const method of ['PUT', 'PATCH'] as const) {
  test.describe(`${method} /api/users/:id`, () => {
    test('actualiza el usuario propietario y persiste los cambios', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
      await withUser(usersClient, authClient, usersClientForToken, async ({ owner, user, payload }) => {
        const changes = { ...payload, ...userUpdates };
        const response = method === 'PUT'
          ? await owner.updateById(user.id, changes)
          : await owner.patchById(user.id, { firstname: userUpdates.firstname });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expectSchema(userSchema, body);
        expect(body).toMatchObject({
          id: user.id, email: payload.email, firstname: userUpdates.firstname,
          lastname: method === 'PUT' ? userUpdates.lastname : payload.lastname, avatar: payload.avatar,
        });
        const persisted = await usersClient.getById(user.id);
        expect(persisted.status()).toBe(200);
        expectSchema(publicUserSchema, await persisted.json());
        await expectPreserved(usersClient, body);
      });
    });

    test('devuelve 401 sin autorización y conserva el usuario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
      await withUser(usersClient, authClient, usersClientForToken, async ({ user, payload }) => {
        const response = method === 'PUT'
          ? await usersClient.updateById(user.id, { ...payload, ...userUpdates })
          : await usersClient.patchById(user.id, userUpdates);
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: { message: 'Access token not provided!' } });
        await expectPreserved(usersClient, user);
      });
    });

    test('devuelve 401 con token de otro usuario y conserva el recurso', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
      await withUser(usersClient, authClient, usersClientForToken, async ({ user, payload }) => {
        await withUser(usersClient, authClient, usersClientForToken, async ({ owner: other }) => {
          const response = method === 'PUT'
            ? await other.updateById(user.id, { ...payload, ...userUpdates })
            : await other.patchById(user.id, userUpdates);
          expect(response.status()).toBe(401);
          expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
          await expectPreserved(usersClient, user);
        });
      });
    });

    test('devuelve 422 con campos inválidos y conserva el usuario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
      await withUser(usersClient, authClient, usersClientForToken, async ({ owner, user, payload }) => {
        const response = method === 'PUT'
          ? await owner.updateById(user.id, { ...payload, email: 'invalid-email' })
          : await owner.patchById(user.id, { firstname: '' });
        expect(response.status()).toBe(422);
        const body = await response.json();
        const expectedError = method === 'PUT'
          ? { error: { message: 'Invalid email' } }
          : { error: {
            message: 'One of field is invalid (empty, invalid or too long) or there are some additional fields: Field validation: "firstname" is empty! Mandatory fields: [firstname,lastname,email,avatar,password]',
            details: ['id', 'firstname', 'lastname', 'email', 'avatar', 'password', 'birthDate'],
          } };
        expect(body).toEqual(expectedError);
        await expectPreserved(usersClient, user);
      });
    });

    test('devuelve 400 con JSON malformado y conserva el usuario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
      await withUser(usersClient, authClient, usersClientForToken, async ({ owner, user }) => {
        const response = await owner.updateFromRawJson(method, user.id, malformedUserJson);
        expect(response.status()).toBe(400);
        expect(await response.json()).toEqual({ error: 'SyntaxError: Unexpected data in JSON. Please check Your JSON.', details: malformedUserJson });
        await expectPreserved(usersClient, user);
      });
    });

    if (method === 'PATCH') {
      test('devuelve 404 con admin si el usuario no existe', { tag: '@regression' }, async ({ adminUsersClient }) => {
        const response = await adminUsersClient.patchById(missingUserId, userUpdates);
        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({});
      });
    }

    if (method === 'PUT') {
      test('devuelve 422 si falta firstname y conserva el usuario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
        await withUser(usersClient, authClient, usersClientForToken, async ({ owner, user, payload }) => {
          const { email, lastname, password, avatar } = payload;
          const response = await owner.updateById(user.id, { email, lastname, password, avatar });
          expect(response.status()).toBe(422);
          expect(await response.json()).toEqual({ error: {
            message: 'One of mandatory field is missing', details: userRequiredFields,
          } });
          await expectPreserved(usersClient, user);
    });
  });
    }

    if (method === 'PATCH') {
      test('devuelve 422 y conserva el usuario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
        await withUser(usersClient, authClient, usersClientForToken, async ({ owner, user }) => {
          const response = await owner.patchById(user.id, {});
          expect(response.status()).toBe(422);
          expect(await response.json()).toEqual({ error: {
            message: 'No fields were provided! Field validation: no fields present in body',
            details: ['id', 'firstname', 'lastname', 'email', 'avatar', 'password', 'birthDate'],
          } });
          await expectPreserved(usersClient, user);
    });
  });
    }
  });
}

test.describe('DELETE /api/users/:id', () => {
  test('elimina el usuario con su propietario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
    // La limpieza del helper comprueba DELETE 200 y GET 404.
    await withUser(usersClient, authClient, usersClientForToken, async ({ owner, user }) => {
      const response = await owner.getById(user.id);
      expect(response.status()).toBe(200);
      expectSchema(publicUserSchema, await response.json());
    });
  });

  test('devuelve 401 sin autorización y conserva el usuario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
    await withUser(usersClient, authClient, usersClientForToken, async ({ user }) => {
      const response = await usersClient.deleteById(user.id);
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: { message: 'Access token not provided!' } });
      await expectPreserved(usersClient, user);
    });
  });

  test('devuelve 401 con token ajeno y conserva el usuario', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
    await withUser(usersClient, authClient, usersClientForToken, async ({ user }) => {
      await withUser(usersClient, authClient, usersClientForToken, async ({ owner: other }) => {
        const response = await other.deleteById(user.id);
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: { message: 'Access token for given user is invalid!' } });
        await expectPreserved(usersClient, user);
      });
    });
  });

  test('devuelve 404 con admin si el usuario no existe', { tag: '@regression' }, async ({ adminUsersClient }) => {
    const response = await adminUsersClient.deleteById(missingUserId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({});
  });
});

test.describe('HEAD /api/users/:id', () => {
  test('devuelve 200 sin cuerpo si el usuario existe', { tag: '@regression' }, async ({ usersClient, authClient, usersClientForToken }) => {
    await withUser(usersClient, authClient, usersClientForToken, async ({ user }) => {
      const response = await usersClient.headById(user.id);
      expect(response.status()).toBe(200);
      expect(await response.text()).toBe('');
    });
  });

  test('devuelve 404 sin cuerpo si el usuario no existe', { tag: '@regression' }, async ({ usersClient }) => {
    const response = await usersClient.headById(missingUserId);
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('');
  });
});
