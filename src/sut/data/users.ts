import { env } from '@src/core';

/** GAD autentica por email (el super admin por defecto es admin/admin). */
export const users = {
  valid: { email: env.credentials.username, password: env.credentials.password },
  invalid: { email: env.credentials.username, password: 'wrong-password' },
} as const;
