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
  QA_REGISTERED_USER: z.string().email().default('Moses.Armstrong@Feest.ca'),
  QA_REGISTERED_PASS: z.string().min(1).default('test1'),
  QA_BOOK_MANAGER_USER: z.string().email().default('v.cortez@test.test'),
  QA_BOOK_MANAGER_PASS: z.string().min(1).default('1234'),
  QA_BOOK_READER_USER: z.string().email().default('Danial.Dicki@dicki.test'),
  QA_BOOK_READER_PASS: z.string().min(1).default('test2'),
  // true = Playwright arranca la app bajo prueba por sí mismo.
  START_APP: z.enum(['true', 'false']).default('false'),
  APP_START_COMMAND: z.string().default('npm --prefix gad-gui-api-demo start'),
  // true = los clientes de API graban solicitudes para el análisis de cobertura.
  COVERAGE_REQUESTS: z.enum(['true', 'false']).default('false'),
  COVERAGE_REQUESTS_DIR: z.string().default('reports/coverage/requests'),
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
  registeredCredentials: { email: raw.QA_REGISTERED_USER, password: raw.QA_REGISTERED_PASS },
  bookManagerCredentials: { email: raw.QA_BOOK_MANAGER_USER, password: raw.QA_BOOK_MANAGER_PASS },
  bookReaderCredentials: { email: raw.QA_BOOK_READER_USER, password: raw.QA_BOOK_READER_PASS },
  /** true si Playwright debe levantar la app (START_APP=true). */
  startApp: raw.START_APP === 'true',
  /** Comando de arranque de la app cuando startApp es true. */
  appStartCommand: raw.APP_START_COMMAND,
  /** true si los clientes de API deben grabar solicitudes para cobertura. */
  coverageEnabled: raw.COVERAGE_REQUESTS === 'true',
  /** Directorio donde el recorder escribe los JSONL. */
  coverageRequestsDir: raw.COVERAGE_REQUESTS_DIR,
};
