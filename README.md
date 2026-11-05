# QA Playwright Framework — adaptado a GAD

Framework de automatización (API + UI) con Playwright y TypeScript sobre **GAD** (`gad-gui-api-demo`): core reutilizable, SUT por capas, reportes, pipeline en GitHub Actions e integración con IA.

## Inicio rápido
```bash
npm install
npx playwright install chromium      # solo la primera vez (necesario para UI)
npm run app                          # levanta GAD en http://localhost:3000
npm test                             # API + UI contra GAD
```

Credenciales de GAD: `admin` / `admin`.

| Comando | Qué hace |
|---|---|
| `npm run app` | levanta GAD en http://localhost:3000 |
| `npm run test:smoke` | solo `@smoke` (rápido, el que corre en cada PR) |
| `npm run test:regression` | solo `@regression` |
| `npm run test:api` / `test:ui` | por proyecto |
| `npm run test:failed` | re-ejecuta solo lo que falló la última vez |
| `npm run test:debug` | modo depuración |
| `npm run report` | abre el reporte HTML |
| `npm run ci:check` | lint + typecheck |

## Ambientes
`ENV=qa npm test` carga `.env.qa` (luego `.env`). Ver `.env.example`.
`START_APP=true` hace que Playwright levante GAD solo (por defecto se asume que ya está corriendo).

## Arquitectura
- **core** (`src/core`): `BaseApiClient`, `BasePage`, `env`, `logger`, `expectSchema`, reporter de fallos. Agnóstico de la app.
- **sut** (`src/sut`): clientes, pages, esquemas, datos y fixtures de GAD. Para cambiar de app se reemplaza esta carpeta.
- Patrones: capas, Page Object, API Client/Service Object, Template Method (clases base), Inyección de dependencias (fixtures), Contract Testing (zod).

## GAD
- UI, API REST, Swagger (`/swagger`), WebSockets, feature flags y bug flags.
- Login API: `POST /api/login` → `{ access_token }`. También setea cookies para la UI.
- Reset de datos: `POST /api/restoreDB`, `POST /api/restoreTinyDB`, `POST /api/restoreBigDB`, etc.
- OpenAPI: `gad-gui-api-demo/public/tools/schema/openapi_*.json`.

## Reportes y seguimiento de fallos
`playwright-report/` (HTML con trazas, capturas, video de fallos) · `reports/junit.xml` (CI) · `reports/failure-summary.md|json` (fallos, flaky, más lentos). En GitHub el resumen aparece en la pestaña *Summary* de cada corrida.

## Pipeline (GitHub Actions)
- `pr-smoke.yml`: en cada PR y manual. Lint, typecheck y `@smoke`.
- `nightly.yml`: lunes a viernes 06:00 UTC (02:00 Bolivia) y manual (con filtro `grep`). Shards en paralelo + job que une los reportes.

## IA
- `CLAUDE.md`: convenciones como contexto.
- `.claude/skills/`: `add-api-test`, `add-page-object`, `triage-failure`.
- `.claude/agents/`: `test-reviewer` y `failure-triager`.
- `.mcp.json`: Playwright MCP para explorar la página real y proponer locators.

## Experimento del Día 1 (adaptado a GAD)
Ver `docs/PROMPTS.md` y `docs/COMPARACION.md`. Endpoint: `GET /api/articles/:id`.
