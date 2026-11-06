# Day 1 Baseline — Cobertura de pruebas automatizadas vs OpenAPI

Generado: 2026-11-06T17:17:02.572Z

> Documento generado por la herramienta `coverage-cli`. Los números de la sección "Herramienta"
> provienen de la ejecución real sobre la especificación y las solicitudes grabadas. Los números de
> IA provienen de estimaciones ejecutadas aparte y registradas en el archivo indicado; si no se
> ejecutaron, se indica explícitamente y no se reemplazan por valores inventados.

## 1. Objetivo del análisis

Medir qué parte de la API documentada en el OpenAPI está realmente cubierta por las pruebas automatizadas,
entendiendo "cubierta" como algo más que "se ejecutó una solicitud": se miden también métodos, códigos de
estado documentados y parámetros ejercitados. El resultado sirve como línea base para priorizar pruebas.

## 2. Archivos analizados

| Elemento | Ruta / detalle |
|---|---|
| Especificación OpenAPI | `gad-gui-api-demo/public/tools/schema/openapi_rest_demo.json` (OpenAPI 3.0.1) |
| Título / versión | 🦎 GAD  / 1.3.3 |
| Servidores | `/api`, `http://localhost:3000/api` |
| Prefijos normalizados | `(vacío)`, `/api` |
| Solicitudes grabadas | `reports/coverage/requests` (22 archivo(s)) |
| Solicitudes | 2875 total, 2550 matcheadas, 325 sin match |
| Pruebas analizadas | `tests` (referencia; el análisis usa las solicitudes grabadas) |
| Ejecución | `node coverage-cli.js --spec gad-gui-api-demo/public/tools/schema/openapi_rest_demo.json --requests reports/coverage/requests --out . --ai-estimates tools/coverage/ai-estimates.json` |

### Modelo de medición

- Unidades globales: operaciones documentadas + códigos de estado documentados + parámetros documentados.
- Fórmula global: unidades cubiertas / unidades totales (operaciones + status codes + parámetros).
- Endpoints: un endpoint está cubierto si al menos una de sus operaciones recibió una solicitud que coincidió con la spec.
- "Full": un endpoint es "full" si todas sus operaciones recibieron al menos una solicitud, todos sus status codes documentados fueron observados y todos sus parámetros documentados fueron ejercitados.
- Parámetros: un parámetro está cubierto si al menos una solicitud de esa operación lo envió en la ubicación documentada (path/query/header/cookie); enviar una solicitud NO cubre automáticamente todos sus parámetros.
- Status codes: un status code documentado está cubierto si alguna solicitud de esa operación recibió exactamente ese código; los rangos (2XX) y "default" se interpretan según OpenAPI.

## 3. Cobertura calculada por la herramienta

| Dimensión | Cubierto | Total | Cobertura |
|---|---:|---:|---:|
| Endpoints | 136 | 136 | 100.00% |
| Operaciones (método + path) | 170 | 170 | 100.00% |
| Códigos de estado documentados | 338 | 387 | 87.34% |
| Parámetros documentados | 96 | 96 | 100.00% |
| **Global ponderado** | **604** | **653** | **92.50%** |

Endpoints por estado: 102 completos, 34 parciales y 0 sin cobertura.

## 4. Primera estimación de IA

- Cobertura global estimada: **1.41%**
- Modelo / proveedor: no especificado / no especificado
- Independencia: Subagente en contexto nuevo, sin acceso a reports/coverage, a los JSON de la herramienta ni a tools/coverage; tampoco ejecutó coverage-cli.
- Conteo declarado por la IA: endpoints=136, endpoints cubiertos=3, operaciones=167, operaciones cubiertas=3, status codes=378, status cubiertos=5, parámetros=93, parámetros cubiertos=1
- Criterios utilizados:
  - Solo cuentan operaciones invocadas por tests mediante clientes de src/sut/api (la UI no cuenta).
  - Se cuentan status codes realmente observados en aserciones (response.status()) por operacion cubierta.
  - Se cuentan parametros documentados ejercitados con valor en la invocacion (path/query/header).
  - Unidades = operaciones + status codes + parametros documentados; cobertura = unidades cubiertas / total.
- Brechas identificadas por la IA (164):
  - [untested_method] GET /login: Metodo documentado sin test que lo invoque via src/sut/api
  - [uncovered_endpoint] GET /debug/exit: Sin test que invoque esta operacion via src/sut/api
  - [uncovered_endpoint] GET /debug/restart: Sin test que invoque esta operacion via src/sut/api
  - [untested_method] POST /articles: Metodo documentado sin test que lo invoque via src/sut/api
  - [untested_method] PUT /articles/{id}: Metodo documentado sin test que lo invoque via src/sut/api
  - [untested_method] PATCH /articles/{id}: Metodo documentado sin test que lo invoque via src/sut/api
  - [untested_method] DELETE /articles/{id}: Metodo documentado sin test que lo invoque via src/sut/api
  - [uncovered_endpoint] GET /users: Sin test que invoque esta operacion via src/sut/api
  - [uncovered_endpoint] POST /users: Sin test que invoque esta operacion via src/sut/api
  - [uncovered_endpoint] GET /users/{id}: Sin test que invoque esta operacion via src/sut/api
  - ... y 154 más.
- Nota: Conteo derivado del spec (136 paths, 167 operaciones, 378 responses, 93 parameters; 638 unidades). Cubiertas: POST /login (200,401), GET /articles (200), GET /articles/{id} (200,404 + path:id) = 9 unidades => 9/638 = 1.41%. El fixture authenticatedArticlesClient no se usa en ningun test. AuthClient.validate() (GET /login) existe pero ningun test lo invoca, por lo que no cuenta. La ruta /api/books/{id} del spec incluye el prefijo /api literalmente (inconsistente con el resto) y se conto tal cual. Estimacion estatica: no se ejecutaron los tests, por lo que los status observados se infieren de las aserciones del codigo.

## 5. Segunda estimación de IA

- Cobertura global estimada: **1.38%**
- Modelo / proveedor: no especificado / no especificado
- Independencia: Subagente en contexto nuevo, sin acceso a reports/coverage, a los JSON de la herramienta ni a tools/coverage; tampoco ejecutó coverage-cli.
- Conteo declarado por la IA: endpoints=136, endpoints cubiertos=3, operaciones=170, operaciones cubiertas=3, status codes=387, status cubiertos=5, parámetros=96, parámetros cubiertos=1
- Criterios utilizados:
  - Operacion cubierta solo si tests/api la invoca via clientes de src/sut/api; la UI no cuenta.
  - Status cubierto solo si un test observa ese codigo en una operacion cubierta.
  - Parametro cubierto solo si el test lo envia realmente (path/query/header).
  - StatusTotal = suma de response codes documentados por operacion (387).
  - Estimacion = (3 ops + 5 status + 1 param) / (170 ops + 387 status + 96 params) * 100.
- Brechas identificadas por la IA (167):
  - [untested_method] GET /login: Metodo de un path parcialmente cubierto sin test de API.
  - [uncovered_endpoint] GET /debug/exit: Endpoint documentado sin test de API.
  - [uncovered_endpoint] GET /debug/restart: Endpoint documentado sin test de API.
  - [uncovered_endpoint] POST /articles: Endpoint documentado sin test de API.
  - [untested_method] PUT /articles/{id}: Metodo de un path parcialmente cubierto sin test de API.
  - [untested_method] PATCH /articles/{id}: Metodo de un path parcialmente cubierto sin test de API.
  - [untested_method] DELETE /articles/{id}: Metodo de un path parcialmente cubierto sin test de API.
  - [untested_method] HEAD /articles/{id}: Metodo de un path parcialmente cubierto sin test de API.
  - [uncovered_endpoint] GET /users: Endpoint documentado sin test de API.
  - [uncovered_endpoint] POST /users: Endpoint documentado sin test de API.
  - ... y 157 más.
- Nota: Spec OpenAPI 3.0.1: 136 paths, 170 operaciones, 96 parametros (nivel operacion/path, sin $ref), 387 response codes. /api es prefijo de servers; solo el path atipico "/api/books/{id}" lo incluye. Cubierto: POST /login (200,401), GET /articles (200) y GET /articles/{id} (200,404 con param path id ejercitado). GET /login, el resto de metodos de /articles/{id} y las demas operaciones no se invocan desde tests/api; existen clientes/metodos (authClient.validate, authenticatedArticlesClient) pero ningun test los usa, por lo que el login implicito de la fixture no se contabiliza. UI de login excluida por alcance. No se leyeron reportes ni herramientas de cobertura previas.

## 6. Variación entre ambas estimaciones

Variación absoluta: **0.03 puntos porcentuales**.

Las dos estimaciones son consistentes entre sí (≤ 5 pp).

## 7. Comparación entre IA y herramienta

| Fuente | Cobertura global estimada/medida | Diferencia vs herramienta |
|---|---:|---:|
| Herramienta (real) | 92.50% | 0.00 pp |
| IA 1 | 1.41% | -91.09 pp |
| IA 2 | 1.38% | -91.12 pp |

La diferencia se expresa en puntos porcentuales (estimación IA − herramienta). Una diferencia positiva
indica que la IA sobreestimó la cobertura; una negativa, que la subestimó.

Las estimaciones de IA son juicios sobre el código y la especificación: no reemplazan la evidencia de
solicitudes grabadas. La herramienta es la fuente de verdad para esta línea base.

## 8. Principales brechas identificadas

Total de brechas: **49** (críticas: 0).

| Categoría | Cantidad | Severidad típica |
|---|---:|---|
| `unexecuted_status_code` | 49 | high (low si la operación no se ejecutó) |

Brechas prioritarias (máximo 15):

- **[high]** `PATCH /api/books/{id}` — status 500: La operación PATCH /api/books/{id} fue ejecutada, pero nunca devolvió el status 500 documentado.
- **[high]** `PUT /article-labels/articles/{id}` — status 200: La operación PUT /article-labels/articles/{id} fue ejecutada, pero nunca devolvió el status 200 documentado.
- **[high]** `HEAD /articles/{id}` — status 400: La operación HEAD /articles/{id} fue ejecutada, pero nunca devolvió el status 400 documentado.
- **[high]** `PUT /articles/{id}` — status 404: La operación PUT /articles/{id} fue ejecutada, pero nunca devolvió el status 404 documentado.
- **[high]** `GET /articles/search` — status 200: La operación GET /articles/search fue ejecutada, pero nunca devolvió el status 200 documentado.
- **[high]** `GET /book-authors` — status 404: La operación GET /book-authors fue ejecutada, pero nunca devolvió el status 404 documentado.
- **[high]** `GET /book-genres` — status 404: La operación GET /book-genres fue ejecutada, pero nunca devolvió el status 404 documentado.
- **[high]** `GET /book-shop-accounts` — status 401: La operación GET /book-shop-accounts fue ejecutada, pero nunca devolvió el status 401 documentado.
- **[high]** `POST /book-shop-accounts/files` — status 200: La operación POST /book-shop-accounts/files fue ejecutada, pero nunca devolvió el status 200 documentado.
- **[high]** `POST /book-shop-accounts/files` — status 401: La operación POST /book-shop-accounts/files fue ejecutada, pero nunca devolvió el status 401 documentado.
- **[high]** `GET /book-shop-manage/items/by-book/{bookId}` — status 404: La operación GET /book-shop-manage/items/by-book/{bookId} fue ejecutada, pero nunca devolvió el status 404 documentado.
- **[high]** `GET /book-shop-manage/team` — status 401: La operación GET /book-shop-manage/team fue ejecutada, pero nunca devolvió el status 401 documentado.
- **[high]** `DELETE /book-shop-order-items` — status 200: La operación DELETE /book-shop-order-items fue ejecutada, pero nunca devolvió el status 200 documentado.
- **[high]** `POST /book-shop-order-items` — status 201: La operación POST /book-shop-order-items fue ejecutada, pero nunca devolvió el status 201 documentado.
- **[high]** `POST /book-shop-order-items` — status 409: La operación POST /book-shop-order-items fue ejecutada, pero nunca devolvió el status 409 documentado.
- ... y 34 brechas más en `coverage-gaps.json`.

## 9. Conclusiones y recomendaciones

- Cobertura global medida: **92.50%** (604/653 unidades).
- Endpoints con al menos una solicitud: **136/136** (100.00%).
- Operaciones ejercitadas: **170/170** (100.00%).
- Códigos de estado verificados: **338/387** (87.34%).
- Parámetros ejercitados: **96/96** (100.00%).

Recomendaciones basadas en los datos anteriores:

2. Añadir casos para los 49 códigos de estado documentados no ejecutados, especialmente los errores 4xx/5xx de operaciones ya probadas.
4. Completar los 34 endpoints parciales: les falta algún método, status o parámetro documentado.
5. Mantener las estimaciones de IA como señal secundaria: su diferencia máxima con la herramienta fue de 91.12 pp en esta línea base.

## 10. Limitaciones de la medición

- Solo se registran solicitudes hechas con APIRequestContext (clientes del framework); las solicitudes que dispara la UI con el navegador no se graban en esta primera versión.
- La comparación es a nivel de contrato: no valida el cuerpo de la respuesta, solo método, path, status y presencia de parámetros.
- Un requestBody documentado no se cuenta como parámetro; su cobertura no se mide.
- Los $ref remotos y los servidores con variables complejas no se resuelven por completo.
- Un código "default" se considera cubierto si se observó un status que no coincide con ningún código explícito documentado.

## 11. Reproducción

```bash
# 1) Ejecutar pruebas API grabando solicitudes
npm run coverage:record -- --project=api

# 2) Analizar contra el OpenAPI y generar reportes
node coverage-cli.js --spec "gad-gui-api-demo/public/tools/schema/openapi_rest_demo.json" --requests "reports/coverage/requests" --out . --ai-estimates tools/coverage/ai-estimates.json
```

