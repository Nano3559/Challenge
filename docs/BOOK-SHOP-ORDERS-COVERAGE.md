# Cobertura de pedidos y gestión

Verificación local: 2026-11-06. Se añadieron 41 pruebas de pedidos, conservando la arquitectura core/SUT/tests y el código de GAD sin cambios.

## Casos implementados

| Operación | Casos cubiertos |
|---|---|
| GET /book-shop-orders | Listado propio, lista vacía, 401 sin token y 404 sin cuenta de tienda. |
| POST /book-shop-orders | Alta 201 con valores iniciales persistidos, 409 por pedido activo y 401. |
| POST /book-shop-orders/items | Primer libro crea pedido 201; segundo agrega y recalcula con 200; 409 por duplicado o stock cero; 404 sin inventario; 401. |
| DELETE /book-shop-orders/items | Retira libro y recalcula con 200; 404 por libro ajeno al pedido o ausencia de pedido activo, comprobando conservación de datos; 401. |
| PATCH /book-shop-orders/{id} | Cancelación 200 que permite un nuevo pedido; envío 200 con descuento de fondos y stock comprobados; 409 por transición inválida; 422 por pedido vacío o fondos insuficientes; 404 sin pedido activo; 401. |
| POST /book-shop-orders/coupon | Cupón fijo, porcentual y descuento limitado a total cero; persistencia; 409 por repetición; 404 por cupón inexistente o ausencia de pedido activo; 401. |
| GET /book-shop-manage/orders | Personal autorizado 200 con pedido de otro comprador; lector 401; sin cuenta 404; anónimo 401. |
| PATCH /book-shop-manage/orders/{id} | Enviado a pendiente 200 sin doble cobro; transición inválida 409; fondos insuficientes 422; ID inexistente 404; lector y anónimo 401. |

Las respuestas se validan con esquemas Zod y comprobaciones de estado persistido. Los efectos asíncronos de fondos y stock se esperan con polling condicionado. El personal usa el rol 16: el rol 1 omite restricciones de transición y no sirve para comprobarlas.

## Aislamiento y reproducibilidad

`orderSandbox` reutiliza la base desechable del worker existente. Cada comprador tiene usuario y cuenta propios; los libros e ítems se crean para el caso. Cuenta, propietario y pedidos se descartan juntos al finalizar. Los fondos y pagos son datos locales de GAD; no hay llamadas a cobros externos.

Los cupones proceden del dataset base y vencen el 2026-12-31. Será necesario revisar su vigencia después de esa fecha. No se validaron ramas de cupón vencido o límite de usos ni se afirma cubrir correctamente el ciclo completo de devolución y entrega.

La primera regresión contra la base habitual se interrumpió por `EPERM` al renombrar `db/.~db.json`; se descartó esa grabación. La regresión final completa utilizó otra copia desechable como `BASE_URL`, con `START_APP=false`, además del sandbox interno de las pruebas. Se mantuvo API workers=1.

Huella SHA-256 de pedidos, inventario, cuentas e historial de pagos de la base habitual, igual antes y después:

`63f19fdee819c7f4afb75e245cbde350a59b816fbb75158512f495dcaeeae2d4`

## Diferencias de contrato

- GET /book-shop-orders/{id} existe pero no está documentado; sus comprobaciones de persistencia no cuentan como cobertura de una operación OpenAPI.
- Agregar un segundo libro devuelve 200; el alta automática del primer libro devuelve 201.
- DELETE de ítems necesita body JSON con `book_id`, aunque OpenAPI no declare ese cuerpo.
- El handler de cupón selecciona el pedido activo del usuario e ignora `order_id`.
- Cubrir métodos, estados y parámetros en el medidor no equivale a conformidad completa del cuerpo OpenAPI ni a ausencia de defectos de negocio.

## Defectos confirmados y pendientes de GAD

Se reprodujeron con datos propios en una copia desechable, fuera de la grabación de cobertura. No se añadieron expectativas positivas que conviertan estos comportamientos en requisitos válidos.

1. **Lectura de pedidos de otro comprador.** Crear dos compradores con cuenta y un pedido del primero. Consultar GET /book-shop-orders/{id} con el token del segundo devuelve 200 y expone el pedido ajeno. El listado propio sí filtra por usuario.
2. **Cobro pese a responder 404 por ID inexistente.** Crear un pedido activo con libro de precio 2500 y envío 500. PATCH /book-shop-orders/999999 con `status_id: 5` responde 404, pero descuenta 3000 de la cuenta del comprador; el pedido real permanece en estado 1. La validación/efecto utiliza el pedido activo antes de resolver el ID de la ruta.
3. **Entrega asignada al empleado.** El comprador envía su pedido (estado 5), y el personal lo pasa a pendiente (10) y entregado (40), esperando persistencia entre cambios. Las tres respuestas son 200, pero el libro se incorpora a la cuenta del empleado y no a la del comprador. La gestión utiliza la cuenta del personal para efectos que corresponden al comprador.

Se requiere corregir estos defectos antes de considerar validado el ciclo completo de compra. La restricción actual mantiene el código de GAD en solo lectura.

## Validación final

- 224/224 pruebas API: 41 nuevas y 183 previas.
- 2/2 pruebas UI; lint y typecheck correctos.
- 1188 solicitudes grabadas: 992 reconocidas y 196 sin match.
- Cobertura: 205/653 = 31.39%, antes 165/653 = 25.27%.
- Endpoints 29/136; operaciones 46/170; estados 134/387; parámetros 25/96.
- Brechas: 555, de las que 231 son críticas; antes 601 y 245 respectivamente.
- Reportes raíz regenerados; estimaciones históricas de IA intactas. Sin commit nuevo.
