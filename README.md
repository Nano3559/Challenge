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
| `npm run test:coverage:unit` | pruebas unitarias de la herramienta de cobertura |
| `npm run coverage:all` | graba solicitudes de las pruebas API y analiza cobertura |
| `npm run coverage:baseline` | genera los entregables de cobertura en la raíz |

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

## Cobertura de API vs OpenAPI

Herramienta propia (`tools/coverage/`, entrada `coverage-cli.js`) que mide qué parte de la API documentada está realmente cubierta por las pruebas. No confunde "ejecuté una solicitud" con "cubrí el endpoint": mide operaciones (método + path), status codes documentados y parámetros (path/query/header/cookie) ejercitados.

### Instalación y configuración

```bash
npm install                                  # incluye la dependencia yaml
npx playwright install chromium              # solo si vas a correr UI
```

Variables (ver `.env.example`):

| Variable | Default | Descripción |
|---|---|---|
| `COVERAGE_REQUESTS` | `false` | `true` activa la grabación de solicitudes de los clientes API |
| `COVERAGE_REQUESTS_DIR` | `reports/coverage/requests` | directorio de los JSONL grabados |

La grabación se integra en `BaseApiClient` y escribe un archivo por worker (`requests-<pid>.jsonl`). Nunca lanza: un fallo al grabar no rompe el test.

### Uso

```bash
# 1) Ejecutar pruebas API grabando solicitudes
npm run coverage:record -- --project=api

# 2) Analizar contra el OpenAPI y generar reportes
npm run coverage:analyze

# 3) Regenerar los entregables comprometidos en la raíz
npm run coverage:baseline

# Equivalente en un paso (graba + analiza)
npm run coverage:all
```

CLI directa:

```bash
node coverage-cli.js \
  --spec gad-gui-api-demo/public/tools/schema/openapi_rest_demo.json \
  --requests reports/coverage/requests \
  --out reports/coverage \
  --min-coverage 5 \
  --ai-estimates tools/coverage/ai-estimates.json
```

| Opción | Descripción |
|---|---|
| `--spec <ruta>` | OpenAPI 3.x JSON o YAML (obligatorio) |
| `--requests <ruta>` | archivo/directorio de solicitudes (default `reports/coverage/requests`) |
| `--out <dir>` | directorio de salida (default `reports/coverage`) |
| `--min-coverage <0-100>` | falla si la cobertura global baja del umbral |
| `--fail-on-critical-gaps` | falla si hay `uncovered_endpoint` o `untested_method` |
| `--ai-estimates <ruta>` | JSON con dos estimaciones de IA realmente ejecutadas |
| `--tests <ruta>` | ruta mostrada en el baseline (referencia) |
| `--console-limit <n>` | brechas mostradas en consola (default 10) |
| `--no-baseline` | no genera `day-1-baseline.md` |
| `--quiet` | solo warnings/errores |

Códigos de salida: `0` OK · `1` gate incumplido · `2` error de uso/configuración · `3` error inesperado.

### Entregables

| Archivo | Contenido |
|---|---|
| `coverage-cli.js` | entrada estable de la CLI (implementación modular en `tools/coverage/`) |
| `coverage-report.json` | resumen, endpoints/operaciones/status/parámetros, solicitudes sin match y modelo de medición |
| `coverage-gaps.json` | brechas estructuradas (`category`, `endpoint`, `method`, `description`, severidad, id) |
| `day-1-baseline.md` | objetivo, archivos, cobertura de la herramienta, dos estimaciones IA, variación, comparación, brechas, conclusiones y limitaciones |

El modelo global es `(operaciones cubiertas + status cubiertos + parámetros cubiertos) / (operaciones + status + parámetros documentados)`. Los reportes por dimensión se muestran aparte para no esconder que un endpoint "tocado" puede tener métodos, status y parámetros sin cubrir.

### Estimaciones de IA

La herramienta **no inventa** estimaciones. `--ai-estimates` solo registra estimaciones ejecutadas aparte; si se omite, el baseline lo dice explícitamente y no calcula comparación. Para el Día 1 se ejecutaron dos subagentes independientes en contextos nuevos (sin acceso a los reportes) y se guardaron en `tools/coverage/ai-estimates.json`. Resultado: 1.41% y 1.38% vs 1.38% de la herramienta (variación 0.03 pp).

### Limitaciones de la medición

- Solo se graban solicitudes hechas por `APIRequestContext` (clientes del framework). El tráfico que dispara la UI con el navegador no se registra en esta versión.
- La comparación es de contrato: método, path, status y presencia de parámetros. No valida el cuerpo de la respuesta.
- Un `requestBody` documentado no se cuenta como parámetro.
- No se resuelven `$ref` remotos ni servidores con variables complejas.
- `default` se considera cubierto si se observó un status que no coincide con ningún código explícito documentado.

### CI

`.github/workflows/api-coverage.yml` compara el SHA base y el SHA del PR con el mismo commit de GAD y las mismas pruebas/configuración. Mide cobertura de contrato OpenAPI y cobertura Node con c8/V8, genera una comparación JSON/Markdown/HTML, publica el resumen en *Summary* y adjunta artefactos de cada rama y el reporte comparativo. El gate OpenAPI mínimo conserva el default de 1.0%; brechas críticas son opcionales. `.github/workflows/api-coverage-comment.yml` actualiza un único comentario en el PR mediante `workflow_run`.

La cobertura de código solo mide archivos Node seleccionados en GAD durante pruebas API. El JavaScript ejecutado exclusivamente en el navegador no se instrumenta y se informa como fuera de alcance; cualquier dato ausente aparece como **Unavailable**, nunca como 0%. Las métricas OpenAPI (operaciones, estados y parámetros) son una dimensión separada y no sustituyen line/branch/function coverage.


## Pipeline (GitHub Actions)
- `pr-smoke.yml`: en cada PR y manual. Lint, typecheck y `@smoke`.
- `nightly.yml`: lunes a viernes 06:00 UTC (02:00 Bolivia) y manual (con filtro `grep`). Shards en paralelo + job que une los reportes.
- `api-coverage.yml`: en cada PR y manual. Graba solicitudes de las pruebas API, calcula cobertura contra el OpenAPI y falla bajo el umbral configurable (o con brechas críticas si se activa). Sube los reportes como artefactos.

## IA
- `CLAUDE.md` se conserva como archivo de convenciones del framework; no implica uso de proveedor Claude.
- `.agents/day4/` define los roles locales Codex de Feature Development y Test Generation.
- `.github/workflows/day4-agent-handoff.yml` empaqueta una solicitud de feature o un artifact de cobertura; no llama a ningún proveedor de modelos.
- `.github/workflows/api-coverage.yml` genera `day4-agent-handoff` en cada comparación base/PR.
- `npm run agents:finish-feature` y `npm run agents:finish-tests` validan alcance, pruebas y publicación al branch actual del PR.
- La orquestación de razonamiento se inicia desde sesiones locales Codex, mientras GitHub Actions entrega artifacts y valida cada push. Ver [Day 4 Multi-Agent Pipeline](docs/DAY-4-MULTI-AGENT.md).

## Experimento del Día 1 (adaptado a GAD)
Ver `docs/PROMPTS.md` y `docs/COMPARACION.md`. Endpoint: `GET /api/articles/:id`.
