# Credit / Cuentas por Cobrar (Frontend) — Diseño

**Fecha:** 2026-07-05
**Estado:** Aprobado para pasar a plan de implementación
**Depende de:** Frontend Foundation, Products/Categories/Inventory (frontend), CashShift (frontend), POS/Sale (frontend) (todos mergeados a `main`); [Credit/CuentasPorCobrar (backend)](2026-07-05-credit-cuentas-por-cobrar-design.md) (mergeado a `main`)
**Precede a:** Fase 2 (reportes, devoluciones parciales, portal cliente)

## 1. Resumen

Sexto módulo de frontend, y el primero en tocar clientes: no existe pantalla `/customers` hoy (`CustomerPicker` en POS solo busca, no gestiona), así que este módulo agrega esa pantalla — lista + alta/edición de cliente — y le cuelga el panel de crédito (perfil, balance, abonos, historial). Además activa el tab "Crédito" ya previsto en el tipo `PaymentMethod` de `CheckoutPanel` (hoy solo ofrece `CASH`/`TRANSFER`). Sin cambios de backend — todos los endpoints (`/api/customers`, `/api/customers/{id}/credit-*`) ya existen y están mergeados.

## 2. Alcance

**Incluido:**
- `/customers`: tabla de clientes (`GET /api/customers?q=`, búsqueda por nombre) + modal crear/editar (`CustomerFormDialog`, mismo patrón `Dialog` que `BranchFormDialog`/`ProductFormDialog`).
- Panel de crédito por cliente (`CustomerCreditPanel`, dentro de una fila expandida o un modal "Ver crédito" — ver §3.2): perfil (`creditEnabled`, `creditLimit`) editable, balance actual de solo lectura, formulario de abono, historial de transacciones (`CHARGE`/`PAYMENT`).
- `CheckoutPanel`: tercer tab "Crédito", habilitado solo si hay un cliente seleccionado en `CustomerPicker` (una venta a crédito exige `customerId`, igual que el backend valida) y ese cliente tiene `creditEnabled=true`. Consulta `GET /api/customers/{id}/credit-account` al seleccionar el tab para mostrar balance disponible (`creditLimit - balance`) antes de confirmar.
- Gating: nav "Clientes" con `CUSTOMER_EDIT`; botones "+ Cliente"/"Editar" con `CUSTOMER_CREATE`/`CUSTOMER_EDIT`; sección de perfil de crédito (habilitar/ajustar límite) con `CREDIT_AUTHORIZE`; formulario de abono con `CREDIT_RECEIVE_PAYMENT`. Balance e historial son visibles con solo `CUSTOMER_EDIT` (mismo permiso que el backend exige en `GET credit-account`/`GET credit-transactions`).

**Explícitamente fuera de alcance:**
- Desactivar/eliminar cliente — no existe endpoint backend (`CustomerController` no tiene `DELETE`... existe `DELETE /{id}` pero fuera de alcance de este módulo, no hay caso de uso claro sin también revisar créditos/ventas asociadas; se deja fuera deliberadamente).
- Ajustes manuales de crédito fuera de abono/cargo por venta (ej. "condonar deuda") — el backend solo modela `CHARGE`/`PAYMENT`, ambos ya cubiertos.
- Reportes de cartera (antigüedad de saldos, clientes con mayor deuda) — Fase 2, ya señalado como fuera de alcance en el diseño de backend.
- Paginación real en `/customers` — la tabla consume `GET /api/customers` con el `page`/`size` que ya soporta el backend, pero este módulo solo usa la primera página (`size=100`); un selector de página se agrega cuando el volumen de clientes lo justifique.

## 3. Pantallas

### 3.1 `/customers`

Tabla simple: nombre completo, teléfono, documento, estado de crédito (badge "Crédito habilitado" si `creditEnabled=true`, oculto si no aplica o si el usuario no tiene `CUSTOMER_EDIT`). Barra de búsqueda arriba (`q`, debounced, mismo patrón que `CustomerPicker`). Botón "+ Cliente" abre `CustomerFormDialog` con los campos de `CreateCustomerRequest` (nombre, apellido, teléfono, whatsapp, email, dirección, documento — todos opcionales salvo nombre/apellido). Botón "Editar" por fila reusa el mismo diálogo con `UpdateCustomerRequest` (mismos campos, todos opcionales en edición).

### 3.2 Panel de crédito

Cada fila tiene un botón "Crédito" que abre `CustomerCreditPanel` en un modal (no una ruta separada — evita duplicar el layout de tabla + detalle que ya generó fricción de diseño en otros módulos; un modal es suficiente porque el flujo es "ver y actuar sobre un cliente a la vez", nunca comparar dos clientes lado a lado).

Contenido del modal, en orden:
1. **Perfil** (gateado `CREDIT_AUTHORIZE`): dos campos — checkbox "Crédito habilitado" + input "Límite de crédito" → `PUT /api/customers/{id}/credit-profile`. Si el usuario no tiene `CREDIT_AUTHORIZE`, esta sección se muestra de solo lectura (texto, no inputs) en vez de ocultarse — el balance/límite es información relevante para quien solo puede recibir abonos.
2. **Balance** (gateado `CUSTOMER_EDIT`, igual que el backend): `GET /api/customers/{id}/credit-account` → `balance` actual, y si hay perfil cargado, `disponible = creditLimit - balance` en texto secundario.
3. **Registrar abono** (gateado `CREDIT_RECEIVE_PAYMENT`): input `amount` + `note` opcional → `POST /api/customers/{id}/credit-payments`. Al confirmar, invalida `['credit-account', customerId]` y `['credit-transactions', customerId]`.
4. **Historial** (gateado `CUSTOMER_EDIT`): tabla de `GET /api/customers/{id}/credit-transactions` — tipo (`CHARGE` rojo/`PAYMENT` verde), monto, nota, y `saleId` como enlace de texto (sin navegación real a un detalle de venta, ya que no existe pantalla de detalle de venta individual hoy — fuera de alcance).

### 3.3 `CheckoutPanel` — tab Crédito

Tercer botón junto a "Efectivo"/"Transferencia": "Crédito". Deshabilitado (con tooltip) si no hay cliente seleccionado en `CustomerPicker`, o si el cliente seleccionado no tiene `creditEnabled=true` (se resuelve con un `useQuery(['credit-account', customerId])` que se dispara solo cuando el tab está activo, igual patrón lazy que `change-suggestion` ya usa para `CASH`). Al activarse con un cliente válido, muestra: balance actual, límite, disponible, y confirma automáticamente que el total de la venta no exceda el disponible (si excede, el botón "Cobrar" se deshabilita con mensaje "Excede el crédito disponible" — validación de UI que espeja la regla de negocio del backend, pero el backend sigue siendo la fuente de verdad final ante condiciones de carrera). `PaymentRequest` para este método es `{ method: "CREDIT", amount: total.toFixed(2) }` — sin campos adicionales, ya soportado por el tipo existente.

## 4. Gating

| Elemento | Permiso |
|---|---|
| Nav "Clientes" | `CUSTOMER_EDIT` |
| Botón "+ Cliente" / "Editar" | `CUSTOMER_CREATE` / `CUSTOMER_EDIT` |
| Sección perfil de crédito (editable) | `CREDIT_AUTHORIZE` |
| Balance + historial | `CUSTOMER_EDIT` |
| Formulario de abono | `CREDIT_RECEIVE_PAYMENT` |
| Tab "Crédito" en `CheckoutPanel` | ninguno adicional en frontend — el backend ya rechaza con `403` si el usuario no tiene `CREDIT_AUTHORIZE` al confirmar la venta; el tab se muestra siempre que el cliente sea elegible, y el error de permiso se maneja como cualquier otro error de venta (§5) |

Nota: `CustomerController` no tiene `@PreAuthorize` en el backend hoy (lista/alta/edición abiertas a cualquier usuario autenticado) — deuda ya presente antes de este módulo, no se corrige aquí. El gating de frontend con `CUSTOMER_CREATE`/`CUSTOMER_EDIT` es solo de UI (oculta botones), no una barrera real; se documenta para que no se asuma protección donde no la hay.

## 5. Manejo de errores

Mismo patrón: `toast.error(err.response?.data?.error ?? 'mensaje generico')` en cada mutation's `onError`. Casos especiales:
- Abono mayor al balance (`400` del backend) → mensaje de backend ya es específico, se muestra tal cual.
- Venta a crédito que excede el límite en el momento de confirmar (carrera con otra venta concurrente, aunque la UI ya validó del lado del cliente) → mismo toast genérico, y se invalida `['credit-account', customerId]` para refrescar el balance mostrado.

## 6. Testing

**`e2e/customers.spec.ts`:** crear cliente → editar cliente (cambiar teléfono) → habilitar crédito (límite RD$5,000) → confirmar balance inicial en RD$0.00.

**`e2e/credit.spec.ts`:** requiere cliente con crédito habilitado y turno abierto (setup vía API, no UI) → completar venta en POS con método Crédito → confirmar balance del cliente aumentó por el monto de la venta → registrar abono parcial → confirmar balance disminuyó → intentar abono mayor al balance restante → confirmar rechazo (`400`, toast visible, balance sin cambio).

Sin tests de backend nuevos — no hay cambios de backend en este módulo.

## 7. Riesgos y notas

- Primera pantalla de frontend que gestiona clientes — `CustomerFormDialog` es nuevo, no una extensión de un componente existente, pero sigue el mismo patrón (`Dialog` + `react-hook-form` o estado local simple, según lo que ya use `BranchFormDialog`) para no introducir un patrón de formulario distinto.
- `CustomerCreditPanel` como modal reusa el cliente ya cargado en la fila de la tabla — no hace un `GET /api/customers/{id}` adicional, solo las tres consultas de crédito (perfil implícito en la respuesta de cuenta si se necesita, balance, historial).
- El query key `['credit-account', customerId]` se comparte entre el modal de `/customers` y el tab de `CheckoutPanel` — mismo beneficio de cache que ya se documentó en el diseño de CashShift para `['branches']`.
