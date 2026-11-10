## Seguimiento Day 3: ejecucion remota y pendientes (2026-11-10)

- Commit `c57c98e` corrigio la instrumentacion equivalente; `56269b5` alineo `shopReportingSandbox` y `paymentCardsSandbox` con el `isolatedBookShopDatabase` que usa `orderSandbox`. Ejecucion manual `42705021231`: [Actions / HTML artifact](https://github.com/Nano3559/Challenge/actions/runs/42705021231). El PR #1 recibio el comentario actualizado. La base y PR produjeron metricas c8 validas.
- Resultado despues de sincronizar fixtures: **tests PR: success**, todos los checks, unit, c8 y OpenAPI: success. Base conserva tests failure, asi que el gate aun falla por el baseline. c8 base: lineas/statements 31.43%, ramas 70.09%, funciones 13.73%; PR: lineas/statements 34.79%, ramas 77.17%, funciones 20.68%. Delta: +3.36, +7.08 y +6.95 pp. OpenAPI global base 92.50%, PR 74.73%, -17.77 pp.
- En base, 3 pruebas siguen fallando: GET visitas con filtro `ids` de articles/comments/users (su comportamiento observado no respeta el filtro) y PATCH de pedido con fondos insuficientes. Son baseline GAD, no se edita GAD ni se reducen assertions. La prueba PR completa pasa tras compartir DB por test entre fixtures relacionadas.
- En progreso local: separar la validez de medicion/test infra del resultado funcional de tests en `run-status.json`; mostrar el fallo base en summary/comentario sin invalidar metricas; mantener gate rojo ante tests PR fallidos, metricas ausentes, c8/OpenAPI ausentes o umbrales configurados incumplidos. Asi no se ocultan fallas base ni se bloquea la comparacion cuando el PR esta verde.
- Claude/Anthropic queda excluido por solicitud. El workflow de comentario y el artifact estan implementados y verificados; coverage c8 y OpenAPI producen deltas. Validacion local mas reciente: `npm run ci:check`, 32/32 unitarias de coverage, `git diff --check`.
- Pendiente inmediato: commit/push de la separacion de status, una ejecucion final de Actions que confirme PR tests green y base fallida visible (sin gate rojo por base), actualizar comentario/handover con el resultado. GAD intacto.

## Cierre tecnico Day 3 (2026-11-09)

- Inventario y pedidos: `orderSandbox` e `inventorySandbox` usan una base aislada por prueba, evitando que libros, stock y estados creados por casos anteriores contaminen los siguientes. Los 7 casos de reproduccion de 404 pasaron. Regresion conjunta con `CI=true`: 85 tests pasaron y 1 fallo intermitente de `DELETE /api/book-shop-orders/items` (404 en intento inicial) paso en el retry. Se conserva la asercion 200; el comportamiento queda registrado como defecto/flaky de GAD y no se modifica la app.
- c8/V8: Playwright ahora inicia GAD con `tools/gad/coverage-server.js`; ambas formas de sandbox cierran el servidor de manera ordenada para que Node escriba coverage al terminar. `validate-v8-coverage.js` confirma que hay scripts de GAD ejecutados antes de c8; datos ausentes fallan como no disponibles. Prueba local de un caso: 220/220 scripts GAD vistos, 27,957/114,102 lineas (24.50%), 583/1,026 branches (56.82%), 167/1,988 funciones (8.40%). Es una prueba puntual, no el agregado de la suite.
- Comentarios PR: el workflow usa `pull-requests: write` como permiso acotado al recurso. Requiere una nueva ejecucion de Actions para confirmar el comentario automatico.
- Claude se omite por instruccion del usuario; no se configuro proveedor ni secreto.
- Validacion actual: `npm run ci:check` aprobado, 31/31 pruebas de coverage y parseo YAML aprobado. No se cambio GAD ni se debilitaron aserciones.

## Seguimiento Day 3 — estado de PR (2026-11-09)

- Corregido el test de `/visits/articles`: el ID esperado ausente se calcula como una clave fuera del mapa real de visitas. `999999` no era inexistente en los datos CI. Validación local contra GAD: 1/1 aprobado; `npm run ci:check` aprobado; `npm run test:coverage:unit` 29/29.
- Siguen pendientes los 404 book-shop observados en pruebas de base/PR y el c8 remoto 0/114102. Una reproducción local de cobertura escribió archivos V8, pero ninguno incluyó módulos GAD procesables; no se debe tomar como cobertura válida. GAD no se modifica.
- El comentario automático recibió 403 `Resource not accessible by integration` con `issues: write`; requiere revisar permisos efectivos Actions/organización o configurar un token autorizado.
- El workflow Claude no se ejecutó por falta de `ANTHROPIC_API_KEY`/`CLAUDE_CODE_OAUTH_TOKEN`. La generación manual con Codex es posible, pero no satisface automatización autónoma en Actions.

## Continuación por módulos — coverage agregada (2026-11-06)

Se completó lo pendiente de recorder para quiz y hangman: ejecución conjunta 5/5 aprobada con `--keep`, 34 solicitudes nuevas registradas. `npm run coverage:baseline` regeneró los reportes raíz. Acumulado: 2509 solicitudes, 2193 reconocidas, 316 sin match; coverage 488/653 = 74.73%; 107/136 endpoints, 140/170 operaciones, 293/387 estados, 55/96 parámetros; 29 rutas sin cobertura, 194 brechas (59 críticas). IA histórica intacta. La regresión de los 399 tests API no se ejecutó.

El siguiente trabajo es minesweeper. Cambios acumulados listos para el commit solicitado por el usuario; GAD sigue sin cambios.

---

## Continuación por módulos — hangman (2026-11-06)

Completado hangman con `HangmanClient`, esquemas Zod, fixture `hangmanSandbox` y 2 pruebas en `tests/api/hangman.api.spec.ts`. Instancia y DB son desechables: el alta del score no altera datos de la ejecución compartida.

Validación: 2/2 pruebas pasan con `npx playwright test tests/api/hangman.api.spec.ts --project=api`; `npm run ci:check` sin errores ni advertencias. Cubre palabra aleatoria pública en minúsculas, highscores públicos, 401 de score anónimo, 422 de score omitido/no numérico, score válido 201 y presencia del resultado en highscores. Ahora hay 399 tests API definidos (397 antes + 2). El recorder y los reportes raíz se actualizaron posteriormente; cifras vigentes están en la sección superior. No se ejecutó regresión completa.

Discrepancia: `/hangman/highscores` devuelve `{ highScore: [...] }`, aunque OpenAPI referencia `Scores` con forma distinta. El contrato de score no incluye requestBody aunque el handler valida `{score:number}`. No se cubrieron rutas v2 internas porque no forman parte de la API documentada en esta tarea.

Siguiente: minesweeper (`/minesweeper/highscores`, `/minesweeper/score`); luego tic-tac-toe. Mantener el aislamiento. Sin commit.

---

## Continuación por módulos — quiz (2026-11-06)

Se continúa el módulo de juegos desde quiz, según el cierre anterior. Implementado `QuizClient`, esquemas Zod y `tests/api/quiz.api.spec.ts` (3 pruebas). Fixture `quizSandbox` arranca una instancia GAD independiente con copia desechable de la base; start/stop y su escritura de score no tocan la instancia compartida ni los datos semilla originales. GAD permanece sin cambios.

Validado: 3/3 pruebas del módulo aprobadas con `npx playwright test tests/api/quiz.api.spec.ts --project=api` (1 worker). Cubre 401 para acciones privadas, lecturas públicas de count/highscores, preguntas autenticadas sin exponer respuestas, respuesta correcta/incorrecta, límite de 10 comprobaciones (11.ª devuelve 409), stop y score visible en highscores. Quedan 397 tests API definidos (394 del cierre previo + 3 quiz). No se ejecutó regresión completa, ni se regeneraron en este paso los reportes de coverage/recorder; por tanto el agregado 465/653 del cierre previo aún no incluye quiz.

Discrepancias: el banco contiene 96 preguntas, `/quiz/questions/count` devuelve 96, pero `/quiz/questions` limita a 10. Highscores responde `{ highScore: [...] }`, aunque el esquema OpenAPI modela incorrectamente un objeto con `items`. Stop puede devolver 200 si conserva score previo o 201 cuando persiste uno nuevo. No se probó body inválido ni se legitimaron respuestas no documentadas.

Hangman se completó en la continuación siguiente. Seguir por minesweeper y después tic-tac-toe. Mantener cada juego en copia aislada. Sin commit nuevo.

---

## Cierre de sesión — API pendiente por módulos (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- ALCANCE CONFIRMADO: toda la API pendiente. La aclaración anterior ya está resuelta. El usuario solicitó después cerrar hasta este punto y documentarlo porque la memoria se está llenando; continuar por módulos en la próxima sesión. NO iniciar otro módulo durante este cierre.
- COMPLETADOS tres bloques: salud/catálogos (13 tests), estadísticas/visitas/datos/calculadoras (23), flashposts/mensajería/encuestas (6). Son 42 tests nuevos; 394 API definidos en total (352 anteriores + 42). Clientes OperationsClient/CommunityClient, datos operations/community, esquemas y fixtures específicos añadidos. Detalle exhaustivo: docs/PUBLIC-API-MODULES-COVERAGE.md. Hoja de continuidad global: docs/API-COMPLETION.md.
- VALIDACIÓN EXACTA: los 42 nuevos se ejecutaron conjuntamente y aprobaron 42/42. Última regresión COMPLETA anterior: 352/352. NO se ejecutó una regresión completa de los 394 en este cierre. ci:check sin advertencias y git diff --check correctos. UI no reejecutada (última ejecución anterior 2/2). No mezclar estas cifras ni afirmar 394/394 completos.
- GRABACIÓN AGREGADA: --keep con solo los tres módulos nuevos añade 149 solicitudes a las 2326 previas. Total 2475, reconocidas 2159, sin match 316, tres archivos. Las ejecuciones puntuales fallidas de desarrollo no forman parte del baseline. coverage:baseline regenerado; IA histórica intacta.
- COBERTURA ACTUAL: 465/653 = 71.21% (antes 319/653 = 48.85%). Endpoints 98/136, operaciones 131/170, estados 279/387, parámetros 55/96. Brechas 226, críticas 77; 38 rutas todavía sin cobertura. Es cobertura agregada de métodos/estados/parámetros, no conformidad total ni ausencia de defectos.
- AISLAMIENTO: comunidad usa commentSandbox y su copia social; pruebas con usuarios/mensajes/encuestas propios y ficticios. Lecturas operativas usan operationsClient; random/article positivo usa freshOperationsClient con una copia fresca por caso para evitar inactivos creados por otras pruebas. Todo reutiliza startAccountSandbox; cero carpetas de sandbox al cerrar. GAD y analyzer sin cambios, datos/roles semilla habituales sin mutaciones.
- INCIDENCIAS/LÍMITES: nuevo cliente CommunityClient tenía método send que colisionaba con el privado del cliente base; corregido a sendMessage. Enviar desde usuario sin colección de contactos dio 500: defecto GAD documentado, no legitimado; 403 se prueba con colección existente y destinatario aún no agregado. POST flashposts/mensajes devuelve 201 frente a 200 documentado; primer PUT contactos 201. GET flashposts público devuelve 200 sin token. Handler de privado envía contenido en 401 (no se acredita protección del body). Descripciones de encuesta desconocida pueden envolver objeto vacío con 200; answers real objeto frente a array documentado. Ver documento antes de intentar cubrir estados faltantes.
- ESTADÍSTICAS/DATOS: rankings de visitas son mapas con claves enteras; se verifica selección de mayores valores, no orden de propiedades JSON. Handler de filtros ids para users/comments usa mapa de artículos (pendiente correcto, no fake). ROI simple tiene iteración adicional con <= y costos firmados; no se acredita validez financiera completa. Estadísticas pueden incluir inactivos; random/article elige colección sin filtrar (positivo aislado). Scores/idioma inexistentes dan 200 vacío, no 404.
- SIN COMMIT NUEVO: cambios acumulados sobre 8ac975d, no commitear sin solicitud nueva. No reanalizar repositorio ni repetir recursos cerrados.

### Próximo módulo: juegos

Revisar únicamente contrato y handlers de quiz, hangman, minesweeper y tic-tac-toe. Empezar por quiz (questions/count/start/check/stop/highscores), usando datos propios en copia desechable. Este módulo todavía NO está implementado; solo games/scores de catálogo se completaron y no deben repetirse.

Después: archivos/captcha; diagnósticos y restauraciones, siempre en procesos independientes desechables para no detener ni resetear instancias compartidas. Searches ausentes y otros defectos previos siguen abiertos y documentados. No modificar código de GAD sin ampliar expresamente el alcance actual de solo lectura. Mantener arquitectura, datos/roles semilla y API workers 1.

---
## Última continuación — comentarios y funciones sociales (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- SOLICITUD GLOBAL AÚN PENDIENTE: el usuario pidió todos los siguientes. Se preguntó si significa toda API pendiente o solo área de artículos; no llegó respuesta durante esta ejecución. Se avanzó el bloque común de artículos, sin declarar terminado el proyecto. Quedan 87 rutas sin cobertura además de métodos/estados/parámetros.
- COMPLETADO: 14 pruebas nuevas (7 comentarios y 7 funciones sociales/configuración). Comentarios: esquema/listado, CRUD persistente propio, permisos de propietario/otro/anónimo, JSON malformado, valores inválidos POST/PUT/PATCH, inexistentes, PUT upsert201 y limpieza. Sociales: etiquetas públicas/asignación inicial201/validaciones; likes artículo/comentario con alternancia y contadores/mylikes/query; marcadores de usuario nuevo con alternancia e aislamiento; 404 de flags desactivadas.
- Las flags labels/likes/bookmarks están desactivadas por defecto. Se extendió startAccountSandbox con opción socialFeatures y bootstrap propio que las activa SOLO en memoria de una copia independiente. commentSandbox usa isolatedSocialDatabase; tienda/cuentas mantienen copia/configuración anterior. No se cambió configuración ni código fuente de GAD. Cliente base añade GET/POST con headers explícitos para registrar userid sin modificar métodos existentes.
- DEFECTOS/LIMITACIONES: HEAD de comentario inactivo devuelve200 mientras GET404; PUT inexistente crea201 (404 no acreditado); PATCH null sobre inexistente alcanzó404 sin validación422, no se legitimó. Actualizar etiquetas por ruta documentada después del alta devuelve404 y conserva asociación: diagnóstico aislado fuera del recorder, 200 sigue pendiente. articles/search ya estaba documentado como404: no se repitió ni se atribuyeron filtros del listado a esa ruta. comments/search sin handler específico identificado sigue pendiente.
- Validación: regresión 352/352 API aprobadas; luego comprobación adicional PUT422 y siete tests de comentarios repetidos 7/7 correctos. Grabación agregada --keep: 2267 solicitudes completas +59 puntuales=2326, reconocidas2010, sin match316; no incluye ejecuciones fallidas. ci:check sin advertencias y git diff --check correcto. UI no reejecutada (última validación anterior2/2). Cero carpetas sandbox, sin escrituras a base habitual.
- Cobertura actual319/653=48.85% (antes248/653=37.98%). Endpoints49/136, operaciones76/170, estados206/387, parámetros37/96; brechas421, críticas181. Reportes agregan modo social habilitado/deshabilitado; no equivalen a funcionamiento por defecto ni ausencia de defectos. IA histórica intacta. Detalle docs/ARTICLE-RELATED-COVERAGE.md. Cambios acumulados SIN commit sobre8ac975d; no commitear sin solicitud nueva.

### Próximo punto de continuación

Aclarar alcance pendiente con usuario (toda API frente a área de artículos) y continuar sin repetir este bloque. Si es toda API: siguiente bloque candidato health/about/ping y catálogos públicos; solo se consultaron sus contratos/handlers puntualmente, todavía SIN implementación. Siguen abiertos búsquedas ausentes, actualización de etiquetas y defectos documentados de tarjetas/pedidos/equipo. Corregir GAD requiere ampliar expresamente alcance de código en solo lectura. Mantener arquitectura, roles/datos semilla, aislamiento y API workers1.

---
## Última continuación — tarjetas y recargas locales (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 26 pruebas nuevas de book-shop-account-payment-cards GET/PUT/DELETE y POST /topup: permisos, ausencia de cuenta/tarjeta, alta/reemplazo/persistencia enmascarada, campos inválidos, duplicado propio, campos de propietario/saldo ignorados, baja e aislamiento, CVV/importes/rango/saldo insuficiente y recargas exitosas de 100/50000 con historial/saldos y otro comprador intacto. Cliente/datos/esquemas/fixture añadidos; solo tarjetas ficticias de 20 dígitos y fondos locales en copia desechable, sin cobros externos.
- TRES DEFECTOS CONFIRMADOS mediante diagnósticos aislados fuera del recorder: mismo número registrado en dos cuentas devuelve 200; card_number null en PUT da 500; topup 100.75 responde 200 pero registra/acredita 100 por parseInt. No se legitimaron como expectativas positivas. Siguen abiertos también los defectos previos de pedidos/equipo y la ruta order-items ausente; GAD sigue en solo lectura de código.
- Discrepancias: expiration_date real frente a expiry_date de OpenAPI; GET solo devuelve número enmascarado y saldo, PUT datos completos sin ID y topup tarjeta completa con ID. Topup exige CVV, ignora card_number y acredita cuenta/historial tras 7–15 s. Se usa polling condicionado de 20 s y margen de test de 45 s en positivos. Historial topup con order_id null usa esquema propio, sin cambiar esquema existente de compras. Tarjeta nueva tiene saldo 50000; no se simuló éxito de 100000 alterando la base.
- Validación: 26/26 nuevos puntuales; regresión final 338/338 API aprobadas, sin fallos/flaky. ci:check sin advertencias y git diff --check correcto. Primer puntual interrumpido por expectativa inicial incorrecta de GET completo; renderer verificado, esquemas separados y repetición correcta antes de grabación final. UI no reejecutada en entrega solo API; última validación previa 2/2. Cero carpetas sandbox tras finalizar, incluida limpieza verificada de copias abandonadas.
- Cobertura: 248/653 = 37.98% (antes 232/653 = 35.53%). Endpoints 39/136, operaciones 59/170, estados 163/387, parámetros 26/96. Solicitudes 2154, reconocidas 1836, sin match 318. Brechas 502, críticas 208. Reportes raíz regenerados, IA histórica intacta. Ambas rutas full por métrica; no equivale a conformidad de cuerpos ni ausencia de defectos.
- Cuentas/tarjetas/historial habituales intactos: SHA-256 antes/después 187e098818f862968037b9f67470608015c9afe21ba0679e7b9ea95e650358f1. Detalle en docs/BOOK-SHOP-PAYMENT-CARDS-COVERAGE.md. GAD/analyzer sin cambios; cambios acumulados SIN commit sobre 8ac975d, no commitear sin solicitud nueva.

### Próximo punto de continuación

No repetir tarjetas/recargas ni recursos cerrados. Siguiente candidato de cobertura: articles/search, revisar puntualmente contrato/handler y filtros, sin reabrir CRUD de artículos completado. Prioridad de producto: defectos documentados de tarjetas, pedidos y equipo y ruta order-items ausente; corregir GAD requiere ampliar expresamente alcance de código en solo lectura. Mantener arquitectura, datos/roles semilla, aislamiento y API workers 1.

---
## Última continuación — gestión administrativa de cuentas (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 23 pruebas nuevas de GET book-shop-manage/accounts y PATCH book-shop-manage/accounts/{id}: listado con proyección usuario/rol, permisos de anónimo/token inválido/lector/coordinador/sin cuenta, cinco roles válidos con persistencia y restauración, ocho cuerpos inválidos, IDs inexistente/textual/ausente, campos adicionales ignorados, rechazo de autoascenso y concesión/revocación efectiva con mismo token. Cliente reporting extendido, datos/esquema específicos; aislamiento y helper de compradores existentes reutilizados.
- Estas rutas existen en GAD pero no en OpenAPI: no se atribuyeron al recurso book-shop-accounts por su rewrite interno. PATCH solo aplica role_id existente; no edita fondos/dueño/colecciones. manage-accounts está reservado a rol 1. Mutaciones solo sobre cuentas nuevas en copia desechable; roles restaurados en finally y semillas intactas.
- Validación: 23/23 nuevos puntuales y regresión final 312/312 API aprobadas; ci:check sin advertencias, git diff --check correcto. UI no reejecutada en esta entrega exclusivamente API; última ejecución anterior 2/2 aprobadas. Copias descartadas, cero carpetas sandbox.
- Cobertura OpenAPI sin cambios: 232/653 = 35.53%. Endpoints 37/136, operaciones 55/170, estados 151/387, parámetros 26/96; brechas 520, críticas 214. Solicitudes 1838, reconocidas 1554, sin match 284. Reportes raíz regenerados, estimaciones IA intactas.
- Huella original pedidos/inventario/cuentas/historial/roles sin cambios: b779f3b60071f5dfe3235aabb664748e222729838f68e596427c2c7b5ee4b3cc. Detalle en docs/BOOK-SHOP-MANAGE-ACCOUNTS-COVERAGE.md. GAD/analyzer sin cambios de código; cambios acumulados SIN commit sobre 8ac975d. No commitear sin solicitud nueva.

### Próximo punto de continuación

No repetir gestión de cuentas. Siguiente candidato: book-shop-account-payment-cards y /topup; revisar primero contrato, handler y alcance local de fondos/tarjetas, usando solo datos ficticios propios en aislamiento existente. Siguen pendientes acceso público a team, ruta order-items ausente y tres defectos de pedidos; corregir GAD requiere ampliar expresamente el alcance de código en solo lectura. Mantener arquitectura, roles semilla y API workers 1.

---
## Última continuación — historial, estadísticas y gestión de personas (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 42 pruebas nuevas: 5 de book-shop-payment-history (401/404/vacío, compra con saldos/importe/pedido y aislamiento entre cuentas), 27 de estadísticas orders/users/items/all (esquemas, permisos, proyecciones, reconciliación con pedidos y deltas de datos propios), 10 de manage/users y team (consultas simples/múltiples/repetidas/mixtas, permisos, falta de query, catálogo de personal). Cliente/datos/esquemas/fixture y helper de preparación añadidos; no repetir recursos completados.
- DEFECTO CONFIRMADO: GET manage/team devuelve 200 con datos de personal sin token y con token inválido, pese a bearerAuth y 401 declarados. Diagnóstico aislado fuera del recorder; no se convirtió la exposición en expectativa positiva. El 401 sigue pendiente. Código GAD en solo lectura.
- Discrepancias: historial no aparece en OpenAPI, account_id query se ignora y cuenta se obtiene del token; /payment-history/mock queda capturado por rama normal. Estadísticas /items tampoco documentadas. manage/users devuelve mapa id->{name}, no Users; ID inexistente da 200 vacío y sin query da 404. Team usa user_name/avatar/role_name/created_at, no user_id/role_id/joined_at. Devoluciones completas siguen limitadas por defecto previo que aplica efectos a cuenta del personal. Detalle: docs/BOOK-SHOP-REPORTING-COVERAGE.md.
- Validación: 42/42 nuevos puntuales; regresión final 289/289 API y 2/2 UI aprobadas; ci:check sin advertencias y git diff --check correcto. Toda preparación/mutación en copia desechable existente, API workers 1. Sin tarjetas ni cobros externos.
- Cobertura: 232/653 = 35.53% (antes 213/653 = 32.62%). Endpoints 37/136, operaciones 55/170, estados 151/387, parámetros 26/96. Solicitudes 1590, reconocidas 1350, sin match 240; brechas 520, críticas 214. Reportes raíz regenerados, IA histórica intacta. Stats documentadas y manage/users full por métrica; no equivale a conformidad de cuerpos. Team parcial; historial/stats items sin match no se atribuyen a otras rutas.
- Pedidos/inventario/cuentas/historial/roles habituales intactos, SHA-256 b779f3b60071f5dfe3235aabb664748e222729838f68e596427c2c7b5ee4b3cc. GAD/analyzer sin cambios; cambios acumulados SIN commit sobre 8ac975d. No commitear sin solicitud nueva.

### Próximo punto de continuación

No repetir los tres incrementos cerrados. Siguiente recurso candidato: book-shop-manage/accounts, revisar contrato/handler y cambios únicamente sobre cuentas propias aisladas; no cambiar roles semilla. Prioridad de producto abierta: acceso público a team, ruta order-items ausente y tres defectos de pedidos; corregir GAD requiere ampliación expresa del alcance de código en solo lectura. Mantener arquitectura, aislamiento y API workers 1.

---
## Última continuación — roles de tienda (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 16 pruebas nuevas de book-shop-roles: catálogo público con sesión anónima/admin/lector/coordinador/usuario sin cuenta/token inválido, consulta de los cinco IDs, ID inexistente 404 y ocho rechazos de POST/PUT/PATCH/DELETE para anónimo y administrador con catálogo intacto. Cliente, datos, esquemas y fixture aislada añadidos. No existe CRUD administrativo de roles; handler solo acepta GET. No repetir permisos ya cubiertos en sus recursos.
- Contrato: solo GET del listado está documentado. GET por ID y escrituras rechazadas son rutas/comportamientos reales adicionales; el 404 por ID no acredita el 404 documentado del listado. Ese estado de listado no se reproduce con dataset base y sigue pendiente; recurso parcial en el medidor. Roles solo exponen ID/nombre, sin lista de permisos.
- Validación: 16/16 nuevos en ejecución puntual; regresión final 247/247 API y 2/2 UI aprobadas; ci:check sin advertencias y git diff --check correcto. Primer intento aislado interrumpido por ECONNREFUSED, grabación descartada; repetición fuera del entorno restringido correcta. Copias desechables descartadas, incluida la abandonada tras verificar procesos activos.
- Cobertura actual: 213/653 = 32.62% (antes 211/653 = 32.31%). Endpoints 32/136, operaciones 50/170, estados 138/387, parámetros 25/96. Solicitudes 1327, reconocidas 1105, sin match 222. Brechas 544, críticas 224. Reportes raíz regenerados, IA histórica intacta.
- Roles habituales intactos: SHA-256 1b83e5d1c1bc5feac87eed5fe67c3f4eafcb653a5b0fe00c3a6b84f15f97dbcb antes/después. GAD y analyzer sin cambios. Detalle en docs/BOOK-SHOP-ROLES-COVERAGE.md. Cambios acumulados SIN commit sobre 8ac975d; no commitear sin solicitud nueva.

### Próximo punto de continuación

No repetir recursos cerrados. Para continuar cobertura: revisar puntualmente contrato y handler de book-shop-payment-history, con datos de historial locales propios en el aislamiento existente. No ampliar a tarjetas/topups sin revisar su flujo. Prioridad de producto aún abierta: ruta book-shop-order-items ausente y tres defectos de pedidos documentados; corregir código GAD requiere ampliación expresa del alcance actual de solo lectura. Conservar arquitectura, roles semilla y API workers 1.

---
## Última continuación — estados de pedidos y ruta de ítems (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: incremento puntual de siete pruebas. Estados: listado público 200 con siete estados/transiciones, consulta de cada ID 200 y ID inexistente 404. Esquemas, datos, cliente y fixture añadidos. El 404 por ID no acredita el 404 del listado; este último sigue pendiente con el dataset existente. OpenAPI requiere status sin definirlo y GAD no lo devuelve.
- book-shop-order-items NO está implementado en GAD: sin handler ni colección. POST y DELETE devuelven 404 tanto anónimo como comprador válido con cuenta/libro/inventario/pedido activo. Cuatro pruebas de caracterización comprueban esos 404 y conservación del pedido; no acreditan altas/bajas funcionales. Los 201/409 de POST y 200 de DELETE documentados quedan pendientes. No confundir con /book-shop-orders/items, ya cubierto anteriormente.
- Validación: 231/231 API aprobadas (siete nuevas y 224 anteriores), 2/2 UI aprobadas en copia aislada, ci:check y git diff --check correctos. Base aislada para regresión; datos habituales de pedidos/inventario/cuentas/historial conservan la huella anterior. Cero carpetas de sandbox al terminar API. PowerShell etiquetó el aviso de módulos nativos de Node como NativeCommandError al redirigir stderr; el reporte de Playwright confirma passed, failed=[] y flaky=[], y el recorder terminó con 1227 solicitudes.
- Cobertura: 211/653 = 32.31% (antes 205/653 = 31.39%). Endpoints 31/136, operaciones 49/170, estados 137/387, parámetros 25/96. Solicitudes 1227, reconocidas 1019, sin match 208. Brechas 547, críticas 226. Reportes raíz regenerados, estimaciones IA intactas. La coincidencia numérica de 404 de una ruta inexistente no demuestra validación de permisos o búsqueda de ítems.
- Detalle: docs/BOOK-SHOP-ORDER-CATALOGS-COVERAGE.md. GAD sin cambios de código, arquitectura conservada y tres defectos anteriores de pedidos aún abiertos. Cambios acumulados SIN commit sobre 8ac975d; no commitear sin solicitud nueva.

### Próximo punto de continuación

No repetir los casos cerrados. Prioridad de producto: resolver la ruta ausente y los tres defectos de pedidos documentados; requiere ampliar expresamente el alcance de código GAD en solo lectura. Si se continúa exclusivamente con cobertura, siguiente recurso recomendado: book-shop-roles (catálogo/permisos), consultando únicamente contrato y handler correspondiente. Conservar aislamiento, API workers 1 y datos/roles semilla.

---
## Última continuación — pedidos y gestión (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 41 pruebas nuevas de book-shop-orders y book-shop-manage/orders: listados, alta, ítems, cancelación/envío, fondos/stock, cupones, permisos y transiciones de personal rol 16. Cliente, datos, esquemas y fixture orderSandbox; DELETE con body añadido al cliente base sin alterar delete existente. Detalle en docs/BOOK-SHOP-ORDERS-COVERAGE.md.
- Aislamiento: usuarios/cuentas/libros/ítems propios en copia desechable existente. Fondos e historial son datos locales, sin cobros externos. GAD y analyzer sin cambios. Cupones base válidos hasta 2026-12-31: revisar después de esa fecha.
- TRES DEFECTOS CONFIRMADOS de GAD: GET por ID expone pedidos de otros compradores; PATCH de envío con ID inexistente responde 404 pero descuenta 3000 y deja el pedido real nuevo; entrega gestionada asigna libro al empleado en vez del comprador. Reproducción aislada y detalles en el documento; no se consolidaron como expectativas válidas ni se afirma validar el ciclo completo de entrega/devolución.
- Primera regresión interrumpida por EPERM de Windows al renombrar la base habitual; grabación descartada. Regresión final en copia fresca como BASE_URL, START_APP=false y API workers 1: 224/224 API y 2/2 UI correctas; ci:check y git diff --check correctos.
- Cobertura actual: 205/653 = 31.39% (antes 165/653 = 25.27%). Endpoints 29/136, operaciones 46/170, estados 134/387, parámetros 25/96. Solicitudes 1188, reconocidas 992, sin match 196; brechas 555, críticas 231. Reportes raíz regenerados, IA histórica intacta.
- Pedidos/inventario/cuentas/historial de la base habitual conservan SHA-256 63f19fdee819c7f4afb75e245cbde350a59b816fbb75158512f495dcaeeae2d4. Cambios de inventario, reseñas y pedidos SIN commit sobre 8ac975d; no commitear sin solicitud nueva.

### Próximo punto de continuación

No repetir cobertura completada. Prioridad de producto: corregir los tres defectos documentados de pedidos; requiere ampliar expresamente el alcance actual de GAD con código en solo lectura. Para continuar únicamente con cobertura, siguiente incremento recomendado: catálogos book-shop-order-statuses y consulta book-shop-order-items, verificando de forma puntual contrato/handlers y permisos. Mantener arquitectura, aislamiento y decisiones existentes. Los defectos siguen abiertos aunque el medidor marque operaciones cubiertas.

---
## Última continuación — reseñas de libros (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- COMPLETADO: 11 tests nuevos de GET /book-shop-book-reviews: reseñas anónimas filtradas, cantidad y media redondeada por libro, consultas múltiples, orden/repeticiones, listas vacías y estadísticas cero. Casos reales 404 sin filtros o con book_ids sin mean. Cliente, datos, fixture y esquemas específicos añadidos. El handler solo admite lectura; no se inventaron CRUD ni permisos de escritura.
- Los tres parámetros documentados book_id/mean/book_ids y el 200 están ejercitados; el endpoint figura full bajo el modelo de medición existente. No equivale a validar cuerpos contra OpenAPI.
- Discrepancias: BookReviews.items se referencia a sí mismo; estadísticas individuales son objeto, múltiples array; book_id de estadísticas es string. Probes puntuales: mean=false aún calcula estadísticas; mean como primer parámetro provoca 404; book_ids vacío devuelve un ID vacío. Sin filtros/book_ids sin mean -> 404 no documentado. Detalle en docs/BOOK-REVIEWS-COVERAGE.md. No se consolidaron bugs como éxito del contrato.
- Sin escrituras: 21 reseñas intactas, verificadas contra db-base. GAD y analyzer sin modificaciones.
- Validación final: 183/183 API (11 nuevos + 172 previos), 2/2 UI, ci:check y git diff --check OK. coverage:record 848 solicitudes, 688 reconocidas y 160 sin match; coverage:baseline OK.
- Cobertura actual: 165/653 = 25.27% (antes 160/653 = 24.50%). Endpoints 23/136, operaciones 38/170, status 104/387, parámetros 23/96. Brechas 601 (antes 607), críticas 245 (antes 247). Reportes raíz regenerados; IA histórica intacta. Cambios de inventario y reseñas SIN commit, sobre 8ac975d.

### Próximo punto de continuación

Reseñas reproducibles completadas; no repetir. Siguiente recurso recomendado: book-shop-orders y su gestión, verificando contrato, flujos de estado y datos necesarios antes de implementar. Usar la instancia aislada existente para pedidos que modifiquen inventario/fondos; no afectar cuentas base ni tratar cobros externos como simples datos de prueba. Mantener GAD sin cambios de código, API workers 1 y las discrepancias documentadas. No commitear sin solicitud nueva.

---
## Última continuación — inventario book-shop-items (2026-11-06)

Esta sección prevalece sobre todos los puntos de continuación inferiores.

- Punto de partida: commit 8ac975d, árbol limpio, 127 tests API y 20.52% de cobertura. Se continuó únicamente con inventario.
- COMPLETADO: 45 tests nuevos de consulta pública/gestión, alta, duplicados, actualización persistente, permisos de anónimo/lector/gestor, baja lógica y validaciones de precio/cantidad (ausentes, negativos, decimales, no numéricos, longitud y límites válidos). Clientes y datos específicos, esquema y fixture inventorySandbox añadidos. Reutiliza la instancia aislada existente; no se cambió código de GAD, el analizador ni las decisiones arquitectónicas.
- Limpieza: ítems propios y libros UUID en base desechable. Ítem dado de baja -> búsqueda efectiva 404 y ausente en ambos listados; libro -> _inactive true. El positivo de DELETE exige 200; finally admite 200/404 si ya se borró en el caso. Copia descartada al finalizar. Cero directorios de sandbox; hash de inventario base idéntico al inicial (ver docs/BOOK-SHOP-ITEMS-COVERAGE.md).
- El turno se interrumpió durante la validación. Se retomó puntualmente: primer intento esperaba 200 al consultar el ítem eliminado; el siguiente pasó 44/45 y falló por el segundo DELETE en finally. Ambas expectativas de limpieza se corrigieron; validación final completa sin fallos.
- Discrepancia verificada: /book-shop-manage/items/by-book/{bookId} devuelve listado completo con 200 incluso para libro inexistente; el handler realmente filtra con /book-shop-manage/items?book_id=... (objeto/404). La ruta documentada tiene tests de permisos 401; 200/404 esperados siguen pendientes. POST tiene 404 adicional no documentado. Precio number documentado se restringe a enteros en GAD. Detalle en docs/BOOK-SHOP-ITEMS-COVERAGE.md.
- Validación final: 172/172 API, 2/2 UI, ci:check y git diff --check OK. coverage:record 837 solicitudes, 677 reconocidas y 160 sin match; coverage:baseline OK.
- Cobertura actual: 160/653 = 24.50% (antes 134/653 = 20.52%). Endpoints 22/136, operaciones 37/170, status 103/387, parámetros 20/96. Brechas 607 (antes 637), críticas 247 (antes 257). Reportes raíz regenerados; IA histórica intacta. Cambios de esta continuación SIN commit; la autorización anterior correspondía a la entrega 8ac975d.

### Próximo punto de continuación

Inventario reproducible implementado; no repetir. La consulta documentada por libro requiere aclarar GAD/OpenAPI. Recurso siguiente recomendado: book-shop-book-reviews, verificando contrato y limpieza antes de añadir casos, o pedidos si el usuario elige esa prioridad. Mantener GAD sin cambios de código, base/roles intactos, API workers 1 y aislamiento para escrituras. No commitear sin solicitud nueva.

---
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
