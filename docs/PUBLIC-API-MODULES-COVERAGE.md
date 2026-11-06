# Cierre por módulos: hangman, quiz, salud, datos y comunidad

## Combinaciones de estado adicionales

- Hangman y minesweeper: score de 0 después de un high score de 1,000,000,000 devuelve 200 y preserva el puntaje mayor.
- Quiz: start/stop con 0 respuestas después de una partida con score 1 devuelve 200 y conserva el high score.
- `/book-shop-manage/team` anónimo devolvió 200, aunque OpenAPI especifica 401; no se registra como respuesta correcta.

Recorder actualizado reejecutando los tres módulos: 2644 solicitudes, 2323 match, 321 sin match; 566/653 = 86.68%, endpoints136/136, operaciones170/170, status335/387, parámetros61/96. Quedan 52 estados y 35 parámetros; gaps87, 0 críticos. `ci:check` limpio.

## Últimas cuatro rutas — 2 pruebas

Se registraron articles/comments/users search, cada una observada 404, más POST book-shop-accounts/files con token y multipart vacío, observado 404 sin subir ni escribir archivos. El test preserva explícitamente estos fallos observados; no los convierte en éxitos de contrato.

Recorder: 2/2 pruebas, cinco requests añadidas. Total 2588 solicitudes (2267 match, 321 no match, 10 archivos); 563/653 (86.22%), endpoints 136/136, operaciones 170/170, estados 332/387, params61/96; quedan 55 estados y 35 parámetros, 90 brechas, cero críticas. Total 415 tests definidos; sin regresión completa.

## Diagnósticos y restauraciones — 7 pruebas

Todas operan con instancia independiente, una por test, para aislar los toggles, las restauraciones y la terminación por debug. Cubren toggles diagnostics/logs/metrics, GET logs validando forma sin mostrar contenido, histograma, log level, listado de restores y restores DB/BigDB/EmptyDB. Debug exit y restart comprobados en hijos desechables.

Recorder 7/7 añadió 17 solicitudes; total 2581 (2260 match, 321 sin match, ocho archivos). Coverage 556/653 (85.15%): endpoints132/136, operaciones166/170, status332/387, parámetros58/96; cuatro rutas sin cobertura, 101 brechas y 8 críticas. Total definido 413; sin regresión completa.

Diferencias: restore/list 201 frente a 200 declarado; campo de toggle-metrics cambia; log-level sin nivel da 400 no documentado; debug/restart termina el proceso. Restantes: searches de articles/comments/users y book-shop-accounts/files.

## Archivos y captcha — 3 pruebas y baseline acumulado

Se probaron las cuatro rutas OpenAPI de archivos (404 incluso con feature habilitado) y el prefijo realmente servido `/files/articles/uploaded`: privado sin token 401, privado propio 200, mismatch de usuario 401; rutas públicas 200. Sin uploads ni escrituras al directorio de GAD. `/book-shop-accounts/files` ya tenía un 404 multipart documentado, sin repetir.

Captcha cubre reto, respuesta correcta 200, respuesta incorrecta 400, campos faltantes 422, UUID inexistente 404 y consumo del desafío. Feature flag y exposición de solución solo en instancia desechable.

Recorder: 3/3, 19 solicitudes añadidas. Acumulado 2564 (2243 match, 321 sin match, siete archivos); cobertura 533/653 (81.62%): endpoints 120/136, operaciones 154/170, status 321/387, parámetros 58/96; 16 rutas sin cubrir, 136 brechas, 32 críticas. Total definido 406 tests, sin regresión completa. Próximo: diagnósticos/restauraciones.

## Tic-tac-toe — 2 pruebas y baseline acumulado

Se cubren las seis operaciones documentadas con dos pruebas: highscores público, autenticación, start/join, estado, turnos, victoria, stop y errores. Juego en servidor/DB desechables. Recorder 2/2 añadió 28 solicitudes; total 2545, 2229 match, 316 sin match, seis archivos. Coverage 516/653 (79.02%); endpoints 115/136, operaciones 148/170, status 312/387, parámetros 56/96. Quedan 21 rutas, 158 brechas (43 críticas). Total 403 tests API definidos; no regresión completa.

Diferencias: GET status requiere bearer aunque OpenAPI omite seguridad; tablero serializa IDs numéricos aunque esquema declara strings; join de código desconocido da 422. OpenAPI declara 409 por sesión llena pero el camino secuencial comprobado devuelve 422. Siguiente módulo: archivos/captcha.

## Minesweeper — 2 pruebas y baseline acumulado

`minesweeper.api.spec.ts` verifica highscores público, autorización para POST score, rechazos 422 por dato ausente/no numérico, registro 201 y presencia en highscores. Fixture sobre copia DB aislada. Recorder: 2/2 y 8 solicitudes; baseline total 2517 (2201 match, 316 sin match, 5 archivos). Coverage 493/653 (75.50%): endpoints 109/136, operaciones 142/170, status 296/387, parámetros 55/96; 27 rutas sin cubrir, 187 brechas, 55 críticas. Total definido: 401 tests API; sin regresión completa.

OpenAPI no declara el cuerpo que requiere el handler y su esquema de highscores no refleja `{highScore:[...]}`. Siguiente módulo: tic-tac-toe.

## Registro agregado de juegos

Quiz y hangman ejecutados conjuntamente bajo recorder: 5/5 aprobados, 34 solicitudes nuevas; `coverage:baseline` regenerado. Acumulado: 2509 solicitudes, 2193 matcheadas, 316 sin match. Coverage 488/653 (74.73%); endpoints 107/136, operaciones 140/170, estados 293/387 y parámetros 55/96. Brechas 194, críticas 59, rutas sin cobertura 29. No se ejecutó toda la regresión de 399 tests.

## Hangman — 2 pruebas

`hangman.api.spec.ts` usa cliente y fixture de instancia GAD desechable. Cubre `/hangman/random` y `/hangman/highscores` públicos, forma y minúsculas de la palabra, 401 para escritura sin token, 422 por score faltante/no numérico, 201 al registrar puntaje y persistencia reflejada en highscores. Se cubren las tres rutas documentadas del submódulo.

Diferencias: highscores real entrega `{highScore: [...]}` frente a la referencia OpenAPI `Scores`; OpenAPI no define body para POST score, pero el handler espera `{score:number}`. Validación y registro conjunto 2/2.

## Quiz — 3 pruebas

`quiz.api.spec.ts` usa `QuizClient` y una fixture de instancia GAD independiente respaldada por una copia desechable de la base. Se comprueban 401 en preguntas/start/stop/check sin token; count y highscores públicos; lista autenticada de diez preguntas sin respuestas correctas; acierto y error; límite de diez intentos y conflicto 409 en el undécimo; stop y score en highscores. Así se cubren las seis operaciones del subrecurso quiz.

Diferencias: count da 96, la lista de preguntas devuelve un máximo de diez. Highscores usa `{highScore: [...]}`, en contra del modelo OpenAPI de ese objeto. Stop puede responder 200 o 201 según inserte un nuevo score o conserve el previo. Validación 3/3 y registro conjunto con hangman.

Fecha: 2026-11-06. El usuario confirmó toda la API pendiente, y después solicitó cerrar lo implementado y continuar por módulos por límite de memoria. Este documento cierra únicamente los tres bloques descritos. No se afirma que toda la API esté terminada.

## Salud y catálogos: 13 pruebas

`operations.api.spec.ts` cubre about/ping, health y sus variantes configcheck/dbcheck/db/memory/uptime, schema/openapi.json, imágenes de usuario/artículos, idiomas/traducciones, juegos y scores.

Se comprueban esquemas Zod de salud, coherencia de memoria/tiempo activo, contrato publicado idéntico en sus dos rutas, catálogo de idiomas contra las traducciones individuales y puntuaciones contra filtro por game_id. No se cambian datos ni configuración.

Discrepancias: Games y Scores declaran objetos en OpenAPI pero devuelven arrays. `/scores/{id}` inexistente devuelve 200 con lista vacía: el 404 documentado no se acredita. Idioma inexistente devuelve 200 con objeto vacío. Un status de salud Degraded es compatible con HTTP 200: el test valida el diagnóstico real sin imponer OK a una base que pudiera presentar inconsistencias.

## Estadísticas, visitas, datos y calculadoras: 23 pruebas

`public-statistics.api.spec.ts` cubre:

- stats/users y stats/articles con chartType table/pie/chart.
- Publicaciones de artículos/comentarios: igualdad de totales por año, mes y día.
- Actividad de usuario: proyección individual coincide con mapa y totales diarios/mensuales; inexistente devuelve 200 vacío.
- Cuatro mapas de contadores API/no API, con y sin detalles.
- Visitas de artículos/comentarios/usuarios y sus rankings: los contadores seleccionados pertenecen al mapa original y son los mayores. No se exige orden de propiedades JSON con claves enteras.
- Filtro `ids` de visitas de artículos con dos IDs conocidos y uno inexistente.
- Weather/costs con days=1/3/91: tamaño solicitado limitado a 90, esquemas de entradas y suma de transacciones contra balance diario.
- Artículo aleatorio: esquema y consulta persistida coinciden. Usa una copia fresca por caso para no depender de artículos dados de baja por otras pruebas.
- ROI avanzado con escenario verificable: diez casos, dos ejecuciones, costo manual 200, automatización 120, diferencia 80.
- ROI simple: relación entre beneficios, costos firmados y resultado; coherencia de último acumulado y beneficio por iteración. No acredita corrección financiera completa.

Limitaciones de la lectura puntual del handler: filtros `ids` de visitas de usuarios/comentarios usan el mapa de artículos; no se agregaron expectativas positivas sobre ese resultado incorrecto y esos parámetros siguen pendientes de validación correcta. ROI simple itera con `<= numberOfSprints`, incluyendo una iteración adicional, y representa costos acumulados negativos; no se consolidó el número de iteraciones como requisito válido. Las estadísticas cuentan datos sin excluir necesariamente registros inactivos; no deben interpretarse como conteos de recursos activos. El artículo aleatorio puede seleccionar inactivos porque usa la colección sin filtrar; el positivo se ejecuta con datos controlados, no se añadió reintento para ocultarlo.

## Publicaciones breves, mensajería y encuestas: 6 pruebas

`community.api.spec.ts` cubre:

- Flashposts: alta 201, consulta pública/privada, actualización persistida, exclusión de privados del listado público y eliminación; permisos de propietario/otro/anónimo, inexistentes, campos desconocidos, longitud/color inválidos y rechazo 403 de cambios/baja de publicación antigua del usuario semilla, sin modificarla.
- Contactos: usuarios sintéticos propios, rechazo de autoagregado/duplicado 409, desconocido 404, alta inicial 201 y agregado posterior 200; listado devuelve los usuarios esperados.
- Mensajes: campos requeridos 422, destinatario ajeno a contactos 403, envío 201, unread=1, consulta filtrada por userId/idFrom, exclusión de mensaje previo por ID e aislamiento de otro usuario sintético. No se envían comunicaciones a personas reales.
- Encuestas 1/2: descripción pública, pregunta autenticada, pregunta inexistente 404 y estadísticas públicas/no existentes.
- Respuesta propia nueva 201, consulta individual/listado, aislamiento de otro usuario, reemplazo 200 y rechazos por cuerpo/tipo/fecha inválidos y JSON malformado 400.
- Una comprobación conjunta verifica 401 sin sesión en las operaciones privadas de los tres recursos.

Discrepancias: POST flashposts y mensajes devuelve 201, aunque OpenAPI declare 200. El primer PUT de contactos también devuelve 201 y el segundo 200. El listado público de flashposts devuelve 200 sin token, aunque OpenAPI documente bearerAuth/401. El handler de flashpost privado envía el objeto en la respuesta 401; la prueba de status no acredita que el cuerpo esté protegido. Encuestas devuelven `answers` como objeto, frente al array declarado en OpenAPI. Descripción de tipo desconocido puede envolver `{}` con 200 por el retorno del helper: su 404 documentado no está cubierto. No se afirma cubrir por completo validaciones de autoría en el body de encuestas.

Defecto reproducido durante el caso de mensajería: un usuario nuevo sin colección de contactos envía un mensaje y recibe 500, porque el handler accede a `senderContacts.user_ids` sin comprobar existencia. No se legitimó el 500 como éxito. El 403 se verifica después de crear la colección y antes de agregar al destinatario.

Se corrigió una colisión de nombre en el cliente nuevo (`send` frente al método privado de BaseApiClient), renombrándolo a `sendMessage`. No se modificó el cliente base para resolverla ni se cambió código de GAD.

## Validación y cierre

- 42/42 pruebas nuevas aprobadas conjuntamente: 13 + 23 + 6. Total de tests API definidos: 394 (352 anteriores + 42); **no se ejecutó una regresión completa de los 394 en este cierre**. Última regresión completa anterior: 352/352; esta comprobación ejecutó únicamente los tres módulos nuevos.
- Lint y typecheck sin advertencias; git diff --check correcto. UI no reejecutada; última validación anterior 2/2.
- Recorder con `--keep`: añade 149 solicitudes de los tres módulos a las 2326 anteriores. Total 2475, reconocidas 2159, sin match 316, tres archivos. Solo ejecuciones aprobadas forman el baseline.
- Cobertura agregada: 465/653 = 71.21%, antes 319/653 = 48.85%. Endpoints 98/136, operaciones 131/170, estados 279/387, parámetros 55/96.
- Brechas: 226, críticas 77. Quedan 38 rutas sin solicitudes reconocidas. Reportes raíz regenerados; IA histórica intacta.
- Copias desechables descartadas y cero carpetas de sandbox. No se cambió GAD ni se hicieron escrituras de negocio en la base habitual. Sin commit nuevo.

Siguiente módulo recomendado: juegos (hangman, minesweeper, quiz y tic-tac-toe), empezando por contrato y handler de quiz. Pendientes posteriores: archivos/captcha, diagnósticos y restauraciones en procesos independientes desechables. Mantener explícitas las rutas/brechas anteriores bloqueadas por discrepancias de GAD.
