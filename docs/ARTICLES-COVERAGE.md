# Cobertura de articles

Verificación local: 2026-11-05. Fuente: OpenAPI de GAD y ejecución real de la suite API.

| Operación | Estados observados por la suite | Pendiente del contrato |
|---|---|---|
| GET /articles | 200 | Ninguno |
| POST /articles | 201, 400, 401, 422 | Ninguno |
| GET /articles/{id} | 200, 404 | Ninguno |
| PUT /articles/{id} | 200, 201, 400, 401, 422 | 404 no reproducido |
| PATCH /articles/{id} | 200, 400, 401, 404, 422 | Ninguno |
| DELETE /articles/{id} | 200, 400, 401 | Ninguno |
| HEAD /articles/{id} | 200, 404 | 400 por ID inválido no reproducido |
| GET /articles/search | Ninguno | 200 y sus 12 parámetros |

Las rutas de la tabla son las del OpenAPI; las solicitudes usan el prefijo `/api`.

Los casos de escritura crean artículos propios, verifican persistencia o conservación del recurso y limpian mediante el propietario en `finally`. El 200 de DELETE también se verifica durante la limpieza. Los errores 400 de PUT, PATCH y DELETE usan JSON truncado con `content-type: application/json` y comprueban que el recurso no cambie. Los tests del spec articles se ejecutan en secuencia para evitar escrituras solapadas sobre el archivo de datos que consulta GAD.

## Discrepancias que requieren decisión sobre GAD o su contrato

- **PUT 404:** con un ID inexistente y payload válido, GAD convierte PUT en POST y devuelve 201, asignando un nuevo ID. Se comprobó con usuario registrado y con admin; el caso admin está en la suite y limpia el ID efectivamente devuelto. El handler no contiene una respuesta 404 para este flujo. No se añadió un test que espere un 404 no observado.
- **HEAD 400 por ID inválido:** `abc`, `-1`, `0`, `1.5`, `2147483648` y `%20` devolvieron 404; `%ZZ` devolvió 500. El esquema permite integer o string, por lo que `abc` no viola por sí solo el tipo. No se cambió el contrato ni se contó un error de parser como evidencia de validación de ID.
- **Búsqueda:** `/api/articles/search?id=1` y la búsqueda con un ID inexistente devolvieron 404. Los filtros `q`, `id`, `user_id`, `date`, `_sort`, `_order`, `_limit`, `_page`, `_start`, `_end`, `_embed` y `_expand` quedan pendientes en esa operación. Enviarlos a `/api/articles` no cubriría los parámetros documentados para `/articles/search`.
- **Soft delete y PATCH:** tras DELETE, GET devuelve 404, pero PATCH sobre el mismo ID devolvió 200. Por eso el caso PATCH 404 usa un ID realmente inexistente, en lugar de asumir que un registro inactivo ya no existe para todos los handlers.
- El OpenAPI de PATCH marca campos obligatorios en el body, aunque el handler admite cambios parciales. El caso exitoso verifica que cambiar solo el título conserva los demás campos.

## Resultado final

- 25/25 tests API pasan; lint y typecheck correctos.
- 87 solicitudes grabadas, todas reconocidas por el OpenAPI.
- Cobertura global del proyecto: **40/653 = 6.13%**; **746 brechas**, **294 críticas**. Estas cifras incluyen todos los recursos de la suite, no solo articles.
- Validación UI posterior: Chromium instalado con `npx playwright install chromium`; los dos tests UI pasan (5.0 s). La ejecución requirió permisos fuera del entorno restringido para acceder a la caché de navegadores e iniciar Chromium. El impedimento de entorno queda resuelto.

La cobertura mide operaciones, estados y parámetros ejecutados, incluida preparación y limpieza. No implica que se hayan probado todas las combinaciones de datos ni el comportamiento completo de la API. Las estimaciones IA conservadas en el baseline corresponden al Día 1.
