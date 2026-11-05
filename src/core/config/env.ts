import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Carga .env.<ENV> y luego .env (dotenv no pisa variables ya definidas, así que gana lo más específico).
const target = process.env.ENV ?? 'local';
for (const file of [`.env.${target}`, '.env']) {
  const full = path.resolve(process.cwd(), file);
  if (fs.existsSync(full)) dotenv.config({ path: full, quiet: true });
}

const schema = z.object({
  ENV: z.enum(['local', 'qa', 'stage']).default('local'),
  BASE_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Defaults válidos solo para GAD local. En qa/stage vienen de .env o secretos de CI.
  QA_USER: z.string().default('admin'),
  QA_PASS: z.string().default('admin'),
  // true = Playwright arranca la app bajo prueba por sí mismo.
  START_APP: z.enum(['true', 'false']).default('false'),
  APP_START_COMMAND: z.string().default('npm --prefix gad-gui-api-demo start'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const detail = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Configuración de entorno inválida:\n${detail}`);
}
const raw = parsed.data;

export const env = {
  name: raw.ENV,
  baseUrl: raw.BASE_URL,
  logLevel: raw.LOG_LEVEL,
  credentials: { username: raw.QA_USER, password: raw.QA_PASS },
  /** true si Playwright debe levantar la app (START_APP=true). */
  startApp: raw.START_APP === 'true',
  /** Comando de arranque de la app cuando startApp es true. */
  appStartCommand: raw.APP_START_COMMAND,
};
