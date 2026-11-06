# Estados de pedidos y ruta de ítems

Verificación: 2026-11-06. Continuación puntual de la cobertura de pedidos; sin cambios de código en GAD ni en el analizador.

## Estados de pedidos

Tres pruebas nuevas de lectura pública:

- GET /book-shop-order-statuses devuelve 200 y los siete estados conocidos, con nombre, icono y transiciones del dataset base comprobados mediante esquema Zod y valores esperados.
- Consulta individual de cada uno de los siete estados: 200 y coincidencia con el catálogo.
- ID inexistente: 404 y objeto vacío.

El GET por ID existe en el router genérico, pero no figura en OpenAPI. Su 404 no acredita el 404 documentado para el listado. El listado no produce 404 con el dataset existente: queda pendiente sin alterar datos semilla para forzarlo.

OpenAPI incluye `status` entre los campos requeridos de BookShopOrderStatus, aunque no define esa propiedad ni la devuelve GAD. El esquema de pruebas valida los campos reales y esta discrepancia permanece explícita.

## Ruta de ítems declarada pero ausente

OpenAPI declara POST y DELETE /book-shop-order-items con body `{ book_id }`. No existe handler asociado en validations.route.js ni colección book-shop-order-items en db-base.json. Las operaciones funcionales de ítems se implementan en /book-shop-orders/items y ya tienen cobertura en la entrega anterior; no se duplicaron ni se cambiaron sus URLs para inflar el resultado.

Cuatro pruebas nuevas de caracterización:

| Operación | Anónimo | Comprador con cuenta, libro en inventario y pedido activo |
|---|---|---|
| POST /book-shop-order-items | 404, `{}` | 404, `{}`; pedido sin cambios |
| DELETE /book-shop-order-items | 404, `{}` | 404, `{}`; pedido sin cambios |

Los casos autenticados crean sus propios usuarios, cuentas, libros, inventario y pedidos en la base desechable existente. Su descarte conjunto evita residuos y cuentas huérfanas. Una comprobación puntual adicional de GET, autenticado y anónimo, también devolvió 404; GET no se presenta como una operación documentada.

Estas pruebas verifican la indisponibilidad actual de la ruta. El 404 registrado coincide numéricamente con OpenAPI, pero no demuestra que el servidor busque un ítem o valide permisos. No se afirma cubrir el alta 201, duplicado 409 ni eliminación 200: requieren implementar o corregir la ruta de GAD/OpenAPI. No se agregaron falsos casos de éxito.

## Continuidad

Validación final: 231/231 API y 2/2 UI aprobadas; lint y typecheck correctos. Grabación final de 1227 solicitudes (1019 reconocidas, 208 sin match). Cobertura 211/653 = 32.31%, antes 205/653 = 31.39%. Endpoints 31/136, operaciones 49/170, estados 137/387, parámetros 25/96. Brechas 547, críticas 226. Reportes raíz regenerados, IA histórica intacta. PowerShell clasificó el aviso de módulos nativos de Node como NativeCommandError al redirigir stderr; Playwright confirmó passed sin fallos ni flaky y la grabación terminó completa.

La base habitual de pedidos, inventario, cuentas e historial de pagos conserva su huella SHA-256 anterior: `63f19fdee819c7f4afb75e245cbde350a59b816fbb75158512f495dcaeeae2d4`. La regresión se ejecutó sobre una copia fresca y los sandboxes se descartaron al terminar.

Los tres defectos de pedidos documentados en BOOK-SHOP-ORDERS-COVERAGE.md siguen abiertos. Se conserva la restricción de código GAD en solo lectura y la arquitectura existente. No hay commit nuevo.
