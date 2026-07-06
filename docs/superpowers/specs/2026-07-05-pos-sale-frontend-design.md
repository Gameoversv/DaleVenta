# POS/Sale (Frontend) — Diseño

**Fecha:** 2026-07-05
**Estado:** Aprobado para pasar a plan de implementación
**Depende de:** Frontend Foundation, Branches/Registers, Products/Categories/Inventory, CashShift (frontend) (mergeados a `main`); backend POS/Sale y Credit ya mergeados
**Precede a:** Credit/CuentasPorCobrar (frontend) — su propio ciclo

## 1. Resumen

Quinto módulo de frontend: una pantalla `/pos` de carrito y cobro en una sola vista (no un wizard multi-pantalla) — búsqueda de producto + carrito a la izquierda, panel de cobro a la derecha. Requiere un turno de caja abierto en la caja seleccionada (mismo patrón de selección que `/cash-shift`).

El backend de POS/Sale (y Credit) ya está mergeado a `main` y soporta `CASH`, `TRANSFER` y `CREDIT` como métodos de pago, y pagos mixtos (varios `Payment` por venta). Este ciclo de frontend acota deliberadamente el alcance — ver §2.

## 2. Alcance

**Incluido:**
- Pantalla `/pos`: selector de sucursal + caja (mismos query keys `['branches']`/`['registers', branchId]` que `/cash-shift`) → si no hay turno abierto en esa caja, mensaje + enlace a `/cash-shift` para abrirlo (no se duplica el formulario de apertura).
- Búsqueda de producto: campo de texto que filtra client-side sobre la query `['products']` ya existente (por `description`/`internalCode`/`barcode`) → clic en un resultado agrega al carrito.
- Carrito: línea por producto (cantidad editable, toggle de precio mayorista), subtotal/impuesto/total calculados client-side solo para feedback visual — el backend recalcula todo de forma autoritativa.
- Selector de cliente: búsqueda tipo autocompletar contra `GET /api/customers?q=` (sin crear/editar cliente en este módulo — eso queda para el ciclo de Credit, que de todas formas necesita los campos de perfil de crédito). Opcional — `null` = "Cliente de contado".
- Descuento: campo visible solo si `usePermission('SALE_DISCOUNT')` es `true`.
- Cobro con **un solo método de pago por venta** (`CASH` o `TRANSFER`, cubriendo el total completo) — pagos mixtos quedan fuera de alcance (ver más abajo).
- Pago en efectivo: `DenominationCountGrid` (reusado del módulo CashShift) + preview en vivo de cambio vía `POST /api/cash-shifts/change-suggestion` antes de habilitar el botón de confirmar.
- Pago por transferencia: campos banco + referencia.
- Confirmación post-venta: resumen (items, pago, total) con botón "Anular" (gateado `SALE_VOID`) y botón "Nueva venta" que reinicia el carrito.
- Anulación de venta desde la pantalla de confirmación (modal con motivo obligatorio) — no hay pantalla de historial/listado de ventas en este ciclo.

**Explícitamente fuera de alcance:**
- **Pago con `CREDIT`** — el backend ya lo acepta, pero requiere mostrar estado de crédito del cliente (habilitado/límite/balance disponible), que es superficie del módulo Credit (su propio ciclo). Se agrega ahí como una pestaña más de método de pago, no rediseñando esta pantalla.
- **Pagos mixtos** (varios `Payment` por venta) — el modelo de datos ya lo soporta (`payments: []`), así que agregarlo después es aditivo (permitir varias filas en el panel de cobro), no un rediseño.
- **CRUD de cliente** (crear/editar) — ciclo de Credit.
- **Historial/listado de ventas** (`GET /api/sales`) y reportes — pertenecen al módulo de Reportes (Fase 2), como ya señala el propio spec de backend.
- **Devoluciones parciales** — el backend tampoco las soporta todavía (anulación es todo-o-nada).

## 3. Pantalla `/pos`

**Selección:** igual que `/cash-shift` — sucursal → caja. Al elegir caja, `GET /api/cash-shifts/current?registerId=` (mismo query key `['cash-shift-current', registerId]`, cache compartido con `/cash-shift`):
- `404` → mensaje "No hay turno abierto en esta caja" + `<Link href="/cash-shift">Abrir turno</Link>`.
- `200` → se renderiza `SaleWorkspace` con el `cashShiftId` del turno.

**`SaleWorkspace`** (una vez confirmado el turno abierto):
- `ProductSearchPanel` — input de texto, filtra `['products']` en memoria, clic agrega al carrito con `quantity: 1`.
- `SaleCart` — lista de líneas `{productId, quantity, useWholesalePrice}` con datos de producto resueltos para mostrar; cantidad editable inline; toggle mayorista por línea; subtotal/impuesto/total calculados en el cliente solo para feedback (el backend es la fuente de verdad).
- `CustomerPicker` — autocompletar contra `GET /api/customers?q=`, `null` por defecto ("Cliente de contado").
- `CheckoutPanel` — campo de descuento (gateado `SALE_DISCOUNT`), tabs de método de pago (`CASH`/`TRANSFER`), botón "Cobrar".
  - `CashPaymentForm`: `DenominationCountGrid` + preview de cambio en vivo (`POST /api/cash-shifts/change-suggestion` con `changeAmountCents = (recibido - total) * 100`) — si `exact: false`, botón "Cobrar" deshabilitado con mensaje "No hay combinación exacta de cambio disponible".
  - `TransferPaymentForm`: inputs banco + referencia.
- Al confirmar: `POST /api/sales` con `CreateSaleRequest` completo → invalida `['cash-shift-current', registerId]` (una venta en efectivo muta `expectedCash` igual que un movimiento manual) → reemplaza la vista con `SaleConfirmation`.

**`SaleConfirmation`:**
- Resumen: items (producto, cantidad, precio unitario, total de línea), método de pago, total.
- Botón "Anular" (gateado `usePermission('SALE_VOID')`) → modal con campo de motivo obligatorio → `POST /api/sales/{id}/void` → reemplaza el resumen con el mismo resumen marcado `VOIDED`.
- Botón "Nueva venta" → limpia el carrito y vuelve a `SaleWorkspace` vacío (mismo turno, sin re-seleccionar sucursal/caja).

## 4. Manejo de errores

Mismo patrón: `toast.error(err.response?.data?.error ?? 'mensaje generico')`, sin limpiar el carrito en error (el cajero corrige y reintenta):
- Referencia de transferencia duplicada (`409`) → toast, permanece en `CheckoutPanel` con los datos ya ingresados.
- Stock insuficiente (`400`) → toast, carrito intacto para que el cajero ajuste cantidad.
- Sin combinación exacta de cambio → prevenido client-side (botón deshabilitado), no depende de un `400` del submit.
- Anular venta ya anulada / turno cerrado (`409`/`400`) → toast en el modal de anulación.

## 5. Gating

- Nav item "POS" con `SALE_CREATE` (mismo criterio que `CASHSHIFT_OPEN` en el módulo anterior — operar el POS requiere el permiso base de crear venta).
- Campo de descuento: `usePermission('SALE_DISCOUNT')`.
- Botón "Anular": `usePermission('SALE_VOID')`.

## 6. Testing

**Frontend:** `e2e/pos-sale.spec.ts` — crear sucursal+caja+categoría+producto+inventario inicial → abrir turno → ir a `/pos` → buscar y agregar producto al carrito → pagar en efectivo con cambio exacto → confirmar resumen de venta → anular la venta con motivo → navegar a `/inventory` y confirmar que el stock volvió a su cantidad original (prueba end-to-end de la reversión, no solo que la UI cambia a "VOIDED").

No hay endpoints backend nuevos en este ciclo — el backend de Sale ya tiene cobertura completa (97/97 tests existentes). Este ciclo es 100% frontend.

## 7. Riesgos y notas

- `SaleWorkspace` reutiliza `DenominationCountGrid` del módulo CashShift tal cual (mismo query key `['denominations']`, cacheado).
- El preview de cambio (`change-suggestion`) es una llamada adicional en cada cambio de denominaciones recibidas durante el pago en efectivo — aceptable dado el volumen de uso (un cajero cobrando, no un loop de alta frecuencia); no se optimiza con debounce en este ciclo (YAGNI hasta que se observe un problema real).
- Al no incluir pagos mixtos ni CREDIT en este ciclo, `CreateSaleRequest.payments` siempre se envía como un arreglo de un solo elemento — la superficie de la API que no se usa (múltiples pagos, `CREDIT`) permanece intacta para los ciclos futuros sin requerir cambios de backend.
