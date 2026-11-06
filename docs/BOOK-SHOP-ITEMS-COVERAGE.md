# Cobertura de inventario de librería

Verificación local: 2026-11-06. Se añadieron 45 tests mediante `BookShopItemsClient`, datos tipados, esquema de ítem y fixture `inventorySandbox`.

## Casos implementados

| Operación | Estados comprobados | Comportamiento |
|---|---|---|
| GET /api/book-shop-items | 200, 401, 404 | Listado activo para lector; sin token; usuario sin cuenta de tienda |
| GET /api/book-shop-manage/items | 200, 401 | Listado para gestor; rechazo de anónimo y lector |
| POST /api/book-shop-manage/items | 201, 401, 409, 422; 404 adicional | Alta para libro propio, permisos, duplicado, formatos y longitudes inválidos; libro ausente/inexistente |
| PATCH /api/book-shop-manage/items/{id} | 200, 401, 404, 422 | Persistencia, permisos, inexistente y validaciones conservando el ítem |
| DELETE /api/book-shop-manage/items/{id} | 200, 401, 404 | Baja lógica, exclusión de listados y permisos |
| GET /api/book-shop-manage/items/by-book/{bookId} | 401 | Rechazo de anónimo y lector; los estados 200/404 del contrato no se consolidaron por la discrepancia de ruta |
| GET /api/book-shop-manage/items?book_id={id} | 200, 404 | Consulta efectiva del handler; contrato del objeto, persistencia y ausencia tras baja |

Las validaciones de POST y PATCH cubren precio/cantidad ausentes, negativos, decimales, no numéricos y demasiado largos. El alta también acepta y verifica los límites reales 0/0 y 9999999999/99999. Los errores de permisos distinguen token ausente de usuario lector sin `manage-items`.

## Datos y limpieza

La fixture reutiliza la instancia aislada existente: copia desechable de GAD con cuentas de gestor y lector del dataset base. Cada caso crea sus propios libros UUID e ítems; no se cambia inventario existente. Se comprueba persistencia y conservación en los casos rechazados.

La limpieza aplica DELETE al ítem, comprueba que la búsqueda efectiva por libro devuelve 404 y verifica que no aparezca en los listados de lector ni de gestor. El caso positivo de DELETE exige 200; el finally admite 200 o 404 porque el propio caso puede haberlo dado de baja previamente. Después da de baja el libro y valida `_inactive: true`, conforme al comportamiento ya documentado de books.

Al finalizar el worker, la fixture existente detiene GAD y elimina la copia completa. La verificación final encontró cero directorios temporales. El SHA-256 del inventario de la instancia habitual coincide exactamente con el previo: `4ec1beead81cedc66939c83f866baa7615c8a2945bda33a56ebcd156f65a1b7c`.

## Diferencias con OpenAPI

- La ruta documentada `/api/book-shop-manage/items/by-book/1` devuelve un array con todos los ítems activos, no un objeto filtrado. Con libro 999999 inexistente también devuelve el mismo listado con 200. La rama efectiva del handler es `/api/book-shop-manage/items?book_id=...`, que devuelve un objeto o 404. No se modificó GAD ni se añadió un test que dé por correcto el filtrado de la ruta documentada.
- El query `book_id` no está declarado para GET /book-shop-manage/items. No se usa para aparentar cobertura del parámetro path `bookId` de otra operación. Este último sí se ejercita en los casos 401 de su ruta real; siguen pendientes sus respuestas 200/404 con el comportamiento esperado.
- El alta devuelve 404 cuando falta el libro o no existe, aunque POST no documenta ese estado.
- El contrato de precio dice number, pero GAD solo acepta dígitos enteros y rechaza decimales. Convierte precio y cantidad mediante parseInt; los límites de longitud reales son diez y cinco dígitos, respectivamente.
- PATCH requiere precio y cantidad a la vez; omitir cualquiera devuelve 422. El requestBody usa el esquema completo del ítem, aunque el handler solo actualiza estos dos campos.
- La baja es lógica. La búsqueda efectiva y los listados de inventario ocultan los ítems inactivos, a diferencia de las lecturas de libros documentadas anteriormente.

## Validación final

- **45/45 nuevos**, **172/172 API** y **2/2 UI** pasan.
- Lint y typecheck correctos; diff sin errores de whitespace.
- **837 solicitudes** grabadas: 677 reconocidas y 160 sin match. Estas últimas incluyen las operaciones reales de books no documentadas utilizadas para preparar y limpiar datos.
- Cobertura global: **160/653 = 24.50%**, antes 134/653 = 20.52%.
- Endpoints 22/136; operaciones 37/170; estados 103/387; parámetros 20/96.
- Brechas **607**, antes 637; críticas **247**, antes 257.

Los primeros intentos detectaron una expectativa incorrecta en la limpieza (tras baja, la búsqueda efectiva devuelve 404) y un DELETE repetido que también devuelve 404. Se corrigió únicamente la lógica de limpieza del test; la grabación final corresponde a una ejecución completa exitosa. Las estimaciones IA siguen siendo históricas del Día 1. No se declara resuelta la discrepancia de consulta por libro.
