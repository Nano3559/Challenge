## Punto de pausa y entrega — cuentas de librería (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores. El usuario solicitó hacer commit de la entrega y continuar trabajando después; esa solicitud autoriza el commit de estos cambios.

- COMPLETADO: 25 tests nuevos de book-shop-accounts y book-shop-authorize. Alta 201, duplicado 409, consultas y colecciones, permisos de propietario/cuenta ajena, actualización de dirección con restauración, campos inválidos 403 y autorización por roles. No se repitió como tarea el GET 200 ya existente.
- Alta sin residuos: fixture accountSandbox inicia GAD sobre una copia desechable de db-base dentro de reports/gad-accounts-*, con puerto propio e IPC. Bootstrap tools/gad/accounts-sandbox.js cambia solo configuración en memoria del hijo y desactiva allí BugHatch/GadTalk para evitar escrituras auxiliares compartidas. Teardown detiene el hijo y elimina únicamente su directorio verificado. Cuenta y propietario se descartan juntos; no se modifica código de GAD ni se dejan cuentas huérfanas.
- La dirección de la cuenta base se restaura y se compara la instantánea completa. Verificación final: cinco cuentas base, cero usuarios temporales, cero carpetas de sandbox, dirección original intacta.
- Discrepancias: GET cuenta actual sin token devuelve 404, no 401; my-books devuelve solo colecciones; POST construye defaults desde body vacío; PATCH solo acepta dirección; /book-shop-accounts/files devuelve 404 con multipart tanto autenticado como anónimo, sin implementar los 200/401 documentados. Detalle y evidencia en docs/BOOK-SHOP-ACCOUNTS-COVERAGE.md. No inventar tests para esos estados.
- Validación final: 127/127 API, 2/2 UI, ci:check OK, git diff --check OK. coverage:record 476 solicitudes, 412 reconocidas y 64 sin match; coverage:baseline OK.
- Cobertura actual: 134/653 = 20.52% (antes 109/653 = 16.69%). Endpoints 18/136, operaciones 31/170, status 86/387, parámetros 17/96. Brechas 637 (antes 665), críticas 257 (antes 265). Reportes raíz regenerados; estimaciones IA del Día 1 sin cambios.
- La entrega incluye también las continuaciones previas de auth, articles, users, books, autores y géneros que todavía no tenían commit. Sus documentos detallados están en docs/*-COVERAGE.md. Las secciones inferiores son inventario histórico: sus porcentajes y referencias a cambios sin commit no describen esta entrega.

### Próximo punto de continuación

Retomar desde este punto sin repetir trabajo cerrado. Recurso recomendado: book-shop-items (inventario), verificando primero su contrato y handlers y la limpieza de los datos de prueba; aprovechar la instancia aislada cuando no exista borrado seguro. Las discrepancias pendientes de todos los recursos están documentadas. Conservar GAD sin cambios de código, las cuentas/roles base, API workers 1 y las estimaciones IA históricas. La autorización de este commit no implica publicar, hacer push ni iniciar el siguiente recurso ahora.
## Última continuación — book-authors y book-genres (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: seis tests nuevos de lectura pública: listado 200, consulta por id 200 contrastada con listado y 404 por id inexistente, para autores y géneros. Nuevos BookAuthorsClient/BookGenresClient, fixtures, datos/book-catalogs y esquemas. No se escriben catálogos ni se altera arquitectura.
- Contrato: solo documenta los listados 200/404; los 404 de listado no se reproducen con el dataset existente. Las consultas por id reales no están en OpenAPI y no se hacen pasar por cobertura de listado. Genres declara un objeto pero devuelve una lista; se valida la lista y se documenta la diferencia. Detalle: docs/BOOK-CATALOGS-COVERAGE.md.
- Incidencia de entorno: primera regresión interrumpida por EPERM de GAD al renombrar su base; servidor terminado y ECONNREFUSED posterior. Se descartó esa grabación y se inició npm run app fuera del entorno restringido con autorización. Regresión final completa correcta. El artículo id 174/título UUID exacto dejado por la interrupción se limpió puntualmente con su propietario: DELETE 200, GET 404. No se cambió GAD.
- Validación final: seis nuevos pass, API 102/102, UI 2/2; ci:check y git diff --check OK. coverage:record 397 solicitudes, 333 matcheadas, 64 sin match (60 de books y cuatro lecturas nuevas por id). coverage:baseline OK.
- Cobertura actual: 109/653 = 16.69% (antes 105/653 = 16.08%). Endpoints 15/136, operaciones 26/170, status 68/387, parámetros 15/96. Brechas 665 (antes 671), críticas 265 (antes 269). Reportes raíz regenerados, IA histórica intacta, sin commits.

### Próximo punto de continuación

Autores y géneros tienen cubiertos los casos reproducibles; no repetir. Sus 404 de listado y el contrato de lista de géneros quedan documentados como diferencias pendientes. Siguiente recurso recomendado: book-shop-accounts, empezando por completar los casos faltantes; su GET 200 ya se ejecuta como auxiliar de books. Verificar primero cómo limpiar cuentas temporales, pues su handler no ofrece DELETE, y no dejar cuentas huérfanas. Mantener GAD en solo lectura de código, datos base y roles intactos, API workers 1 y no commitear sin solicitud.

---
## Última continuación — recurso books (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 40 tests nuevos de books: catálogo, creación propia, omisión de ocho campos obligatorios, roles gestor/lector, errores 400/401/404/422, PATCH persistente, DELETE lógico y las cuatro colecciones owned/wishlist/read/favorites con ciclo completo, persistencia y restauración. Incluido GET /book-shop-manage/books-without-items 200/401.
- Componentes: BooksClient, BookShopAccountsClient de lectura auxiliar, datos/books, esquemas book/bookShopAccount, fixtures y tests/api/books.api.spec.ts. Credenciales de gestor y lector configurables mediante QA_BOOK_MANAGER_USER/PASS y QA_BOOK_READER_USER/PASS; defaults del dataset base en .env.example. El admin general no sustituye una cuenta de librería con manage-books.
- Limpieza: libros propios UUID marcados inactivos por DELETE en finally; GAD aún los devuelve en GET y catálogo, por lo que se verifica _inactive true, no un 404 inexistente. Las cuentas base solo se usan con restauración exacta de sus colecciones y sin cambios de rol. Usuarios temporales sin cuenta de tienda se eliminan; no se crean cuentas de tienda huérfanas. Verificación final: cero libros temporales activos y cero usuarios temporales activos.
- Contrato: matcher existente reconoció PATCH /api/books/{id} pese al prefijo atípico. Las cuatro colecciones y books-without-items cubren todos sus status documentados. PATCH devuelve libro directo, no wrapper; active documentado se rechaza con 422. Catálogo 404 y PATCH 500 quedan sin observar. El OpenAPI omite POST/GET por id/DELETE reales de books, y omite 400/422 de PATCH. IDs de colecciones pueden ser strings numéricos pese al contrato integer. Detalle en docs/BOOKS-COVERAGE.md. No se modificó GAD, OpenAPI ni analyzer.
- Validación final: 96/96 API (40 books + 56 existentes); UI 2/2; ci:check OK sin warnings de lint; git diff --check OK. coverage:record 389 solicitudes, 329 matcheadas y 60 sin match: POST /api/books (24), GET /api/books/{id} (21), DELETE /api/books/{id} (15), métodos no declarados en ese recurso.
- Cobertura actual: 105/653 = 16.08% (antes 73/653 = 11.18%). Endpoints 13/136; operaciones 24/170; status 66/387; parámetros 15/96. Brechas 671 (antes 711), críticas 269 (antes 285). Incluye GET auxiliar de cuenta y preparación/limpieza. Reportes raíz regenerados; IA histórica intacta; sin commits.

### Próximo punto de continuación

Los casos reproducibles de books están implementados y documentados. No repetirlos ni afirmar 100% mientras persistan las discrepancias de docs/BOOKS-COVERAGE.md. Siguiente recurso acotado recomendado: book-authors y luego book-genres, verificando primero contrato y handler de cada uno; inventario, pedidos y pagos siguen siendo recursos independientes. Mantener los roles de cuentas base, la restauración de estado, workers API 1 y GAD en solo lectura. No commitear sin solicitud.

---
## Última continuación — recurso users (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 31 tests de users con UsersClient, datos UUID, fixtures usersClient/usersClientForToken/adminUsersClient, userSchema y publicUserSchema. Cobertura reproducible: listado, alta, duplicados, todos los campos obligatorios reales, email inválido, GET/HEAD por id, PUT/PATCH persistentes, errores 400/422, autorización ausente/ajena, PATCH/DELETE inexistentes y eliminación propia.
- Limpieza: cuentas propias y login por API, DELETE con propietario en finally y GET 404. No se modifican usuarios base ni se resetea el dataset. Pruebas negativas verifican la proyección pública del recurso; GET oculta email/lastname/password como ****. El esquema de escritura mantiene email válido; el de lectura verifica explícitamente la máscara.
- Ajuste justificado de ejecución: proyecto api con workers 1 en playwright.config.ts para evitar escrituras solapadas de articles/users sobre el mismo archivo que consultan los handlers. Se conserva independencia por test y configuración de UI. No se modificó código de GAD ni herramientas de cobertura.
- Discrepancias verificadas: GET/HEAD ids abc/-1/0/1.5/%20 -> 404, no 400; /users/search?id=1 -> 404; PUT admin al id inexistente 999999 -> 500 (handler accede foundUser.birthDate cuando no existe). PUT 201/404 quedan sin cobertura. OpenAPI omite password como obligatorio pero GAD lo exige; POST email inválido da 422 y duplicado 409. Detalle: docs/USERS-COVERAGE.md.
- Validación final: API 56/56 pass (31 users + 25 anteriores), UI 2/2 pass con acceso autorizado al navegador instalado; ci:check OK sin warnings de lint; coverage:record 56/56 y 225 solicitudes matcheadas; coverage:baseline OK. git diff --check OK.
- Cobertura actual: 73/653 = 11.18% (antes 40/653 = 6.13%). Endpoints 5/136, operaciones 16/170, status 47/387, parámetros 10/96. Brechas 711 (antes 746), críticas 285 (antes 294). /users full; /users/{id} partial; /users/search none. Reportes raíz regenerados, IA histórica intacta. Sin commits.

### Próximo punto de continuación

Users tiene implementados los casos reproducibles del contrato consultado. No repetirlos ni afirmar 100%: quedan las discrepancias de docs/USERS-COVERAGE.md y los 12 parámetros de búsqueda bloqueados por la ruta 404. Para continuar cobertura, seleccionar otro recurso (por ejemplo books), verificando primero su contrato puntual y el prefijo atípico documentado. Mantener GAD en solo lectura y el gate existente; no hacer commit sin solicitud del usuario.

---
## Última continuación — Chromium y validación UI (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: npx playwright install chromium con permisos elevados. playwright install --list confirma Playwright 1.64.1 con chromium-1248, chromium_headless_shell-1248 y dependencias en la caché local.
- La ejecución restringida no accedía a la caché (EPERM al listar .links y navegador reportado como inexistente). Se ejecutó test:ui fuera de ese entorno con autorización del usuario: 2/2 pass, 5.0 s, exit 0. Login válido e inválido comprobados.
- No se cambió código, configuración, dependencias del proyecto ni reportes de cobertura. Los 25 tests API y checks previos conservan su última validación; no se repitieron en esta tarea. Cobertura actual 6.13% (40/653), 746 brechas, 294 críticas.
- docs/ARTICLES-COVERAGE.md actualizado: impedimento UI resuelto. Sin commits.

### Próximo punto de continuación

Validación API/UI completada en las últimas ejecuciones por proyecto. No reinstalar Chromium ni repetir tareas cerradas. Para ampliar cobertura, seleccionar una operación inicial de users y consultar solo su OpenAPI, handler y componentes asociados. Las discrepancias restantes de articles siguen documentadas en docs/ARTICLES-COVERAGE.md y requieren decisión sobre GAD/contrato; no modificar GAD ni commitear sin solicitud.

---
## Última continuación — cierre de casos reproducibles de articles (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- Solicitud atendida: completar los casos faltantes de articles. Añadidos PUT 201/400/422; PATCH 200/400/401/404/422; DELETE 400. Los casos negativos sobre recursos existentes verifican conservación; los positivos persistencia; limpieza por propietario. PUT 201 usa admin y limpia el ID realmente devuelto.
- Código: soporte PATCH y envío JSON crudo PUT/PATCH/DELETE en BaseApiClient, métodos ArticlesClient, helper local withOwnedArticle y tests en articles.api.spec.ts. Se conservó la ejecución secuencial de articles y el resto de decisiones existentes. No se modificó GAD.
- Estado detallado y evidencia: docs/ARTICLES-COVERAGE.md. POST/PATCH/DELETE cubren todos sus status documentados; GET existentes también. Permanecen discrepancias: PUT 404 (el ausente produce 201), HEAD 400 por ID inválido (404 en valores probados), GET /articles/search 200 y sus 12 parámetros (ruta devuelve 404). No se inventaron estados ni se enviaron filtros a otra ruta para aparentar cobertura.
- Hallazgo adicional: PATCH a un artículo soft-deleted puede devolver 200 aunque GET sea 404. El test 404 de PATCH usa missingArticleId realmente inexistente. La exploración PUT con usuario registrado devolvió 201 y se limpió su nuevo ID.
- Validación final: API 25/25 pass; ci:check OK sin warnings de lint; coverage:record 25/25, 87 solicitudes matcheadas; coverage:baseline y git diff --check OK. Intento UI: 2 tests no pudieron iniciar por falta del ejecutable chromium_headless_shell-1248; no se atribuye a un fallo funcional ni se declara UI validada.
- Cobertura real: 40/653 = 6.13% (antes 29/653 = 4.44%); operaciones 9/170, status 26/387, parámetros 5/96. Brechas 746 (antes 757), críticas 294 (antes 295). Reportes raíz regenerados, IA histórica sin cambios. Sin commits.

### Próximo punto de continuación

Los casos reproducibles pendientes de articles están implementados. No repetirlos. Para cerrar articles al 100% del contrato hace falta resolver las discrepancias enumeradas en docs/ARTICLES-COVERAGE.md; no modificar GAD dentro de este framework. Antes de declarar validada toda la suite, instalar el Chromium requerido por la versión actual de Playwright y ejecutar test:ui. Si se continúa ampliando cobertura, escoger un nuevo recurso documentado (por ejemplo users) y consultar solo sus archivos. No commitear sin solicitud del usuario.

---
## Última continuación — PUT articles 200/401 (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: ArticlesClient.updateById y dos tests @regression PUT /api/articles/:id sobre artículos propios. Autorizado: espera 200, valida articleSchema, payload, id y propietario, y verifica persistencia por GET. Sin autorización: espera 401 con mensaje exacto y confirma cuerpo original intacto por GET. Ambos limpian en finally con DELETE 200 y GET 404.
- Hallazgo de concurrencia: primer caso autorizado devolvió 201 en ejecución paralela y pasó aislado. El handler consulta articlesDb desde el archivo y convierte PUT en POST si no encuentra el recurso; causa probable: escrituras solapadas. Se configuró mode default en el spec articles para ejecutar sus casos en secuencia, conservando independencia, fixtures por test y paralelismo con auth. No usar sleeps ni aceptar 201 como actualización correcta.
- El primer intento dejó un artículo adicional por la conversión inesperada. Se identificó por id 74 y título UUID exacto y se limpió puntualmente con el propietario, comprobando DELETE 200/GET 404. Limpieza exploratoria fuera de los reportes finales.
- Validación final: coverage:record 16/16 pass, 37 solicitudes matcheadas; ci:check OK sin warnings de lint; coverage:baseline y git diff --check OK. No se modificó GAD.
- Cobertura actual: 29/653 = 4.44% (antes 25/653 = 3.83%); operaciones 8/170, status 17/387, parámetros 4/96. Brechas 757 (antes 761), críticas 295 (antes 296). PUT agrega operación, status 200/401 y parámetro id. Reportes raíz regenerados, IA histórica sin cambios, sin commits.

### Próxima tarea concreta

Cubrir PUT /api/articles/:id -> 422 por título ausente con autorización, usando un artículo creado por el propio test, verificando que no cambia y limpiando en finally. Consultar solo handler/contrato PUT, cliente, datos y spec articles. El builder sin título ya existe; updateById requiere actualmente ArticleCreate y necesitará admitir omisiones tipadas para el caso negativo. Mantener pendiente PUT 201/400/404 hasta verificarlos expresamente; no repetir casos completados ni modificar GAD. No commitear sin solicitud.

---
## Última continuación — DELETE articles 401 (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: test @regression DELETE /api/articles/:id sin autorización sobre un artículo propio creado en el test. Espera 401 y cuerpo exacto error.message 'Access token not provided!'. Después verifica GET 200, contrato articleSchema y cuerpo exactamente igual al de creación.
- Limpieza en finally mediante registeredArticlesClient: DELETE 200 y GET posterior 404. No usa artículos del dataset para el intento ni resetea datos globales. Único cambio de código: tests/api/articles.api.spec.ts; clientes y fixtures existentes fueron suficientes. GAD sin modificaciones de código.
- Validación final: coverage:record 14/14 tests API pass, 25 solicitudes matcheadas; ci:check OK; coverage:baseline y git diff --check OK.
- Cobertura actual: 25/653 = 3.83% (antes 24/653 = 3.68%); operaciones 7/170, status 15/387, parámetros 3/96. Brechas 761 (antes 762), críticas 296 sin cambios. El delta corresponde únicamente al 401 de DELETE. DELETE mantiene pendiente su 400 documentado.
- Reportes raíz regenerados, estimaciones IA históricas sin cambios. Sin commits.

### Próxima tarea concreta

Siguiente incremento recomendado: PUT /api/articles/{id}, empezando por actualización autorizada 200 de un artículo propio, comprobación mediante GET y limpieza en finally. Verificar antes ArticleUpdatePut, contrato de respuesta y validaciones/autorización reales del handler. Añadir también 401 sin autorización comprobando que el recurso permanece intacto. No modificar artículos base ni GAD, no repetir casos completados, no commitear sin solicitud. El 400 de DELETE queda pendiente de verificar, sin asumir que sea reproducible.

---
## Última continuación — POST articles 400 (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: test @regression POST /api/articles con JSON truncado y respuesta 400. Payload de datos: malformedArticleJson. Valida cuerpo exacto: error 'SyntaxError: Unexpected data in JSON. Please check Your JSON.' y details igual al payload enviado, confirmado contra el parser real de GAD.
- BaseApiClient.postRawJson envía Buffer y content-type application/json, conservando Authorization. send combina headers explícitos y pasa los mismos al recorder; redacción existente intacta. ArticlesClient.createFromRawJson expone la operación al spec. No se modificó GAD.
- Validación final: coverage:record 13/13 tests API pass, 19 solicitudes matcheadas; ci:check OK; coverage:baseline y git diff --check OK. Comprobado registro POST 400 con content-type application/json y authorization redactado como ***.
- Cobertura actual: 24/653 = 3.68% (antes 23/653 = 3.52%); operaciones 7/170, status 14/387, parámetros 3/96. Brechas 762 (antes 763), críticas 296 sin cambios. /articles figura full (GET y POST), junto con /login; /articles/{id} sigue partial.
- POST /articles tiene observados todos sus status documentados: 201/400/401/422. Esto no implica cobertura de todas las combinaciones de payload o validaciones. Reportes raíz actualizados; estimaciones IA históricas intactas; sin commits.

### Próxima tarea concreta

Ampliar DELETE /api/articles/{id} con 401 sin autorización usando el id de un artículo creado y limpiado por el propio test. Verificar que el intento rechazado conserva el artículo; limpiar con el cliente propietario en finally. El 200 de DELETE ya se ejecuta y verifica como limpieza de POST. Consultar solo cliente, fixtures/spec/datos articles, contrato DELETE y handler relacionado. No repetir POST ni modificar GAD. Regenerar cobertura y actualizar handover al completar.

---
## Última continuación — POST articles 422 (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: test @regression de POST /api/articles con autorización y título ausente. Espera 422 y cuerpo exacto { error: { message: 'One of mandatory field is missing', details: ['user_id', 'title', 'body', 'date'] } }, confirmado en ejecución real.
- buildArticleWithoutTitle devuelve Omit<ArticleCreate, 'title'>; buildArticle conserva payload válido. ArticlesClient.create acepta Partial<ArticleCreate> para enviar campos ausentes en pruebas negativas sin casts ni any. No se modificó GAD ni los casos existentes.
- Validación: test:api ejecutó correctamente los 12 casos; coverage:record finalizó con 12/12 pass y 17 solicitudes matcheadas; ci:check OK sin warnings de lint; coverage:baseline y git diff --check OK.
- Cobertura actual: 23/653 = 3.52% (antes 22/653 = 3.37%). Operaciones 7/170, status 13/387, parámetros 3/96. Brechas 763 (antes 764), críticas 296 sin cambios. El único incremento de cobertura corresponde al status 422 de POST /articles.
- Reportes de raíz regenerados. Estimaciones IA históricas sin cambios; sin commits.

### Próxima tarea concreta

Verificar POST /api/articles -> 400 por JSON malformado (último status documentado pendiente de POST). Revisar puntualmente cómo enviar un cuerpo crudo con content-type application/json desde BaseApiClient manteniendo la grabación; evitar enviar un string que Playwright serialice como JSON válido. Confirmar contrato real del error y añadir solo ese caso si se reproduce. No repetir 201/401/422, no modificar GAD, no commitear sin solicitud.

---
## Última continuación — POST articles (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: POST /api/articles con 201 autorizado (contrato articleSchema y valores enviados) y 401 sin autorización (error.message exacto). Ambos @regression.
- Nuevos métodos ArticlesClient.create/deleteById, tipo ArticleCreate y buildArticle con título UUID, fecha pasada estable e image vacío. Fixture registeredArticlesClient usa users.registered: permite user_id numérico y limpieza por el propietario, conservando el fixture admin existente.
- Limpieza en finally: DELETE del id devuelto, espera 200 y verifica GET posterior 404. Las dos ejecuciones terminaron correctamente, incluida la limpieza; no se reseteó el dataset ni se modificó código de GAD.
- Validación final: suite API 11/11; ci:check OK sin warnings de lint; coverage:record 11/11, 15 solicitudes matcheadas; coverage:baseline OK; git diff --check OK.
- Cobertura real actual: 22/653 = 3.37% (antes 16/653 = 2.45%). Operaciones 7/170, status 12/387, parámetros 3/96; endpoints 3/136. Brechas 764 (antes 770), críticas 296 (antes 298).
- El delta incluye DELETE /articles/{id} de limpieza (operación, 200 e id), además de POST (operación y 201/401). La herramienta mide solicitudes ejecutadas y no distingue preparación/limpieza de la acción principal. No afirmar que DELETE tiene cobertura completa.
- POST conserva pendientes 400 y 422 documentados; HEAD conserva pendiente 400. Reportes de raíz regenerados; estimaciones IA históricas sin cambios. Sin commits.

### Próxima tarea concreta

Cubrir POST /api/articles -> 422 con autorización y un campo obligatorio ausente. Verificar mensaje y estructura reales de GAD antes de fijar el contrato del error. Consultar solo handler articles, mandatory_non_empty_fields_article, datos, cliente y spec correspondientes. Mantener payload válido por defecto y permitir omitir un campo de forma tipada para el caso negativo. No repetir casos 201/401 ni cambiar GAD. Regenerar cobertura después del test y actualizar este documento.

---
## Última verificación — HEAD con identificadores atípicos (2026-11-05)

Esta sección prevalece sobre las continuaciones inferiores.

- COMPLETADO: verificación puntual del 400 documentado en HEAD /api/articles/{id}. No se reprodujo con los valores probados; no afirmar que sea imposible en cualquier condición.
- Solicitudes reales HEAD: abc -> 404; -1 -> 404; 0 -> 404; 1.5 -> 404; 2147483648 -> 404; %20 -> 404; %ZZ -> 500. Todas devolvieron cuerpo vacío. %ZZ es una secuencia URL malformada; el 500 es un comportamiento inesperado observado, no un contrato a consolidar como correcto.
- El OpenAPI admite id integer o string; abc por sí solo no viola el tipo documentado. No se encontró una rama específica de validación HEAD en el handler articles consultado; el servidor delega /api al router json-server.
- No se añadieron tests redundantes de 404 ni un test que esperase un 400 no observado. No se modificó código, GAD ni reportes. Cobertura de la suite permanece en 2.45% (16/653), 770 brechas, 298 críticas; no se regeneró porque la suite no cambió. Las solicitudes exploratorias no se incorporaron al recorder de cobertura.
- Se utilizó un proceso temporal de GAD para la comprobación y se detuvo al finalizar. No se repitieron tests completados ni checks sin cambios de código.

### Próxima tarea concreta

Elegido el siguiente incremento: POST /api/articles. Revisar exclusivamente su contrato OpenAPI (ArticleCreate y Article), el handler articles y ArticlesClient/fixtures/spec/datos relacionados. Planificar creación con datos propios y limpieza en finally antes de implementar el caso 201; verificar también 401 sin autorización. No alterar el dataset global ni modificar GAD. HEAD 400 queda como discrepancia pendiente de aclarar en la app/contrato, no como test implementable confirmado. No hacer commit sin solicitud.

---
## Última continuación — incremento articles (2026-11-05)

Esta sección prevalece sobre todos los puntos de continuación anteriores.

- COMPLETADO: HEAD /api/articles/:id con casos 200 para knownArticle.id y 404 para missingArticleId, ambos verifican cuerpo vacío. Nuevos tests @regression en tests/api/articles.api.spec.ts.
- Implementación mínima: BaseApiClient admite HEAD mediante send y el recorder existente; ArticlesClient expone headById. No se modificó GAD ni los casos previos.
- Validación: npm run test:api 9/9; npm run ci:check OK sin warnings de lint; coverage:record 9/9, 10 solicitudes matcheadas; coverage:baseline OK; git diff --check OK.
- Cobertura real: 16/653 = 2.45% (antes 12/653 = 1.84%). Operaciones 5/170, status 9/387, parámetros 2/96, endpoints 3/136. Brechas 770 (antes 774), críticas 298 (antes 299). HEAD conserva pendiente el 400 documentado; no se declara totalmente cubierto.
- Discrepancia comprobada: GET /api/articles/search?id=1 y con id inexistente devuelven 404 en GAD local pese al 200 documentado en OpenAPI. Se descartó la implementación exploratoria de search; no hay tests de búsqueda añadidos ni solicitudes de búsqueda en la grabación final. No sumar cobertura artificial ni modificar el contrato para ocultarlo.
- Primera ejecución sin START_APP falló por ECONNREFUSED; se levantó GAD con START_APP=true y las verificaciones finales pasaron.
- Reportes de raíz regenerados; estimaciones IA permanecen históricas sin cambios. Cambios de ambas continuaciones sin commit.

### Próxima tarea concreta

Verificar puntualmente si HEAD /api/articles/:id puede producir el 400 documentado usando un id inválido. Si GAD devuelve 404 para esos valores, documentar la discrepancia y elegir otro incremento. Para ello consultar solo ArticlesClient, los tests articles, la operación HEAD del OpenAPI y el routing pertinente si fuera necesario. No repetir GET /api/login ni HEAD 200/404; no modificar GAD ni hacer commit sin solicitud.

---
## Actualización de continuidad — 2026-11-05

Esta actualización prevalece sobre las secciones históricas y el NEXT AI PROMPT inferior.

- COMPLETADO: authenticatedAuthClient y tests GET /api/login para 200 con token válido y 401 sin token. No repetir esta tarea.
- Contrato real: 200 devuelve {} sin verbose; 401 sin Authorization devuelve { error: { message: 'Access token not provided!' } }.
- Hallazgo: admin/admin emite un token, pero este endpoint lo rechaza porque el superadmin no pertenece al dataset. El fixture usa users.registered, configurable mediante QA_REGISTERED_USER y QA_REGISTERED_PASS; defaults del dataset base: Moses.Armstrong@Feest.ca / test1. Ajustar al cambiar dataset.
- Cambios: fixture, spec auth, esquema estricto de respuesta vacía, datos users, configuración env y .env.example. AuthClient y GAD permanecen sin cambios.
- Validación: npm run test:api 7/7; npm run ci:check OK; coverage:record 7/7, 8 solicitudes matcheadas; coverage:baseline OK; git diff --check OK. Suite actual: 7 API y 2 UI existentes; no se repitió UI en esta continuación.
- Cobertura regenerada: 12/653 = 1.84% (antes 9/653 = 1.38%). Operaciones 4/170; status 7/387; parámetros 1/96; endpoints 3/136, uno completo (/login). Brechas 774, críticas 299.
- Reportes de raíz actualizados. Las estimaciones IA siguen siendo históricas del Día 1; no son una medición de esta nueva suite.
- Cambios sin commit. No commitear sin solicitud del usuario.

### Nuevo punto exacto de continuación

La tarea de la sección 5 está completada. Próximo incremento: seleccionar una operación o parámetro documentado de articles. Consultar primero src/sut/api/articles.client.ts, tests/api/articles.api.spec.ts y solo el contrato OpenAPI de esas operaciones. Confirmar cuáles parámetros documenta antes de añadir casos; no asumir que userId, q o _limit cuentan para cobertura. Mantener el ciclo de checks, grabación, regeneración y revisión del delta real. No hay código a medio implementar.

---
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
