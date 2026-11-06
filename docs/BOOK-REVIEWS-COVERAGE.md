# Cobertura de reseñas de libros

Verificación local: 2026-11-06. Alcance: `GET /api/book-shop-book-reviews` y sus tres parámetros documentados. El handler no implementa creación, edición ni borrado de reseñas; no se inventaron flujos de escritura.

## Casos implementados

11 tests nuevos usando `BookReviewsClient`, fixture, datos y esquemas del SUT:

- Reseñas por `book_id` para dos libros, validando filtrado, cantidad y autor `Anonymous`.
- Estadística individual mediante `book_id` y `mean=true`, con cantidad y media redondeada a un decimal comprobadas contra datos conocidos.
- Lista vacía para un libro sin reseñas y para un identificador textual sin coincidencias.
- Estadística sin reseñas: cantidad 0 y media 0.
- Estadísticas múltiples mediante `book_ids` y `mean=true`, incluyendo un libro sin reseñas.
- Conservación del orden y de las repeticiones de IDs en la consulta múltiple.
- Respuesta real 404 sin filtros y con `book_ids` sin `mean`.

Todas las solicitudes son públicas y de lectura. No se crean datos ni se requiere limpieza. La comprobación posterior confirmó que las 21 reseñas de `book-reviews` coinciden exactamente con las del dataset base.

## Diferencias con el OpenAPI

| Declaración o expectativa | Resultado real |
|---|---|
| `BookReviews.items` | Se referencia a `BookReviews` a sí mismo, en lugar de `BookReview`. El esquema de pruebas valida una lista de objetos `BookReview` con el campo real `author: Anonymous`. |
| Estadísticas como array | Una consulta de un solo libro devuelve un objeto; una consulta con `book_ids` devuelve un array. Se validan ambos contratos reales de forma explícita. |
| `book_id` entero en estadísticas | GAD devuelve el ID de la query como string. El esquema real exige un string numérico; no se transforma silenciosamente la respuesta. |
| Solo estado 200 documentado | Sin filtros, o con `book_ids` pero sin `mean`, GAD devuelve 404 y `Not Found`. Esos casos no se hacen pasar por cobertura de otro estado documentado. |
| Booleano `mean` | La verificación puntual `book_id=1&mean=false` devuelve estadísticas igualmente: el handler comprueba presencia del parámetro, no su valor booleano. |
| Orden irrelevante de parámetros query | `mean=true&book_id=1` devuelve 404, mientras `book_id=1&mean=true` devuelve 200. El handler depende del prefijo textual de la URL. |
| Lista vacía de IDs | `book_ids=&mean=true` devuelve 200 con un registro de ID vacío, media 0 y cantidad 0. Ese registro no cumple el contrato de ID; se documenta sin consolidarlo como respuesta válida. |

Las tres últimas verificaciones fueron consultas exploratorias puntuales; no se añadieron tests que den por correcto ese comportamiento defectuoso. Los métodos del cliente producen el orden que el handler admite. No se modificó GAD, el OpenAPI ni el analizador de cobertura.

## Validación final

- **11/11 tests nuevos**, **183/183 API** y **2/2 UI** pasan.
- Lint y typecheck correctos; diff sin errores de whitespace.
- **848 solicitudes** grabadas: 688 reconocidas y 160 sin match (rutas no documentadas de recursos anteriores).
- Cobertura global: **165/653 = 25.27%**, antes 160/653 = 24.50%.
- Endpoints 23/136; operaciones 38/170; estados 104/387; parámetros 23/96.
- Brechas **601**, antes 607; críticas **245**, antes 247.

El endpoint figura `full` según el modelo existente porque se ejecutaron GET, el 200 documentado y los parámetros `book_id`, `mean`, `book_ids`. Esa clasificación no valida el cuerpo contra el OpenAPI ni elimina las discrepancias anteriores. Las estimaciones IA del baseline siguen siendo históricas del Día 1.
