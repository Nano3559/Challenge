# HANDOVER.md — Continuidad técnica del proyecto

> Documento de traspaso para continuar el trabajo desde otra sesión o IA sin repetir análisis.
> Generado el **2026-11-05** a partir del estado real del repositorio.

## Datos de referencia

| Dato | Valor |
|---|---|
| Proyecto | `qa-playwright-framework` adaptado a GAD |
| Ruta local | `C:\Users\Fernando Hinojosa\Documents\SES\ChallengeFer` |
| Rama actual | `main` |
| Último commit | `84e56d6 chore: eliminar sandbox legacy y endurecer .gitignore` |
| Commit anterior relevante | `ea3525d cobertura OpenAPI: herramienta, baseline dia 1 y CI` |
| Remoto | **No configurado** (`git remote -v` vacío) |
| Estado del árbol | Limpio, salvo `HANDOVER.md` que se genera con este documento y queda sin commitear |
| Node local | v24.11.1 (observado durante el desarrollo) |
| Node en CI | 22 |
| App bajo prueba | GAD en `http://localhost:3000` |
| Credenciales GAD | `admin` / `admin` |

---

## 1. Resumen del proyecto

### Objetivo principal

Construir un framework de automatización de pruebas **API + UI con Playwright y TypeScript** sobre **GAD** (`gad-gui-api-demo`), con:

- Arquitectura core/SUT reutilizable.
- Pruebas API y UI con convenciones documentadas.
- Experimento del Día 1 A/B (con y sin convenciones).
- Herramienta de cobertura que compare las solicitudes reales de las pruebas contra el OpenAPI de GAD.
- Reportes JSON, baseline del Día 1 y pipeline de CI.
- Uso responsable de IA: dos estimaciones independientes, sin inventar resultados.

### Arquitectura y tecnologías

- **Lenguaje:** TypeScript (framework), Node.js CommonJS (herramienta de cobertura).
- **Testing:** Playwright `^1.49.0` (`@playwright/test`), proyectos `api` y `ui`.
- **Contratos:** `zod` `^4.6.7` mediante `expectSchema`.
- **Configuración:** `dotenv` `^18.0.9` + validación con `zod` en `src/core/config/env.ts`.
- **Linting:** ESLint `^10.14.0` + `typescript-eslint` + `eslint-plugin-playwright`.
- **Cobertura OpenAPI:** Node.js + `yaml` `^2.9.1`.
- **CI:** GitHub Actions (`pr-smoke.yml`, `nightly.yml`, `api-coverage.yml`).
- **App bajo prueba:** GAD, repo anidado e ignorado por git; **solo lectura**.

### Estructura relevante

```text
ChallengeFer/
├── src/
│   ├── core/                    # Agnóstico de la app
│   │   ├── api/
│   │   │   ├── base-api.client.ts
│   │   │   └── request-recorder.ts
│   │   ├── config/env.ts
│   │   ├── pages/base.page.ts
│   │   ├── reporters/failure-summary.reporter.ts
│   │   ├── utils/{logger,schema}.ts
│   │   └── index.ts
│   └── sut/                     # Específico de GAD
│       ├── api/{articles,auth}.client.ts
│       ├── pages/login.page.ts
│       ├── schemas/index.ts
│       ├── data/{articles,users}.ts
│       └── fixtures/index.ts
├── tests/
│   ├── api/{articles,auth}.api.spec.ts
│   └── ui/login.ui.spec.ts
├── tools/coverage/
│   ├── bin/{coverage-cli,record-tests}.js
│   ├── lib/{analyzer,openapi-parser,request-store,...}.js
│   ├── test/*.test.js + fixtures/
│   ├── ai-estimate-1.json
│   ├── ai-estimate-2.json
│   └── ai-estimates.json
├── docs/{PROMPTS,COMPARACION}.md
├── .github/workflows/{pr-smoke,nightly,api-coverage}.yml
├── .claude/                     # Skills y agentes de IA
├── coverage-cli.js              # Entrada estable de la CLI
├── coverage-report.json         # Entregable comprometido
├── coverage-gaps.json           # Entregable comprometido
├── day-1-baseline.md            # Entregable comprometido
├── package.json
├── playwright.config.ts
├── CLAUDE.md
├── README.md
└── gad-gui-api-demo/            # Ignorado; app bajo prueba
```

---

## 2. Estado actual

### Funcionalidades implementadas

1. **Framework base adaptado a GAD**
   - `BaseApiClient` con métodos `get/post/put/delete`, logging y grabación opcional.
   - `BasePage` con navegación y locators estables.
   - Configuración por ambiente validada con `zod`.
   - Reporter de resumen de fallos/flaky/lentos.

2. **SUT de GAD**
   - `ArticlesClient.list()` y `getById()`.
   - `AuthClient.login()` y `validate()` (este último sin test).
   - `LoginPage` para UI.
   - Esquemas zod y datos estables.
   - Fixtures: `authClient`, `articlesClient`, `authenticatedArticlesClient`, `loginPage`.

3. **Pruebas**
   - API: `GET /api/articles`, `GET /api/articles/:id` (200 y 404), `POST /api/login` (200 y 401).
   - UI: login con credenciales válidas e inválidas.
   - Total: **7 tests**, todos pasan.

4. **Experimento Día 1 A/B**
   - Escenario A (`prueba-a-sin-convenciones`, commit `89c4c88`): 4/13 convenciones.
   - Escenario B (`prueba-b-con-convenciones`, commit `2c203d0`): 13/13 convenciones.
   - `main` contiene B.
   - Documentado en `docs/COMPARACION.md` y `docs/PROMPTS.md`.
   - Caveat: A se simuló en la misma sesión con `CLAUDE.md` disponible; no fue una sesión ciega.

5. **Herramienta de cobertura OpenAPI**
   - Parsea OpenAPI 3.x JSON/YAML: paths, métodos, parámetros (path/query/header/cookie), responses, `$ref` locales, servidores.
   - Carga solicitudes grabadas en JSONL/NDJSON/JSON.
   - Normaliza prefijos de servidor (`/api`).
   - Calcula cobertura de endpoints, operaciones, status codes y parámetros.
   - Distingue endpoint `full`, `partial` y `none`.
   - Genera brechas con categoría, endpoint, método, severidad, descripción e id.
   - Genera reporte de consola, `coverage-report.json`, `coverage-gaps.json` y `day-1-baseline.md`.
   - Gate configurable con `--min-coverage` y `--fail-on-critical-gaps`.
   - Códigos de salida: `0` OK, `1` gate, `2` uso/configuración, `3` inesperado.

6. **Grabación de solicitudes**
   - Integrada en `BaseApiClient` mediante `getRequestRecorder()`.
   - Activable con `COVERAGE_REQUESTS=true`.
   - Escribe un JSONL por proceso/worker en `COVERAGE_REQUESTS_DIR`.
   - Redacta headers sensibles y solo guarda nombres de cookies.
   - Nunca lanza: un fallo de grabación no rompe el test.

7. **Baseline y estimaciones de IA**
   - Herramienta real: **1.38% global** (9/653 unidades).
   - IA 1: **1.41%**; IA 2: **1.38%**.
   - Variación entre estimaciones: **0.03 pp**.
   - Diferencias vs herramienta: **+0.03 pp** y **0.00 pp**.
   - Las estimaciones se ejecutaron en subagentes independientes, en contextos nuevos, sin acceso a reportes ni a `tools/coverage/`.

8. **CI**
   - `pr-smoke.yml`: lint, typecheck y `@smoke`.
   - `nightly.yml`: regresión con shards y unión de reportes.
   - `api-coverage.yml`: clona GAD, instala, valida, ejecuta unit tests de la herramienta, graba solicitudes API, corre la CLI, publica artefactos y aplica gate.

9. **Documentación**
   - `README.md` con instalación, comandos, cobertura, limitaciones y CI.
   - `CLAUDE.md` con estructura, convenciones, sección de cobertura y procedimiento para nuevas pruebas.
   - `docs/` con prompts y comparación A/B.

### Archivos creados o modificados

**Raíz**
- `package.json`, `package-lock.json`, `playwright.config.ts`, `tsconfig.json`, `eslint.config.mjs`
- `.env.example`, `.gitignore`
- `README.md`, `CLAUDE.md`, `HANDOVER.md`
- `coverage-cli.js`, `coverage-report.json`, `coverage-gaps.json`, `day-1-baseline.md`

**Core**
- `src/core/api/base-api.client.ts`
- `src/core/api/request-recorder.ts`
- `src/core/config/env.ts`
- `src/core/index.ts`
- `src/core/pages/base.page.ts`
- `src/core/reporters/failure-summary.reporter.ts`
- `src/core/utils/{logger,schema}.ts`

**SUT y tests**
- `src/sut/api/{articles,auth}.client.ts`
- `src/sut/pages/login.page.ts`
- `src/sut/schemas/index.ts`
- `src/sut/data/{articles,users}.ts`
- `src/sut/fixtures/index.ts`
- `tests/api/{articles,auth}.api.spec.ts`
- `tests/ui/login.ui.spec.ts`

**Herramienta de cobertura**
- `tools/coverage/bin/{coverage-cli,record-tests}.js`
- `tools/coverage/lib/{errors,log,openapi-parser,request-store,analyzer,console-report,json-writer,ai-estimates,baseline}.js`
- `tools/coverage/test/*.test.js`
- `tools/coverage/test/fixtures/*`
- `tools/coverage/ai-estimate-{1,2}.json` y `ai-estimates.json`

**CI, IA y docs**
- `.github/workflows/{pr-smoke,nightly,api-coverage}.yml`
- `.claude/agents/*`, `.claude/skills/*`, `.mcp.json`
- `docs/{PROMPTS,COMPARACION}.md`

### Componentes terminados

- Framework API + UI funcionando contra GAD.
- Experimento A/B y documentación.
- Herramienta de cobertura completa y probada.
- Reportes y baseline del Día 1.
- CI de cobertura.
- Documentación de uso y convenciones.
- Eliminación total del sandbox legacy (`app/`).

### Componentes pendientes

**No hay pendientes bloqueantes ni trabajo a medio implementar.** Todo lo solicitado en el alcance original está cerrado y commiteado. Lo que queda es backlog de mejora continua (ver sección 6).

### Últimos cambios realizados

- Commit `ea3525d`: herramienta de cobertura, baseline del Día 1 y workflow de CI.
- Commit `84e56d6`: eliminación de `app/` (sandbox legacy), limpieza de referencias, eliminación del script `app:sandbox`, `/app/` agregado al `.gitignore` y endurecimiento general del `.gitignore`.
- Validaciones posteriores: `ci:check` OK, `npm test` 7/7, `git status` limpio.

---

## 3. Decisiones técnicas

### Arquitectura

- **Separación `core` / `sut` / `tests`:** `core` no conoce GAD; `sut` contiene todo lo específico; los specs usan clientes/page objects y fixtures. Esto permite reemplazar la app bajo prueba sin tocar el core.
- **Clientes sin aserciones:** las aserciones viven solo en los specs.
- **Fixtures como único punto de entrada:** los tests importan `test`/`expect` desde `@src/sut/fixtures`.
- **Herramienta de cobertura desacoplada:** CommonJS bajo `tools/coverage/`, sin build de TypeScript, con entrada estable `coverage-cli.js`.
- **Grabación en el cliente base:** cualquier cliente que herede de `BaseApiClient` graba automáticamente si la variable de entorno está activa.

### Librerías

- **Playwright** para API y UI.
- **zod** para contratos de respuesta.
- **dotenv** para ambientes.
- **yaml** para parsear OpenAPI YAML.
- **ESLint + typescript-eslint + eslint-plugin-playwright** para calidad.
- No se agregaron frameworks de test adicionales para la herramienta: se usa `node:test`.

### Configuraciones importantes

- `BASE_URL=http://localhost:3000`.
- `START_APP=false` por defecto; GAD se levanta manualmente con `npm run app`.
- `START_APP=true` hace que Playwright levante GAD y espere `GET /api/health`.
- `COVERAGE_REQUESTS=false` por defecto; se activa desde `record-tests.js`.
- `COVERAGE_REQUESTS_DIR=reports/coverage/requests`.
- CI usa Node 22; local se observó Node 24.11.1.
- `reports/` está ignorado; los entregables de la raíz sí se versionan.
- `gad-gui-api-demo/` está ignorado y es de solo lectura.
- `app/` fue eliminado y agregado al `.gitignore`.

### Modelo de cobertura

```text
unidadesTotales   = operaciones documentadas + status codes documentados + parámetros documentados
unidadesCubiertas = operaciones ejecutadas + status observados + parámetros ejercitados
coberturaGlobal   = unidadesCubiertas / unidadesTotales * 100
```

- Un endpoint está cubierto si al menos una operación recibió una solicitud que matchea la spec.
- Un endpoint es `full` solo si todas sus operaciones, status y parámetros están cubiertos.
- Un parámetro cuenta solo si se envió en la ubicación documentada (`path`, `query`, `header`, `cookie`).
- Un status cuenta solo si se observó exactamente ese código; se soportan rangos (`2XX`) y `default`.
- Las brechas de status/parámetros de operaciones no ejecutadas se incluyen como `low` para no duplicar el peso de `untested_method`.

### Severidades

| Categoría | Severidad |
|---|---|
| `uncovered_endpoint` | critical |
| `untested_method` | critical |
| `unexecuted_status_code` | high si la operación fue ejecutada; low si no |
| `untested_parameter` | medium si la operación fue ejecutada; low si no |

### Decisiones sobre IA

- Las estimaciones de IA **no las genera la herramienta**.
- Se ejecutaron dos subagentes independientes, con instrucción explícita de no leer reportes ni `tools/coverage/`.
- Se persisten en JSON para no transcribir ni alterar valores.
- Si no hay estimaciones, el baseline lo indica explícitamente y no calcula comparación. **Nunca se inventan porcentajes.**

### Decisiones de CI

- `--min-coverage` por defecto en `1.0%`, configurable en `workflow_dispatch`.
- `--fail-on-critical-gaps` está desactivado por defecto porque la línea base tiene **300 brechas críticas**; activarlo bloquearía todos los PRs.
- El gate queda listo para endurecerse a medida que suba la cobertura.
- Los reportes se suben como artefactos y el baseline se publica en *Summary*.

### Decisiones de alcance

- Se eliminó el sandbox `app/` porque el foco es exclusivamente GAD. El script `app:sandbox` ya no existe.
- Se mantiene GAD como repo anidado ignorado, no como parte del repo principal.

---

## 4. Trabajo realizado

### Tareas completadas

1. Adaptación completa del framework a GAD.
2. Configuración de ambientes y credenciales.
3. Clientes API, page object, esquemas, datos y fixtures.
4. Pruebas API y UI.
5. Experimento A/B y documentación comparativa.
6. Implementación de la herramienta de cobertura OpenAPI.
7. Grabación de solicitudes en `BaseApiClient`.
8. Pruebas unitarias de la herramienta.
9. Ejecución real sobre GAD y generación de reportes.
10. Dos estimaciones independientes de IA y baseline del Día 1.
11. Workflow de CI para cobertura.
12. Actualización de `README.md` y `CLAUDE.md`.
13. Endurecimiento de `.gitignore`.
14. Eliminación total del sandbox legacy.

### Pruebas ejecutadas y resultados

| Comando | Resultado |
|---|---|
| `npm run test:coverage:unit` | **25/25 pass** |
| `npm test` | **7/7 pass** (API + UI) |
| `npm run ci:check` | lint + typecheck OK |
| `npm run coverage:record -- --project=api` | 5 tests pass, 5 solicitudes en 4 JSONL |
| `npm run coverage:analyze` | 1.38% global, 777 brechas |
| Gate `--min-coverage 1` | exit `0` |
| Gate `--min-coverage 99` | exit `1` |
| Gate `--fail-on-critical-gaps` | exit `1` (300 críticas) |
| Parseo YAML de workflows y JSON de reportes | OK |

### Resultado real de cobertura

| Dimensión | Cubierto | Total | % |
|---|---:|---:|---:|
| Endpoints | 3 | 136 | 2.21% |
| Operaciones | 3 | 170 | 1.76% |
| Status codes | 5 | 387 | 1.29% |
| Parámetros | 1 | 96 | 1.04% |
| **Global** | **9** | **653** | **1.38%** |

Brechas: **777** en total.

| Categoría | Cantidad |
|---|---:|
| `unexecuted_status_code` | 382 |
| `untested_method` | 167 |
| `uncovered_endpoint` | 133 |
| `untested_parameter` | 95 |

Brechas críticas: **300** (`uncovered_endpoint` + `untested_method`). Severidades `high` y `medium`: **0**, porque las 3 operaciones ejecutadas cubrieron todos sus status y parámetros documentados.

### Errores encontrados y solucionados

1. **`node --test tools/coverage/test` falla en Node 24**
   - Error: no encuentra el directorio como módulo.
   - Solución: script `test:coverage:unit` usa el glob entre comillas: `node --test "tools/coverage/test/*.test.js"`.

2. **TypeScript: `response.request()` no existe en `APIResponse`**
   - Solución: el recorder usa los headers enviados explícitamente por el cliente (`this.headers`) en lugar de intentar leer la request desde la respuesta.
   - Consecuencia: no se registran headers que Playwright agrega automáticamente (accept, content-type, cookies del contexto). Es una limitación conocida.

3. **ESLint fallaba en archivos CommonJS de la herramienta**
   - `@typescript-eslint/no-require-imports` y `no-console`.
   - Solución: override en `eslint.config.mjs` para `tools/**/*.js` y `coverage-cli.js`.

4. **El analyzer no inicializaba los parámetros de cada operación**
   - Provocaba `undefined` al consultar `parameterStats`.
   - Solución: inicializar el `Map` de parámetros (`covered`, `observedValues`) al crear las estadísticas de cada operación.

5. **Manejo de `default` en status codes**
   - Se necesitaba conocer los códigos explícitos de cada operación para decidir si un status observado cae en `default`.
   - Solución: pasar `explicitCodes` a `buildStatusCoverage`/`statusMatches`.

6. **PowerShell 5 no soporta `&&`**
   - No es un error del proyecto, pero afecta comandos manuales en Windows.
   - Solución: ejecutar comandos por separado o usar `;`.

### Problemas conocidos / limitaciones

- **Cobertura baja:** 1.38% global; 300 brechas críticas. Es esperable en el Día 1, no es un bug.
- **IA 1 vs herramienta:** IA 1 contó 167 operaciones / 378 status / 93 parámetros, mientras la herramienta y IA 2 contaron 170 / 387 / 96. La diferencia está documentada; su porcentaje final quedó muy cerca (1.41% vs 1.38%).
- **Solo se graba tráfico de `APIRequestContext`:** el tráfico que dispara la UI con el navegador no se registra en esta versión.
- **No se valida el cuerpo de la respuesta:** la comparación es de contrato (método, path, status, parámetros).
- **`requestBody` no cuenta como parámetro** y su cobertura no se mide.
- **Headers automáticos no se registran:** el recorder solo guarda headers explícitos del cliente; puede subestimar parámetros de tipo header.
- **Path atípico en el OpenAPI:** `/api/books/{id}` incluye el prefijo `/api` dentro del path, a diferencia del resto. El matcher lo trata como path literal; tenerlo en cuenta si se agregan tests de ese recurso.
- **`$ref` remotos y servidores con variables complejas** no se resuelven por completo.
- **`default`:** se considera cubierto si se observó un status que no coincide con ningún código explícito documentado.
- **Estimaciones de IA estáticas:** `tools/coverage/ai-estimates.json` es una foto del Día 1. Si la cobertura cambia, el baseline seguirá mostrando esas estimaciones históricas; no deben interpretarse como una medición actual.
- **`generatedAt` cambia en cada regeneración:** `coverage-report.json`, `coverage-gaps.json` y `day-1-baseline.md` generan diff cada vez que se ejecuta `coverage:baseline`.
- **`npm install yaml` reportó 10 vulnerabilidades moderadas** de dependencias; no se ejecutó `npm audit fix`. Verificar con `npm audit` antes de decidir.
- **El repo no tiene remoto configurado**; los commits existen solo en la máquina local.
- **Node local 24 vs CI 22:** validar comandos que dependan de la versión antes de asumir paridad.

---

## 5. Punto exacto de continuación

### Última tarea realizada

Eliminación del sandbox legacy y endurecimiento del `.gitignore`, commiteada en `84e56d6`. El árbol de trabajo quedó limpio y todas las validaciones pasaron.

### Qué se estaba intentando implementar

Nada quedó a medio implementar. La última tarea era de limpieza de alcance y se completó.

### Qué quedó incompleto

**No hay código incompleto ni tests fallando.** El único archivo pendiente es este `HANDOVER.md`, que al generarse queda sin commitear.

### Archivo y función donde debe continuar

No hay una función a medio escribir. La siguiente línea de trabajo recomendada es ampliar cobertura API, empezando por una operación documentada y no testeada:

- **Test a agregar:** `GET /api/login` con token válido (status 200).
- **Cliente:** `AuthClient.validate()` ya existe en `src/sut/api/auth.client.ts` y hace `GET /api/login`; **no requiere cambios**.
- **Fixture faltante:** no hay un `AuthClient` autenticado. Hay que agregar `authenticatedAuthClient` en `src/sut/fixtures/index.ts`, siguiendo el patrón de `authenticatedArticlesClient`.
- **Spec:** agregar un `test.describe('GET /api/login', ...)` en `tests/api/auth.api.spec.ts`.
- **Restricción:** no modificar `gad-gui-api-demo/`; solo el framework.

### Próxima acción concreta

1. Agregar `authenticatedAuthClient` a `src/sut/fixtures/index.ts`:
   - Hacer login con `AuthClient.login(users.valid)`.
   - Extraer `access_token`.
   - Exponer `new AuthClient(request, token)`.
2. Agregar en `tests/api/auth.api.spec.ts` un test `@regression` para `GET /api/login` que espere `200` y valide el contrato correspondiente (verificar primero el esquema real de GAD; no inventarlo).
3. Ejecutar `npm run test:api` y `npm run ci:check`.
4. Regenerar cobertura:
   ```bash
   npm run coverage:record -- --project=api
   npm run coverage:baseline
   ```
5. Revisar el delta en `coverage-report.json` y `coverage-gaps.json`. No se debe asumir un porcentaje nuevo sin regenerar y verificar.
6. Si el resultado es correcto, commitear test + reportes actualizados.

> Si se prefiere otra prioridad, elegir **una sola operación** del OpenAPI, verificar su contrato real y repetir el ciclo. No intentar cubrir todo el spec en un solo cambio.

---

## 6. Pendientes

### Alta prioridad

1. **Ampliar cobertura API de forma incremental.**
   - Empezar por `GET /api/login` (cliente ya existe).
   - Luego recursos centrales: `articles`, `users`, `books`/`book-shop-*` según prioridad del producto.
   - Medir el delta con la herramienta después de cada bloque de tests.

2. **Definir la política de gate de CI.**
   - Subir `min-coverage` gradualmente desde 1.0%.
   - Evaluar activar `fail-on-critical-gaps` cuando la línea base deje de tener 300 críticas.
   - Documentar el umbral acordado en `README.md` y `CLAUDE.md`.

3. **Commitear `HANDOVER.md`.**
   - Actualmente es el único archivo sin versionar.

### Prioridad media

4. **Cubrir parámetros y status de operaciones ya ejecutadas.**
   - `ArticlesClient.list()` acepta `userId`, `q`, `_limit`; verificar cuáles documenta el OpenAPI y agregar casos.
   - Añadir errores 4xx/5xx documentados que aún no se observaron.

5. **Mejorar la grabación de headers.**
   - Evaluar una forma de capturar headers realmente enviados (incluidos los automáticos de Playwright) sin romper la API de `BaseApiClient`.
   - Hoy puede subestimar parámetros `header`.

6. **Registrar tráfico de la UI.**
   - Escuchar eventos de red del navegador y volcarlos al mismo formato JSONL.
   - Permitiría medir endpoints ejercitados desde la UI.

7. **Repetir el experimento A/B en condiciones ciegas.**
   - La Prueba A se simuló con `CLAUDE.md` presente; para una medición estricta, repetirla en una sesión nueva sin `CLAUDE.md` ni `.claude/`.

8. **Validación de contrato de respuesta en la cobertura.**
   - Hoy solo se compara método/path/status/parámetros; evaluar si se quiere medir también el cuerpo.

### Baja prioridad

9. Revisar y resolver las 10 vulnerabilidades moderadas reportadas por npm (`npm audit`).
10. Soportar `$ref` remotos y servidores con variables complejas.
11. Reducir el ruido de `generatedAt` en los reportes comprometidos (por ejemplo, opción `--no-timestamp` o comparación semántica en CI).
12. Agregar `actionlint` o validación de workflows en CI.
13. Evaluar si `tools/coverage/ai-estimate-1.json` y `ai-estimate-2.json` deben mantenerse a largo plazo o consolidarse solo en `ai-estimates.json`.

---

## 7. Instrucciones para la siguiente IA

1. **Leer primero `HANDOVER.md` completo.** Es la fuente de contexto; no reconstruyas el estado desde cero.
2. **Usar el trabajo existente como punto de partida.** El framework, la herramienta de cobertura y el baseline ya están implementados y commiteados.
3. **No volver a analizar todo el repositorio.** Consulta solo los archivos relacionados con la tarea siguiente.
4. **No reinstalar dependencias innecesariamente.** `node_modules` ya existe; si falta algo, revisa `package.json` antes de ejecutar `npm install`.
5. **No reescribir código que ya funciona.** Cambios mínimos y localizados.
6. **No modificar decisiones técnicas sin justificación.** Si crees que una decisión debe cambiar, explica el motivo y el impacto antes de hacerlo.
7. **Verificar únicamente los archivos relacionados con la siguiente tarea.** Para cobertura, revisa el OpenAPI, el cliente y el spec del recurso.
8. **Continuar desde la sección 5 (Punto exacto de continuación).** La siguiente acción recomendada es agregar el fixture `authenticatedAuthClient` y el test de `GET /api/login`.
9. **No modificar `gad-gui-api-demo/`.** Es la app bajo prueba y está fuera del alcance del repo.
10. **No inventar resultados de cobertura ni estimaciones de IA.** Toda cifra debe venir de una ejecución real o de un archivo persistido.
11. **Después de un cambio de código, ejecutar:**
    - `npm run ci:check`
    - `npm run test:api` (o el proyecto afectado)
    - Si se tocó `tools/coverage/`: `npm run test:coverage:unit`
    - Si cambió la cobertura: `npm run coverage:record -- --project=api` + `npm run coverage:baseline`
12. **Actualizar `HANDOVER.md`** si se completa una tarea relevante o cambia el punto de continuación.
13. **No commitear sin que el usuario lo pida.** El usuario ha venido haciendo los commits manualmente.

---

## 8. Comandos útiles

> En Windows PowerShell 5, `&&` no funciona. Ejecutar comandos por separado o usar `;`.
> Los ejemplos multilínea con `\` son para bash; en PowerShell usar una sola línea o el carácter de continuación de PowerShell.
> En CI (Ubuntu/bash) los `&&` de los scripts de npm funcionan normalmente.

### Instalar dependencias

```bash
npm install
npx playwright install chromium
```

### Ejecutar GAD

```bash
npm run app
```

Verificar salud:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing
```

Alternativa: `START_APP=true npm test` para que Playwright lo levante solo.

### Ejecutar pruebas

```bash
npm test
npm run test:smoke
npm run test:regression
npm run test:api
npm run test:ui
npm run test:failed
npm run test:debug
npm run report
```

### Validaciones

```bash
npm run ci:check
npm run test:coverage:unit
```

### Cobertura OpenAPI

```bash
# Grabar solicitudes de las pruebas API
npm run coverage:record -- --project=api

# Analizar y generar reportes locales en reports/coverage
npm run coverage:analyze

# Regenerar entregables comprometidos en la raíz
npm run coverage:baseline

# Grabar + analizar en un paso
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

Gate con brechas críticas:

```bash
node coverage-cli.js \
  --spec gad-gui-api-demo/public/tools/schema/openapi_rest_demo.json \
  --requests reports/coverage/requests \
  --min-coverage 1 \
  --fail-on-critical-gaps
```

### CI / GAD

```bash
git clone --depth 1 https://github.com/jaktestowac/gad-gui-api-demo.git gad-gui-api-demo
npm --prefix gad-gui-api-demo ci
```

### Git

```bash
git status
git log --oneline -5
git branch -vv
```

---

## NEXT AI PROMPT

```text
Lee primero el archivo HANDOVER.md de la raíz del proyecto y úsalo como fuente de contexto.
No vuelvas a analizar todo el repositorio ni repitas tareas ya completadas.

Contexto:
- Proyecto: framework Playwright + TypeScript sobre GAD.
- Rama actual: main.
- Último commit: 84e56d6 (eliminación del sandbox legacy y endurecimiento del .gitignore).
- El framework, las pruebas API/UI, la herramienta de cobertura OpenAPI, los reportes del Día 1 y el workflow de CI ya están implementados y validados.
- La cobertura real medida es 1.38% global (9/653), con 777 brechas y 300 críticas.
- El árbol de trabajo está limpio salvo HANDOVER.md.

Continúa desde la sección "5. Punto exacto de continuación" de HANDOVER.md.
La próxima acción recomendada es:
1. Agregar el fixture authenticatedAuthClient en src/sut/fixtures/index.ts.
2. Agregar un test para GET /api/login en tests/api/auth.api.spec.ts usando AuthClient.validate().
3. Ejecutar npm run test:api y npm run ci:check.
4. Regenerar cobertura con npm run coverage:record -- --project=api y npm run coverage:baseline.
5. Revisar el delta real en coverage-report.json y coverage-gaps.json.

Reglas:
- No modifiques gad-gui-api-demo/ (es la app bajo prueba).
- No reescribas código que ya funciona.
- No cambies decisiones técnicas sin justificación.
- No inventes porcentajes de cobertura ni estimaciones de IA.
- Consulta solo los archivos relacionados con la tarea.
- No hagas commit sin que el usuario lo pida.
- Si algo no está confirmado, indícalo como pendiente de verificar.

Antes de empezar, muestra un plan breve de 3-5 pasos y confirma que leíste HANDOVER.md.
```
