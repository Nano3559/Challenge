import { env } from '@src/core';

export type UserCreate = {
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  avatar: string;
};

export function buildUser(): UserCreate {
  return {
    email: `qa-${crypto.randomUUID()}@test.test.dev`,
    firstname: 'Usuario',
    lastname: 'Automatizado',
    password: 'Qa-test-123!',
    avatar: '/data/users/default.jpg',
  };
}

export const userUpdates = { firstname: 'Actualizado', lastname: 'Modificado' } as const;
export const missingUserId = 999_999;
export const malformedUserJson = '{"email":';
export const userRequiredFields = ['firstname', 'lastname', 'email', 'avatar', 'password'] as const;

export function buildUserWithout(field: keyof UserCreate): Partial<UserCreate> {
  const user: Partial<UserCreate> = buildUser();
  delete user[field];
  return user;
}

/** GAD autentica por email (el super admin por defecto es admin/admin). */
export const users = {
  valid: { email: env.credentials.username, password: env.credentials.password },
  registered: env.registeredCredentials,
  invalid: { email: env.credentials.username, password: 'wrong-password' },
} as const;
