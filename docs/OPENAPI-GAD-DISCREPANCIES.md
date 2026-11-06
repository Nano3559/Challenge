# Brechas y discrepancias entre OpenAPI y GAD

## Alcance

GAD es una fuente inmutable para este trabajo. No se deben cambiar sus handlers, configuración ni OpenAPI para hacer que el reporte pase. La cobertura se obtiene con solicitudes reales y respuestas observadas en pruebas; los estados que el servidor no emite se mantienen como brechas y se documentan aquí. `coverage-gaps.json` es la lista viva de brechas; no se deben marcar como cubiertas por una respuesta inventada o por cambiar el contrato.

Por esa restricción, las 49 respuestas pendientes no pueden “implementarse” desde pruebas o fixtures: una prueba no puede hacer que el servidor emita otro código HTTP. Interceptar/mockear una respuesta tampoco cuenta como cobertura de GAD. Sí se puede comprobar la respuesta alternativa real, protegerla con una prueba y documentar el defecto; el gap del código esperado solo se cierra cuando GAD lo emita.

## Estado actual

Baseline del 2026-11-06: 2875 solicitudes grabadas, 2550 reconocidas y 325 sin match; endpoints 136/136, operaciones 170/170, respuestas 338/387 y parámetros 96/96. Cobertura global 604/653 (92,50 %). Restan 49 estados documentados. La matriz completa y sus identificadores están en [coverage-gaps.json](../coverage-gaps.json).

## Discrepancias observadas

| Operación / respuesta OpenAPI | Respuesta observada en GAD | Diagnóstico |
| --- | --- | --- |
| `PUT /article-labels/articles/{id}` 200 | 404 al actualizar la asociación existente | Incompatibilidad del handler; el 404 quedó cubierto como resultado observado. |
| `HEAD /articles/{id}` 400 | 404 con IDs inválidos | No se encontró un formato de ID que produzca 400. |
| `GET /articles/search` 200 | 404 | La ruta de búsqueda no está implementada en GAD. Sus parámetros se ejercitaron individualmente. |
| `GET /comments/search` 200 | 404 | La ruta de búsqueda no está implementada en GAD. Sus parámetros se ejercitaron individualmente. |
| `GET /users/search` 200 | 404 | La ruta de búsqueda no está implementada en GAD. Sus parámetros se ejercitaron individualmente. |
| `GET /book-shop-accounts` 401 | 404 sin usuario válido | El handler responde 404 antes de llegar a la rama 401. |
| `GET /book-authors`, `/book-genres`, `/books`, `/book-shop-roles`, `/book-shop-order-statuses` 404 | 200 con catálogos semilla no vacíos | El GET de colección pasa a la capa de datos; sin vaciar el seed compartido no se produce 404. |
| `POST /book-shop-accounts/files` 200/401 | 404 | La ruta no está conectada al handler de archivos. |
| `GET /book-shop-manage/items/by-book/{bookId}` 200/404 | 200 con una lista que no filtra por `bookId` | La búsqueda funcional usa `?book_id=`. El 200 se registra como status, con semántica defectuosa. |
| `GET /book-shop-manage/team` 401 | 200 anónimo | El handler permite la lectura sin token. |
| `PUT /comments/{id}` 404 | 201 para ID inexistente con body válido | GAD crea un comentario en el reemplazo; no produce el 404 esperado. |
| `GET /files/uploaded...` documentado | 404 en las rutas documentadas | GAD implementa las variantes bajo `/files/articles/uploaded...`; estas tienen cobertura separada. |
| `POST /book-shop-order-items` 201/409 y `DELETE /book-shop-order-items` 200 | 404 para ruta documentada | El flujo funcional usa `/book-shop-orders/items`; las pruebas verifican el 404 y conservan el pedido. |
| `GET /flashposts` 401/404 | 200 para listado público | El listado no requiere autenticación; el 404 aplica a recurso individual inexistente. |
| `POST /flashposts` 200 | 201 | Diferencia de código de creación. |
| `GET /quiz/questions/count` 401 | 200 | El conteo es público en GAD. |
| `GET /restore/list` 200 | 201 | Diferencia de código en la respuesta de GAD. |
| `GET /scores/{id}` 404 | 200 con lista vacía para ID desconocido | La ruta actúa como filtro de scores. |
| `GET /surveys/{surveyType}/description` 404 | 200 con `{}` para tipo desconocido | El handler responde objeto vacío. |
| `POST /tic-tac-toe/join` 409 | 422 en flujo secuencial | El 409 requeriría forzar una carrera; no se simula artificialmente. |
| `POST /tic-tac-toe/status` 403 | 422 ante estado/código inválido | El handler valida el body y no emite el 403 documentado en el caso ejercitado. |
| `GET /users/{id}`, `HEAD /users/{id}` 400 | 404 para IDs inválidos | Se probaron IDs no numéricos, negativos, decimales, `null` y `undefined`. |

Los demás estados aún requieren diagnóstico puntual con sandbox antes de clasificarlos. No se deben provocar errores 500 o carreras contra la instancia compartida. Las pruebas de mutación deben seguir usando bases y procesos desechables.

## Procedimiento para cada brecha

1. Revisar únicamente la operación, handler y fixture relacionados.
2. Ejecutar el caso en sandbox si modifica estado; conservar la respuesta exacta.
3. Grabar la solicitud bajo recorder y regenerar el baseline.
4. Si GAD emite el estado documentado, añadir la aserción y cerrar la brecha.
5. Si GAD emite otro estado o no implementa la ruta, añadir/ajustar la prueba para que verifique el comportamiento observado y documentar la discrepancia; el gap de OpenAPI permanece abierto.
