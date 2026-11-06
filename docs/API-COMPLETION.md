# Continuación de toda la API pendiente

## Estados adicionales — quiz, hangman y minesweeper

Nuevas combinaciones reproducibles: hangman score inferior devuelve 200 (mantiene el high score); minesweeper igual; segunda parada de quiz sin contestar devuelve 200 con la mejor puntuación previamente almacenada. Pruebas en sandbox desechable. La consulta anónima `/book-shop-manage/team` devolvió 200 pese a 401 documentado; no se afirma el 401.

Se ejecutaron los tres módulos bajo recorder (`--keep`); baseline 2644 solicitudes (2323 match, 321 no match, 13 archivos); cobertura 566/653 = 86.68%, 335/387 estados y 61/96 parámetros. Quedan 52 respuestas y 35 parámetros (87 gaps, cero críticas). `ci:check` limpio; sin regresión completa.

## Operaciones sin solicitud pendientes — 2026-11-06

Se añadieron solicitudes para las cuatro rutas restantes: búsquedas articles/comments/users (todas 404) y multipart vacío autenticado en `/book-shop-accounts/files` (404; ningún archivo enviado). Las rutas se instrumentan por clientes existentes/nuevos. No se registra falsamente el 200 documentado.

2/2 pruebas puntuales y recorder; `ci:check` limpio; cinco solicitudes nuevas. Baseline: 2588 total, 2267 match, 321 sin match; 563/653 = 86.22%; 136/136 endpoints y 170/170 operaciones reciben al menos una solicitud. Quedan 55 respuestas y 35 parámetros documentados por cubrir (90 brechas, cero críticas). Total 415 tests definidos; no regresión completa. Las cuatro rutas tienen discrepancias funcionales y requieren cambio en GAD para responder como OpenAPI.

## Diagnósticos y restauraciones — 2026-11-06

Siete pruebas aprobadas en proceso desechable: toggles de diagnostics/logs/metrics, GET logs sin volcar su contenido, histogram, log-level, restore/list y restauraciones DB/BigDB/EmptyDB. `/debug/exit` y `/debug/restart` probados cada uno en hijo dedicado (200 y proceso terminado). `ci:check` limpio. Recorder añadió 17 solicitudes; total 2581 (2260 match, 321 sin match, ocho archivos). Coverage 556/653 = 85.15%, endpoints 132/136, operaciones 166/170, estados 332/387, parámetros 58/96; 4 rutas, 101 brechas (8 críticas). Total definido 413; no regresión completa.

Diferencias: restore/list 201 vs 200 documentado; toggle-metrics property distinta; log-level inválido 400 no documentado; debug/restart termina en vez de reiniciar. Rutas aún sin cubrir: articles/search, comments/search, users/search y book-shop-accounts/files. GAD intacto.

## Archivos y captcha — 2026-11-06

Tres pruebas aprobadas en `tests/api/files-captcha.api.spec.ts`. Se ejercitan las cuatro rutas de archivos documentadas (404 con feature habilitado), y las rutas reales `/files/articles/uploaded` autenticada, `/public` y `/public?userIds=`. Los privados requieren auth. No se crearon/subieron archivos; el endpoint account-files multipart ya tenía un 404 comprobado/documentado y no se repitió. Captcha cubre GET, respuesta correcta 200, incorrecta 400, incompleta 422, uuid inexistente/reutilizado 404.

Flags de files/captcha y exposición de solución se habilitaron únicamente en hijo desechable. `ci:check` limpio; ejecución recorder 3/3 añadió 19 solicitudes. Baseline: 2564 solicitudes, 2243 match, 321 sin match; 533/653 = 81.62%, endpoints 120/136, operaciones 154/170, estados 321/387, parámetros 58/96; quedan 16 rutas y 136 brechas (32 críticas). 406 tests definidos, sin regresión completa. Siguiente: diagnósticos/restauraciones en procesos aislados.

Las rutas documentadas de archivo no coinciden con el prefijo real `/files/articles`; se documentó la respuesta 404. La solución de captcha solo se expone en la copia aislada usada por las pruebas.

## Módulo tic-tac-toe y baseline — 2026-11-06

Dos pruebas pasan (`tests/api/tic-tac-toe.api.spec.ts`) y cubren las seis operaciones: highscores, crear/unir sesión, consultar estado, mover y detener. Flujo con dos jugadores: start, join, errores 403/422, turno indebido 422, victoria, estado final y stop; sesiones en sandbox aislado. `ci:check` limpio. Recorder `--keep` añade 28 solicitudes; baseline 2545 (2229 match, 316 no match): 516/653 = 79.02%, 115/136 endpoints, 148/170 operaciones, 312/387 estados, 56/96 parámetros; 21 rutas sin cobertura y 158 brechas (43 críticas). Total definido 403; sin regresión completa.

Discrepancias: GET status exige token pese a que OpenAPI no marca seguridad; celdas reales numéricas frente al esquema string; join con código desconocido responde 422; 409 de sesión llena no se reproduce en el flujo secuencial normal. Próximo: archivos/captcha.

## Módulo minesweeper — 2026-11-06

Dos pruebas aprobadas en `tests/api/minesweeper.api.spec.ts`: highscores público, score anónimo 401, cuerpo ausente/no numérico 422, guardado 201 y puntaje visible en highscores. Cliente/esquemas y fixture sobre instancia/base desechable. `ci:check` limpio. Recorder conjunto 2/2 añadió 8 solicitudes y `coverage:baseline` quedó actualizado: 2517 solicitudes, 2201 matcheadas, 316 sin match; coverage 493/653 = 75.50%, endpoints 109/136, operaciones 142/170, estados 296/387 y parámetros 55/96. Quedan 27 rutas, 187 brechas (55 críticas). Total 401 tests API definidos; no se ejecutó regresión completa. Siguiente: tic-tac-toe.

OpenAPI omite el requestBody de `/minesweeper/score` y referencia un esquema distinto para highscores `{highScore:[...]}`.

## Cobertura agregada actualizada — quiz y hangman (2026-11-06)

Se registraron conjuntamente los dos módulos (5/5 pruebas, 34 solicitudes nuevas con `--keep`) y se regeneró `coverage:baseline`. Resultado agregado: 2509 solicitudes, 2193 matcheadas y 316 sin match; 488/653 unidades = 74.73%, 107/136 endpoints, 140/170 operaciones, 293/387 estados y 55/96 parámetros. Quedan 29 rutas sin cobertura y 194 brechas (59 críticas). IA histórica intacta. No es una regresión completa de los 399 tests API.

## Módulo hangman — 2026-11-06

Dos pruebas nuevas aprobadas (`tests/api/hangman.api.spec.ts`): random/highscores públicos, formato de palabra, autorización del score, validación de score faltante/no numérico, alta 201 y verificación en highscores. Cliente/esquemas y fixture de instancia/base desechables. Total definido: 399 tests API. Validación puntual 2/2; `ci:check` correcto. Se registró junto con quiz en la cobertura agregada descrita arriba. No se ejecutó regresión completa. Siguiente: minesweeper.

El highscores real es `{ highScore: [...] }` pese a la referencia OpenAPI distinta. OpenAPI también omite el requestBody de score aunque el handler espera `score` numérico.

## Módulo quiz — 2026-11-06

Tres pruebas nuevas aprobadas (`tests/api/quiz.api.spec.ts`). Cliente, esquemas y fixture de proceso/base desechables añadidos. Se cubren autenticación, count/questions/highscores, ocultación de respuestas, acierto/error, límite de diez preguntas, conflicto en la undécima y persistencia aislada al detener. Total definido al terminar quiz: 397 tests API (394 anteriores + 3). Validación puntual 3/3; el registro agregado posterior está resumido arriba.

Discrepancias observadas: count informa 96 disponibles, mientras questions entrega diez; highscores real es `{ highScore: [...] }` frente al esquema OpenAPI inconsistente; stop depende de si el resultado supera al previo y puede emitir 200/201. Siguiente: hangman.

Alcance confirmado por el usuario: toda la API pendiente. GAD permanece en solo lectura de código; las discrepancias y estados no implementados se documentan, no se sustituyen por éxitos ficticios.

Punto de partida: 352 tests API, cobertura 319/653 = 48.85%, 87 rutas sin cobertura. Las referencias anteriores a una aclaración de alcance pendiente quedan superadas.

Bloques de trabajo: salud/catálogos; estadísticas/visitas/datos; calculadoras; juegos; flashposts; mensajería; encuestas; archivos/captcha; diagnósticos y restauraciones en procesos desechables independientes. Los recursos ya cubiertos solo se revisarán para brechas concretas reproducibles.

La finalización de pruebas reproducibles no equivale a 100% de contrato mientras GAD no implemente rutas o tenga defectos abiertos. Este documento se actualizará con resultados y pendientes concretos.

## Cierre solicitado por el usuario

2026-11-06: cerrar lo implementado y continuar por módulos en la siguiente sesión. Se completaron salud/catálogos, estadísticas/visitas/datos/calculadoras y flashposts/mensajería/encuestas: 42 nuevas pruebas aprobadas conjuntamente. Detalle en PUBLIC-API-MODULES-COVERAGE.md.

Cobertura actual agregada 465/653 = 71.21%; quedan 38 rutas sin cobertura, 226 brechas (77 críticas). Total definido 394 tests API; última regresión completa anterior 352/352, más 42/42 de los módulos nuevos. No presentar esto como una ejecución completa de los 394.

Próximo módulo: juegos, empezando por quiz. Después: archivos/captcha; diagnósticos/restauraciones en procesos desechables independientes. Los defectos abiertos de recursos anteriores siguen documentados. No iniciar esos módulos durante este cierre.
