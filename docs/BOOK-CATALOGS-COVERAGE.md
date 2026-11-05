# Cobertura de autores y géneros

Verificación local: 2026-11-05. Se añadieron seis tests, dos clientes de lectura, fixtures y esquemas específicos. No se escriben ni eliminan autores o géneros del dataset.

| Operación real | Casos comprobados |
|---|---|
| GET /api/book-authors | 200 sin autorización, contrato de lista y presencia del ID conocido |
| GET /api/book-authors/{id} | 200, identidad, contrato y coincidencia exacta con el catálogo; 404 y cuerpo vacío JSON para ID inexistente |
| GET /api/book-genres | 200 sin autorización, contrato de lista y presencia del ID conocido |
| GET /api/book-genres/{id} | 200, identidad, contrato y coincidencia exacta con el catálogo; 404 y cuerpo vacío JSON para ID inexistente |

Los esquemas admiten IDs de tipo number, incluyendo 0, conforme al contrato y al dataset. Los IDs de prueba viven en `src/sut/data/book-catalogs.ts`; los specs acceden a la API mediante clientes y fixtures.

## Diferencias con el OpenAPI

- Solo se documentan los listados, cada uno con 200 y 404. Los catálogos existentes devuelven 200; no se alteró el dataset para forzar un 404 del listado. Ese estado sigue pendiente de reproducción en ambas operaciones.
- Las consultas por ID funcionan realmente, pero no están documentadas. Su 404 no cubre el 404 de una ruta de listado distinta. Las cuatro solicitudes por ID se registran sin match y no inflan la cobertura.
- GET /book-genres referencia `BookShopGenre` (un objeto), aunque GAD devuelve un array. La definición `BookShopGenres` sí existe en la spec; el test valida explícitamente una lista de `BookShopGenre` sin cambiar el OpenAPI.
- Los handlers permiten GET y rechazan escrituras. No se inventaron flujos de creación, actualización o borrado para estos catálogos.

## Validación final

- 6/6 tests nuevos y **102/102 API** en la regresión completa.
- **2/2 UI**, lint y typecheck correctos.
- **397 solicitudes** grabadas: 333 reconocidas y 64 sin match (60 previas de books y 4 consultas nuevas por ID).
- Cobertura global: **109/653 = 16.69%**, antes 105/653 = 16.08%.
- Endpoints 15/136; operaciones 26/170; estados 68/387; parámetros 15/96.
- Brechas **665** (antes 671), críticas **265** (antes 269).

La primera regresión se descartó: el servidor GAD terminó con EPERM al guardar su base y las solicitudes posteriores fallaron por conexión rechazada. Se reinició GAD fuera del entorno restringido con autorización y se repitió la grabación completa. Se limpió puntualmente el artículo temporal que dejó la interrupción, verificando DELETE 200 y GET 404. No se cambió código de GAD.

Las estimaciones IA del baseline siguen siendo históricas del Día 1. Los dos listados permanecen parciales según el modelo mientras no se observe su 404 documentado.
