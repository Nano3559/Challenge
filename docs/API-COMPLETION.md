# Continuación de toda la API pendiente

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
