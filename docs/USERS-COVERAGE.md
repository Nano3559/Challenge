# Cobertura de users

Verificación local: 2026-11-05. Alcance: las operaciones `/users`, `/users/{id}` y `/users/search` del OpenAPI REST de GAD.

## Casos implementados

31 tests nuevos en `tests/api/users.api.spec.ts`, usando `UsersClient`, fixtures y esquemas del SUT.

| Operación | Estados comprobados por la suite | Casos adicionales |
|---|---|---|
| GET /users | 200 | Contrato de lista y enmascaramiento de datos |
| POST /users | 201, 400, 409, 422 | Inicio de sesión del usuario creado, email duplicado, email inválido y omisión individual de los cinco campos obligatorios reales |
| GET /users/{id} | 200, 404 | Identidad y proyección pública |
| PUT /users/{id} | 200, 400, 401, 422 | Persistencia, ausencia de token, token ajeno, email inválido y campo obligatorio ausente |
| PATCH /users/{id} | 200, 400, 401, 404, 422 | Actualización parcial, ausencia de token, token ajeno, campo vacío y objeto vacío |
| DELETE /users/{id} | 200, 401, 404 | Eliminación por propietario, ausencia de token y token ajeno |
| HEAD /users/{id} | 200, 404 | Cuerpo vacío |

Las solicitudes usan el prefijo `/api`. Los errores de JSON malformado se envían como bytes con `content-type: application/json`. Los casos negativos con un recurso existente verifican que su proyección pública permanezca intacta. Los casos positivos verifican el contrato de escritura y la persistencia de los campos visibles mediante GET.

Cada caso que escribe crea sus propias cuentas con emails UUID, inicia sesión por API y las elimina con su propietario en `finally`, comprobando DELETE 200 y GET posterior 404. No se modifica ningún usuario del dataset base ni se restaura globalmente la base. El modo de eliminación puede conservar registros inactivos según la configuración de GAD.

El proyecto API usa un worker para evitar escrituras solapadas entre los specs users y articles: los handlers consultan el mismo archivo de datos. Las sesiones y los datos de cada caso siguen siendo independientes. No se añadieron sleeps ni reintentos para ocultar fallos.

## Diferencias con el OpenAPI y casos no reproducibles

| Contrato documentado | Resultado real y decisión |
|---|---|
| GET /users/{id} → 400 por ID inválido | `abc`, `-1`, `0`, `1.5` y `%20` devuelven 404. No se añadió una expectativa 400 no observada. El esquema admite integer o string. |
| HEAD /users/{id} → 400 | Los mismos valores devuelven 404. Sigue pendiente aclarar qué ID debería producir 400. |
| PUT /users/{id} → 201 y 404 | Con admin, ID 999999 inexistente y payload válido se obtiene 500: `Fatal error. Please contact administrator.` El handler intenta convertir PUT en POST pero accede a `foundUser['birthDate']` cuando `foundUser` es undefined. No se consolidó el 500 como comportamiento correcto. Sin admin, la autorización del usuario inexistente se evalúa antes de la actualización. |
| GET /users/search → 200 | `/api/users/search?id=1` devuelve 404. Quedan sin cubrir esa operación y sus 12 parámetros: `q`, `id`, `firstname`, `lastname`, `email`, `_sort`, `_order`, `_limit`, `_page`, `_start`, `_end`, `_embed`. Enviarlos al listado sería otra operación y no cerraría esta brecha. |
| User.email con formato email en GET | El renderer devuelve `****` en email, lastname y password si no hay sesión de navegador. Un token Bearer no establece esa sesión: el renderer usa la cookie `id`. Se mantiene `userSchema` para escrituras y un `publicUserSchema` explícito para esas lecturas; no se relajó silenciosamente la validación de email. |
| UserUpdate no exige password | El handler sí exige password en POST y PUT. El alta sin password se prueba como 422. |
| POST 409 descrito como email inválido | GAD usa 409 para email duplicado; un email con formato inválido devuelve 422. Ambos comportamientos están probados. |

Estas diferencias requieren decidir sobre la aplicación o su contrato. El framework no modifica GAD ni altera el OpenAPI para aparentar cobertura completa.

## Validación y medición

- Suite API completa: **56/56 pass**, incluidos **31 casos de users**.
- Suite UI: **2/2 pass** con Chromium, ejecutada con acceso a la caché local del navegador.
- Lint y typecheck correctos.
- Grabación completa: **225 solicitudes**, todas reconocidas por el OpenAPI.
- Cobertura global: **73/653 = 11.18%**, frente a 40/653 = 6.13% antes de users.
- Brechas globales: **711**, frente a 746; críticas **285**, frente a 294.
- `/users` figura completo; `/users/{id}` parcial; `/users/search` sin cobertura.

Las cifras globales incluyen otros recursos y solicitudes de preparación/limpieza. Las estimaciones IA del baseline siguen siendo históricas del Día 1. Cubrir los estados documentados no equivale a probar todas las combinaciones posibles de datos, roles o configuraciones.
