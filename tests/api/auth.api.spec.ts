import { test, expect } from '@src/sut/fixtures';
import { expectSchema } from '@src/core';
import { users } from '@src/sut/data/users';
import { loginErrorSchema, loginResponseSchema } from '@src/sut/schemas';

test.describe('POST /api/login', () => {
  test('devuelve un token con credenciales válidas', { tag: '@smoke' }, async ({ authClient }) => {
    const response = await authClient.login(users.valid);

    expect(response.status()).toBe(200);
    expectSchema(loginResponseSchema, await response.json());
  });

  test('devuelve 401 con credenciales inválidas', { tag: '@regression' }, async ({ authClient }) => {
    const response = await authClient.login(users.invalid);

    expect(response.status()).toBe(401);
    expectSchema(loginErrorSchema, await response.json());
  });
});
