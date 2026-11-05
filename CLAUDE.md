# Convenciones del framework de pruebas (Playwright + TypeScript + GAD)

Fuente de verdad. Todo test nuevo debe seguirlo al pie de la letra.

## 1. Estructura

```
src/core/            CORE agnóstico de la app. No conoce ninguna página
  api/               BaseApiClient (headers, Bearer token, logging)
  pages/             BasePage (navegación, byTestId, byId, byRole)
  config/env.ts      Ambientes (ENV=local|qa|stage) validados con zod
  utils/             logger, expectSchema (contratos)
  reporters/         failure-summary.reporter.ts (resumen de fallos, flaky y lentos)
src/sut/             Todo lo específico de GAD (sistema bajo prueba)
  api/               <recurso>.client.ts, extienden BaseApiClient
  pages/             <pagina>.page.ts, extienden BasePage
  schemas/           Esquemas zod de respuestas (contract testing)
  data/              Datos estables y Data Builders. Sin datos "hardcodeados" en specs
  fixtures/index.ts  Único punto de entrada de `test` y `expect`
tests/api/           <recurso>.api.spec.ts
tests/ui/            <flujo>.ui.spec.ts
gad-gui-api-demo/    App bajo prueba (GAD). SOLO lectura: nunca se modifica
app/                 App sandbox legacy; ya no se usa
.github/workflows/   pr-smoke.yml (cada PR) y nightly.yml (regresión con shards)
.claude/             skills y agentes de IA; .mcp.json (Playwright MCP)
```

Dependencias: `core` no importa de `sut`. `sut` importa de `core`. Los specs importan de `@src/sut/*` y `@src/core`.

GAD corre en `http://localhost:3000` (`npm run app`). Credenciales por defecto: `admin` / `admin`.

## 2. Nomenclatura

- Archivos: `kebab-case` con sufijo de tipo (`.client.ts`, `.page.ts`, `.api.spec.ts`, `.ui.spec.ts`).
- Clases: `PascalCase` + sufijo (`ArticlesClient`, `LoginPage`). Métodos: `camelCase`, verbo primero (`list`, `getById`, `login`).
- Un `test.describe` por endpoint o flujo. En API el título es `'<MÉTODO> /ruta'` (ej. `'GET /api/articles/:id'`).
- Títulos de `test(...)` en español, en presente, describiendo el comportamiento: `'devuelve 404 si el artículo no existe'`.
- Locators por `data-testid` (`byTestId`), roles accesibles (`byRole`) o `id` estable del HTML (`byId`). Prohibido CSS/XPath frágil.

## 3. Reglas de código

- Importar `test` y `expect` SIEMPRE desde `@src/sut/fixtures`, nunca desde `@playwright/test`.
- Los specs NO llaman `request.get(...)` ni `page.locator(...)`: usan clientes y page objects.
- Clientes y page objects NO contienen aserciones. Las aserciones viven solo en los specs.
- Sin `waitForTimeout` ni sleeps: aserciones web-first (`await expect(locator)...`).
- Cada test es independiente: crea su propia sesión vía fixtures. Prohibido depender del orden o del estado de otro test.
- Para tests que escriben datos, resetear el dataset con los endpoints de GAD (`POST /api/restoreTinyDB` o `POST /api/restoreDB`) o crear datos propios y limpiarlos.
- Datos de prueba desde `src/sut/data/` (ej. `knownArticle.id`). Credenciales y URLs solo desde `env`.
- Sin `any`, `test.only` ni `console.log` (usar `logger`). `npm run ci:check` debe pasar.

## 4. Tags

Todo test lleva un tag como segundo argumento: `test('...', { tag: '@smoke' }, async ...)`.
- `@smoke`: camino crítico, rápido, corre en cada PR (máx. ~5 min en total).
- `@regression`: el resto; corre en la ejecución nocturna.

## 5. Estilo de aserciones

API (orden fijo: estado -> cuerpo):
1. `expect(response.status()).toBe(<código>)`
2. Contrato en respuestas exitosas: `expectSchema(<schema>, body)`.
3. Valores: `toEqual` (respuestas exactas, p. ej. errores) o `toMatchObject` + matchers (`expect.any(Number)`).
4. Un caso = un test.

UI: aserciones web-first sobre locators (`toBeVisible`, `toHaveText`, `toHaveCount`, `toHaveURL`).

## 6. Procedimiento para añadir una prueba

1. Revisar `gad-gui-api-demo/routes/`, `gad-gui-api-demo/endpoints/` o `gad-gui-api-demo/public/tools/schema/openapi_*.json` y los specs existentes del recurso para no duplicar casos.
2. Si falta el método en el cliente o el locator en el page object, agregarlo ahí (sin aserciones).
3. Si faltan esquema o datos: `src/sut/schemas/`, `src/sut/data/`.
4. Agregar el test dentro del `describe` del endpoint (o crear `tests/api/<recurso>.api.spec.ts`).
5. Cubrir como mínimo: caso feliz + caso de error principal (404/400/401 según aplique), con tags.
6. Ejecutar `npm run ci:check` y `npm run test:api` (o `test:ui`). Todo debe pasar.
7. No modificar `gad-gui-api-demo/` (es la app bajo prueba) ni los tests existentes.

## 7. Seguimiento de fallos

Cada ejecución genera `reports/failure-summary.md` (+ `.json`) con fallos, tests flaky (pasaron tras reintentar) y los 5 más lentos, y `playwright-report/` (HTML). Con fallos, usar la skill `triage-failure` o el agente `failure-triager`. Un test flaky es un defecto: se arregla o se pone en cuarentena con un issue, nunca se ignora.

## 8. Ejemplos de referencia

`tests/api/articles.api.spec.ts` (API), `tests/api/auth.api.spec.ts` (login) y `tests/ui/login.ui.spec.ts` (UI).
