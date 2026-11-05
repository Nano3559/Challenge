# Cobertura de books

Verificación local: 2026-11-05. Se implementaron 40 tests nuevos con `BooksClient`, lectura auxiliar de cuenta mediante `BookShopAccountsClient`, datos propios y esquemas de respuesta.

## Operaciones y resultados

| Operación real | Estados comprobados | Alcance |
|---|---|---|
| GET /api/books | 200 | Contrato del catálogo |
| POST /api/books | 201, 400, 401, 422 | Alta propia, JSON malformado, ausencia de token, lector sin permiso y omisión de cada uno de los ocho campos obligatorios |
| GET /api/books/{id} | 200 | Consulta y persistencia de los libros propios |
| PATCH /api/books/{id} | 200, 400, 401, 404, 422 | Persistencia de título y descripción, JSON/cuerpo vacío, token ausente, rol lector, libro inexistente y rechazo del campo active |
| DELETE /api/books/{id} | 200, 401, 404 | Baja lógica de datos propios, token ausente y libro inexistente |
| POST /api/books/owned/{id} | 200, 401, 404 | Agregar/quitar, persistencia, sin token, libro inexistente y usuario sin cuenta de librería |
| POST /api/books/wishlist/{id} | 200, 401, 404 | Mismos casos, restaurando la cuenta |
| POST /api/books/read/{id} | 200, 401, 404 | Mismos casos, restaurando la cuenta |
| POST /api/books/favorites/{id} | 200, 401, 404 | Mismos casos, restaurando la cuenta |
| GET /api/book-shop-manage/books-without-items | 200, 401 | Libro propio sin inventario y ausencia de autorización |

Las cuatro colecciones personales y el listado de libros sin inventario cubren todos sus estados documentados. Las operaciones reales POST, GET por ID y DELETE no están declaradas para books en el OpenAPI consultado; se prueban igualmente y se utilizan para preparar o limpiar datos.

## Cuentas y limpieza

- El gestor se configura mediante `QA_BOOK_MANAGER_USER` y `QA_BOOK_MANAGER_PASS`. Defaults del dataset base: `v.cortez@test.test` / `1234`, con cuenta de librería y permiso `manage-books`.
- El lector se configura mediante `QA_BOOK_READER_USER` y `QA_BOOK_READER_PASS`. Defaults: `Danial.Dicki@dicki.test` / `test2`, con cuenta de librería de rol lector.
- `admin/admin` no sustituye estos roles: la gestión de books busca un usuario real, su cuenta de librería y los permisos de esa cuenta.
- Cada libro tiene un título UUID y se marca inactivo mediante DELETE en `finally`. La limpieza verifica explícitamente `_inactive: true`.
- Las pruebas de colecciones usan un libro temporal sobre la cuenta del lector. Guardan una instantánea completa de la cuenta, verifican agregado y retiro, y restauran/verifican la instantánea en `finally`, antes de dar de baja el libro.
- Los casos de usuario sin cuenta de librería crean un usuario temporal, sin crear una cuenta de tienda; lo eliminan con su propietario y comprueban GET 404. No se crean cuentas de tienda huérfanas.
- No se modifican libros base, roles, inventario ni configuración de GAD, ni se restaura el dataset global. API mantiene un worker para evitar solapamiento de escrituras.

## Diferencias con el contrato y límites

1. **Prefijo del PATCH:** el OpenAPI declara `/api/books/{id}` mientras usa servidor `/api`; las demás rutas se declaran sin ese prefijo. Se usa la ruta real `/api/books/{id}`. El matcher existente reconoció las solicitudes PATCH; no se modificó el analizador ni se utilizó `/api/api/books/{id}`.
2. **Respuesta PATCH:** GAD devuelve el objeto libro directamente, sin el wrapper `success/message/book` documentado. El esquema `Book` referenciado también exige campos como `author`, `price`, `stock` y `created_at` que el libro real no contiene. El test valida la forma real `BookShopBook`, compartida con el contrato del catálogo; la diferencia queda explícita.
3. **active:** aunque el body documentado permite `active`, el handler lo rechaza con 422 por campo adicional. El test comprueba ese rechazo y que el libro permanezca intacto.
4. **400/422 de PATCH:** el handler devuelve 400 por cuerpo vacío o JSON malformado y 422 por campos adicionales, pero esos estados no están declarados para PATCH. Se prueban sin editar el OpenAPI para sumar cobertura artificial.
5. **500 de PATCH:** el contrato documenta un error interno. No se introdujeron fallos artificiales ni se consolidó un error interno como comportamiento correcto. Permanece sin observar.
6. **404 del catálogo:** el contrato lo documenta, pero el listado del dataset disponible devuelve 200. No se vació ni eliminó el catálogo para intentar forzar ese estado.
7. **Baja lógica visible:** DELETE devuelve 200 y marca `_inactive: true`, pero GET por ID y el catálogo aún devuelven esos libros. La limpieza no promete eliminación física ni invisibilidad: verifica la marca que aplica GAD. Los registros de prueba inactivos permanecen en la aplicación.
8. **IDs de colecciones:** el handler obtiene el ID desde la URL como string y puede guardarlo así, aunque el contrato declara arrays de integers. El esquema real admite integers y strings numéricos; las comprobaciones de pertenencia normalizan con String, y la restauración compara la instantánea completa sin normalizarla.

Autores, géneros, compras, pedidos y el resto de la administración de tienda son recursos independientes y quedan fuera de esta entrega.

## Validación final

- **96/96 tests API**: 40 books y 56 existentes.
- **2/2 tests UI**, con Chromium y acceso autorizado a su caché.
- Lint y typecheck correctos; diff sin errores de whitespace.
- **389 solicitudes** grabadas: **329 reconocidas** y **60 sin match**, correspondientes a operaciones reales de books no declaradas para ese método/ruta.
- Cobertura global: **105/653 = 16.08%**, frente a 73/653 = 11.18% antes de books.
- Endpoints: 13/136; operaciones: 24/170; estados: 66/387; parámetros: 15/96.
- Brechas globales: **671** frente a 711; críticas: **269** frente a 285.

La medición incluye las solicitudes auxiliares de cuenta y las de preparación/limpieza. Las estimaciones IA del baseline siguen siendo históricas del Día 1. No se declara cobertura completa de books mientras existan las diferencias indicadas.
