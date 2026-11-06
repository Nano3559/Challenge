# Historial, estadísticas y gestión de personas

Verificación local: 2026-11-06. Continuación limitada a `book-shop-payment-history`, `book-shop-stats` y consultas de `book-shop-manage/users` y `/team`. Se mantienen GAD y el analizador sin cambios de código.

## Historial local de pagos: 5 pruebas

- Sin token o con token inválido: 401.
- Usuario autenticado sin cuenta de tienda: 404.
- Comprador nuevo con cuenta: 200 y lista vacía.
- Compra propia: registro persistido con cuenta, pedido, importe, moneda, estado y método; saldos anterior/posterior contrastados con la cuenta. Se espera la escritura asíncrona mediante polling condicionado.
- En el caso anterior se comprueba también aislamiento: otro comprador no ve el pago aunque envíe `account_id` de la víctima; el comprador original sigue viendo únicamente su historial aunque envíe otro ID.

La ruta no aparece en el OpenAPI actual y sus solicitudes no se atribuyen artificialmente a otra operación. El parámetro `account_id` no selecciona otra cuenta: el handler obtiene la cuenta del token. La prueba comprueba el aislamiento real, no un filtro documentado.

Solo se usan fondos e historial locales de una copia desechable; no se usan tarjetas ni se realizan cobros externos. La cobertura no acredita la corrección de devoluciones completas: la gestión de pedidos utiliza la cuenta del empleado para efectos que corresponden al comprador, defecto ya documentado en BOOK-SHOP-ORDERS-COVERAGE.md.

Una comprobación puntual de `/book-shop-payment-history/mock` devolvió 401 anónimo y 200 con el historial normal vacío para admin. El primer `if` del handler captura también `/mock`, por lo que su rama de datos de ejemplo es inalcanzable. No se añade un falso test positivo de datos mock.

## Estadísticas: 27 pruebas

Se ejercitan `orders`, `users`, `items` y `all`. Para cada categoría: administrador 200 con esquema Zod; anónimo, token inválido, lector y coordinador 401; usuario sin cuenta 404. Solo admin tiene la acción `view-stats` en el dataset actual.

Además:

- `all` concuerda con cada proyección individual.
- Total de pedidos, libros, costo y libros vendidos se contrasta con el listado administrativo de pedidos; se comprueba coherencia de histogramas de estados, precios y cantidades.
- Un comprador, libro, inventario y pedido propios incrementan los totales esperados. Se contrastan claves propias de libro/usuario, estado nuevo, costos de envío/libros, precio y cantidad del inventario con valores conocidos.
- Una categoría inexistente devuelve 404.

OpenAPI documenta `orders`, `users` y `all`, pero no `items`. Los campos reales adicionales `totalBooksSold`, `totalItems`, `totalItemsPerPrice` y `totalItemsPerQuantity` se validan explícitamente cuando corresponden. No hay parámetros de filtro documentados para estas estadísticas; no se inventaron filtros.

Las cifras incluyen pedidos nuevos/cancelados y sus costos; `totalCost` no debe interpretarse como ingresos cobrados. Los tests comprueban agregación y consistencia de la respuesta, sin afirmar validez contable de esas cifras.

## Gestión de usuarios y equipo: 10 pruebas

Usuarios:

- Admin y coordinador consultan un usuario propio y múltiples IDs repetidos/mixtos con uno inexistente.
- Anónimo, token inválido y lector: 401. Sin cuenta: 404.
- Sin query `id`: 404. Un ID inexistente con query presente: 200 y mapa vacío.
- La respuesta real es un mapa `{ id: { name } }`, no una lista `Users` como declara OpenAPI. Se comprueba que no se exponen email, password ni otros campos en el mapa de nombres.
- IDs repetidos de query se ejercitan explícitamente; OpenAPI declara un único entero `id` obligatorio.

Equipo:

- Admin y coordinador obtienen 200, con los dos miembros semilla esperados, nombres, roles, avatar y fechas; lectores excluidos del equipo.
- El cuerpo real usa `id` de cuenta, `user_name`, `avatar`, `role_name`, `created_at`. El contrato declara `user_id`, `role_id`, `joined_at`; queda documentada la discrepancia sin transformar silenciosamente el cuerpo.

### Defecto confirmado: equipo accesible sin sesión

OpenAPI exige bearerAuth y documenta 401. En una copia aislada, tanto GET `/book-shop-manage/team` anónimo como con `Bearer qa-invalid-token` devolvieron 200 con dos miembros y datos de personal. El handler responde antes de validar token/cuenta/rol.

La reproducción se ejecutó fuera del recorder. No se consolidó la exposición anónima como requisito positivo. El 401 documentado del equipo permanece pendiente y requiere corregir GAD; el código de GAD sigue en solo lectura.

## Aislamiento y continuidad

Las pruebas reutilizan la base desechable existente con API workers=1. Se crean usuarios/cuentas/libros/inventario/pedidos propios y se descartan juntos; no se dejan cuentas huérfanas ni se cambian roles semilla. El helper de pruebas contiene las aserciones de preparación; el cliente de API solo realiza solicitudes.

SHA-256 inicial de pedidos, inventario, cuentas, historial y roles de la base habitual:

`b779f3b60071f5dfe3235aabb664748e222729838f68e596427c2c7b5ee4b3cc`

Siguen abiertos los defectos previos de pedidos y la ruta `book-shop-order-items` ausente. No se ha realizado un commit nuevo.

## Validación final

- 42/42 pruebas nuevas en ejecución puntual; regresión final 289/289 API y 2/2 UI aprobadas.
- Lint y typecheck sin advertencias; git diff --check correcto.
- Grabación: 1590 solicitudes, 1350 reconocidas y 240 sin match.
- Cobertura: 232/653 = 35.53%, antes 213/653 = 32.62%.
- Endpoints 37/136, operaciones 55/170, estados 151/387, parámetros 26/96.
- Brechas 520, críticas 214; antes 544 y 224 respectivamente.
- Reportes raíz regenerados; estimaciones históricas de IA intactas. Datos originales con la misma huella inicial; copias descartadas.

Los tres endpoints de estadísticas documentados y la consulta de usuarios figuran completos según métodos/estados/parámetros medidos. Esto no elimina las discrepancias de cuerpos ni los defectos de negocio. Equipo queda parcial por el 401 no implementado. Historial e items de estadísticas no están documentados y no suman unidades OpenAPI.
