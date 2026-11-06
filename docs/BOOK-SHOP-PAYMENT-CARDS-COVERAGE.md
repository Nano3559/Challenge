# Tarjetas ficticias y recargas locales

Verificación: 2026-11-06. Alcance: GET/PUT/DELETE `/book-shop-account-payment-cards` y POST `/book-shop-account-payment-cards/topup`. No se cambió código de GAD ni se realizaron operaciones con servicios financieros externos: el handler modifica únicamente la base JSON local.

## Casos implementados

26 pruebas nuevas con cliente, datos, fixture aislada y esquemas específicos:

- Para las cuatro operaciones: anónimo y token inválido 401; usuario sin cuenta 404.
- Cuenta propia sin tarjeta: GET, DELETE y topup devuelven 404.
- PUT crea tarjeta ficticia y GET verifica persistencia enmascarada. PUT reemplaza la tarjeta de la misma cuenta.
- Número con longitud incorrecta/no numérico/ausente; CVV con longitud incorrecta/no numérico/ausente; fecha ausente, inválida o vencida: 422 y tarjeta previa conservada.
- Repetición del número en la misma cuenta: 422 `Card already in use`.
- `account_id` y `balance` enviados en PUT se ignoran: se vincula al comprador autenticado y se inicia con saldo local 50000.
- DELETE elimina la tarjeta propia; GET y un segundo DELETE devuelven 404; la tarjeta de otro comprador permanece intacta.
- Recarga con CVV ausente o incorrecto: 401, sin cambios en tarjeta/cuenta/historial.
- Importes ausentes, null, booleano, texto no numérico, negativos, cero, inferiores a 100 o superiores a 100000: 422, saldos e historial intactos.
- Importe dentro del rango pero superior al saldo de tarjeta: 422 `Not enough balance`.
- Recargas de 100 y 50000: 200, descuento persistido en tarjeta, acreditación diferida en la cuenta e historial con importe, cuenta y saldos correctos. El segundo importe consume el saldo completo de la tarjeta. Se verifica también que tarjeta, cuenta e historial de otro comprador no cambien.

Todos los números se generan como 20 dígitos ficticios con prefijo 9900 para el formato propio de GAD; no se usan tarjetas reales. CVV ficticio de cinco dígitos y fecha futura 2099-12-31. Las cuentas y usuarios se crean juntos en la copia desechable y se descartan juntos, sin tocar semillas.

## Respuestas y asincronía

GET devuelve exclusivamente `{ card_number: '****************dddd', balance }`. Se valida con esquema estricto para comprobar que no expone CVV, fecha ni otros campos. PUT devuelve datos completos de la tarjeta sin ID; POST topup devuelve la tarjeta completa persistida con ID. Son contratos reales distintos; OpenAPI los representa con un único esquema.

PUT responde antes de persistir la tarjeta: se espera condicionalmente el número enmascarado nuevo. Topup descuenta la tarjeta en la respuesta, pero acredita fondos y registra historial tras una espera de 7–15 segundos configurada por GAD. Se consulta hasta observar el historial y se contrastan los fondos, sin sustituir el resultado por una espera fija.

El historial de recargas tiene `activityType: topup` y `paymentDetails.order_id: null`; se añadió un esquema separado para esas entradas, manteniendo el esquema existente de compras/reembolsos.

## Diferencias con OpenAPI

| OpenAPI | Implementación real |
|---|---|
| `expiry_date` | PUT requiere `expiration_date`. |
| GET devuelve BookShopPaymentCard completo | Devuelve solo número enmascarado y saldo. |
| PUT devuelve tarjeta con ID requerido | La respuesta inicial no contiene ID. |
| Topup requiere card_number/amount | Exige CVV y amount; selecciona la tarjeta por cuenta autenticada e ignora card_number. |
| Solo 200/401/422 para PUT y topup | También devuelven 404 cuando falta cuenta; topup también si falta tarjeta. |

El límite validado es 100–100000, pero una tarjeta nueva solo tiene 50000: un topup de 100000 no puede tener éxito con ese saldo. No se alteró la base para fingir ese caso; se cubren el mínimo exitoso, saldo exacto, insuficiencia y valores fuera de rango.

## Defectos confirmados de GAD

Reproducciones con compradores propios en una copia separada, fuera del recorder. No se incorporaron expectativas positivas que legitimen los defectos:

1. Registrar el mismo número ficticio en dos cuentas diferentes devuelve 200. El handler consulta duplicados de otra cuenta, pero no utiliza ese resultado para rechazar la operación.
2. PUT con `card_number: null` devuelve 500, en lugar de un rechazo de validación 422. El validador llama `replace` sin comprobar el tipo.
3. Topup con `amount: 100.75` devuelve 200 y registra/acredita 100. La validación usa `parseInt` y trunca el importe sin rechazarlo. Se verificó tanto el importe del historial como el incremento de fondos.

Permanecen abiertos junto con los defectos documentados de pedidos/equipo; GAD sigue en solo lectura de código.

## Datos y continuidad

Huella SHA-256 inicial de cuentas, tarjetas e historial habituales:

`187e098818f862968037b9f67470608015c9afe21ba0679e7b9ea95e650358f1`

Sin commit nuevo. No se cambia el analizador ni las estimaciones históricas de IA.

## Validación final

- 26/26 pruebas nuevas en ejecución puntual; regresión final 338/338 API aprobadas, sin fallos ni flaky.
- Lint y typecheck sin advertencias; git diff --check correcto. UI no reejecutada en esta entrega exclusivamente API; última validación anterior 2/2.
- La primera ejecución puntual se detuvo al detectar que GET usa proyección enmascarada. Se verificó el renderer y se separaron los esquemas reales de GET, PUT y topup antes de repetir correctamente. La grabación final procede solo de la regresión completa posterior.
- Los casos de recarga tienen límite de test de 45 segundos para contemplar preparación de dos cuentas/tarjetas y el retraso de GAD; la espera condicionada de historial tiene timeout de 20 segundos.
- 2154 solicitudes grabadas: 1836 reconocidas y 318 sin match.
- Cobertura 248/653 = 37.98%, antes 232/653 = 35.53%. Endpoints 39/136, operaciones 59/170, estados 163/387, parámetros 26/96.
- Brechas 502, críticas 208; antes 520 y 214. Reportes raíz regenerados; IA histórica intacta.
- Ambas rutas figuran completas bajo la métrica de métodos/estados/parámetros; no equivale a conformidad del cuerpo OpenAPI ni a ausencia de defectos.
- Huella de datos originales igual a la inicial. Copias descartadas, incluidas las del intento interrumpido después de verificar que no tenían proceso activo. Cero carpetas de sandbox.
