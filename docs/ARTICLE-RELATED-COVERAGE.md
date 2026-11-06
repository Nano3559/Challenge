# Comentarios y funciones sociales de artículos

Verificación: 2026-11-06. Este incremento no repite CRUD de artículos ni la búsqueda ya documentada como ausente.

## Comentarios

Siete pruebas nuevas: listado público con esquema; GET/HEAD inexistentes; flujo propio completo de alta, consulta, HEAD, PUT, PATCH y baja persistentes; rechazo de escrituras sin token; rechazo de cambios por otro usuario; JSON malformado en POST/PUT/PATCH; payloads inválidos; PATCH/DELETE inexistentes; PUT de ID inexistente con alta 201 y comprobación del ID efectivamente asignado.

Preparación: artículo propio en la copia desechable. Se eliminan comentario y artículo con su propietario y se descarta la copia. El flujo completo comprueba que los cambios rechazados conservan el comentario, que la baja desaparece de GET/listado y que repetir DELETE devuelve 404.

Limitaciones verificadas:

- HEAD sobre comentario dado de baja devuelve 200, mientras GET devuelve 404. No se consolidó como requisito positivo; HEAD 404 se comprueba con ID realmente inexistente.
- PUT inexistente crea 201; el 404 documentado de PUT no queda acreditado con ese caso.
- Los 400 documentados de GET/HEAD no se inventan a partir de un 404 por ID textual.
- PATCH con `body: null` sobre ID inexistente alcanzó 404 en vez de rechazar el valor con 422. Se excluyó de la lista de valores garantizados como inválidos; no se afirmó validación completa de tipos.
- `/articles/search` sigue bloqueado según la verificación previa de ARTICLES-COVERAGE.md. Sus filtros no se atribuyen a `/articles`. `/comments/search` tampoco tiene handler específico identificado; no se acredita mediante filtros enviados al listado.

## Etiquetas, likes y marcadores

Siete pruebas nuevas:

- Configuración predeterminada: funciones sociales desactivadas y GET de etiquetas, likes y marcadores devuelve 404.
- Catálogo de etiquetas con esquema y consulta de asociación inexistente 404.
- Propietario asigna etiquetas a artículo propio: 201 y lectura pública persistida; otro usuario y anónimo 401; exceso de etiquetas 422; JSON malformado 400, con asociación conservada.
- Likes de artículo y comentario: alternancia 201/200, contadores 0/1/0, query de artículo y `mylikes` con header `userid` y query `id` registrados explícitamente.
- Likes: sin token 401, destinos ambiguos/ausentes 422 y JSON malformado 400.
- Marcadores: usuario nuevo crea colección 201, lectura persistida, aislamiento entre usuarios, alternancia para retirar 200 y rechazo 422 de artículo inexistente.
- Marcadores sin token: GET/POST 401.

El esquema real de likes usa contadores/mapas y se comprueba explícitamente; no se hace pasar por una lista del contrato. Un usuario nuevo de marcadores se descarta con toda la base, evitando dejar relaciones huérfanas en la base habitual.

## Configuración de pruebas

GAD trae `feature_labels`, `feature_likes` y `feature_user_bookmark_articles` en false. Para ejercer los flujos habilitados se añadió una opción al arranque desechable existente: `startAccountSandbox({ socialFeatures: true })`. El bootstrap propio activa solo esas flags en memoria del hijo. No modifica archivos de configuración de GAD ni el proceso/base habitual.

La fixture de comentarios/social tiene copia independiente del sandbox existente de cuentas/tienda. La configuración predeterminada sigue comprobándose contra la instancia base del test. Los reportes agregan solicitudes de ambas configuraciones; por ello la cifra de cobertura no significa que los flujos estén habilitados por defecto.

## Asociación de etiquetas: defecto confirmado

En una copia con funciones sociales activadas, PUT `/article-labels/articles/{articleId}` crea asociación con 201. Repetir PUT para cambiar `label_ids` devuelve 404 y GET conserva la asociación inicial. El handler no reescribe la ruta cuando la asociación ya existe. Este diagnóstico quedó fuera del recorder: el 200 documentado de actualización sigue pendiente, sin añadir una expectativa positiva de fallo.

El cliente base solo se extendió con GET/POST con headers explícitos para registrar correctamente `userid`; los métodos existentes permanecen intactos. GAD y el analizador no se modificaron. Sin commit nuevo.

## Alcance pendiente

El usuario pidió continuar con todos los siguientes; se solicitó aclarar si significa toda la API pendiente o solo el área de artículos. Este documento registra el bloque común implementado, no declara terminadas las demás áreas del proyecto.

## Validación final

- 14 pruebas nuevas: siete de comentarios y siete sociales/configuración.
- Regresión completa: 352/352 API aprobadas. Después se añadió la comprobación de PUT 422 al caso de validaciones existente y se repitieron los siete tests de comentarios: 7/7 aprobados.
- Grabación agregada con `--keep`: regresión completa de 2267 solicitudes más 59 de esa verificación puntual; total 2326, reconocidas 2010, sin match 316. No se mezclan ejecuciones fallidas.
- Cobertura final 319/653 = 48.85%, antes 248/653 = 37.98%. Endpoints 49/136, operaciones 76/170, estados 206/387, parámetros 37/96. Brechas 421, críticas 181.
- Lint y typecheck sin advertencias; git diff --check correcto. UI no reejecutada en esta entrega API; última validación anterior 2/2.
- Copias desechables descartadas y cero carpetas de sandbox. Base/configuración originales sin escrituras por estos casos; reportes raíz regenerados, IA histórica intacta. Sin commit nuevo.

La cifra agrega configuración social activada y desactivada; los 404 de flags desactivadas no se presentan como prueba de búsqueda de una entidad inexistente. Continúan 87 rutas sin cobertura y otros métodos/estados/parámetros pendientes: el proyecto no está completo.
