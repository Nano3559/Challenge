import { expect } from '@playwright/test';
import type { ZodTypeAny } from 'zod';

/**
 * Valida el cuerpo de una respuesta contra un esquema zod (contract testing).
 * Ante un fallo muestra exactamente qué campo rompió el contrato.
 */
export function expectSchema(schema: ZodTypeAny, data: unknown): void {
  const result = schema.safeParse(data);
  const detail = result.success
    ? ''
    : result.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join('\n');
  expect(result.success, `El cuerpo no cumple el esquema:\n${detail}`).toBe(true);
}
