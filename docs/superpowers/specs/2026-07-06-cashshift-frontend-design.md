# CashShift (Frontend) — Diseño

**Fecha:** 2026-07-06
**Estado:** Aprobado para pasar a plan de implementación
**Depende de:** Frontend Foundation, Branches/Registers, Products/Categories/Inventory (mergeados a `main`)
**Precede a:** POS/Sale, Credit/CuentasPorCobrar (frontend, cada uno su propio ciclo) — POS requiere un turno abierto para crear ventas

## 1. Resumen

Cuarto módulo de frontend: una pantalla `/cash-shift` dirigida por estado (sin turno → abrir → resumen/movimientos → cerrar → resumen final), en vez de un CRUD de lista, porque así es como un cajero piensa en "su turno". Requiere un endpoint nuevo de backend para poder recuperar el turno abierto de una caja sin necesitar el permiso de historial completo.

## 2. Alcance

**Incluido:**
- Backend: `GET /api/cash-shifts/current?registerId=` (gateado `CASHSHIFT_OPEN`, reutiliza `CashShiftRepository.findByRegisterIdAndStatus` ya existente) — devuelve el turno abierto o `404`.
- Frontend `/cash-shift`: selector de sucursal + caja → si no hay turno abierto, formulario de apertura (conteo de denominaciones); si hay turno abierto, resumen + acciones (registrar movimiento, cerrar turno); al cerrar, resumen final con diferencia de caja.
- Componente reusable `DenominationCountGrid` (apertura, movimiento manual, cierre — misma UI en los tres contextos).
- Gating: nav "Turno de Caja" con `CASHSHIFT_OPEN`; botón "Cerrar turno" con `CASHSHIFT_CLOSE`.
- Recuperación automática de estado tras un `409` al abrir turno (carrera entre pestañas) — vuelve a consultar `GET /api/cash-shifts/current` en vez de solo mostrar el error.

**Explícitamente fuera de alcance:**
- Historial de turnos cerrados (`GET /api/cash-shifts?registerId=`, gateado `CASHSHIFT_VIEW_HISTORY`) — no hay pantalla para esto en este módulo; es una vista de administrador/reportes, más natural en el módulo de Reportes (Fase 2).
- La sugerencia de cambio (`POST /api/cash-shifts/change-suggestion`) — es un helper interno que usará el módulo POS al calcular el cambio de una venta en efectivo, no tiene pantalla propia.
- Reapertura de turno cerrado — no existe endpoint backend para esto (deuda técnica ya señalada desde el bootstrap).

## 3. Backend

`GET /api/cash-shifts/current?registerId={id}` en `CashShiftController`, mismo gate `CASHSHIFT_OPEN` que `open`/`summary`. Llama a un nuevo método `CashShiftService.getCurrentOpenShift(UUID registerId) : CashShiftSummaryResponse`, que reutiliza `cashShiftRepository.findByRegisterIdAndStatus(registerId, OPEN)` (ya existe, usado internamente por `open()` para detectar duplicados) y lanza `ResourceNotFoundException` si no hay ninguno — mismo patrón 404 ya establecido en todo el proyecto.

## 4. Pantalla `/cash-shift`

**Selección:** dos `<select>` encadenados — sucursal (reusa `GET /api/branches`, mismo query key `['branches']` que `/branches`/`/inventory`) y caja (`GET /api/registers?branchId=`, mismo query key `['registers', branchId]` que ya usa `BranchCard`).

**Sin turno abierto:** al elegir caja, `GET /api/cash-shifts/current?registerId=` responde `404` → se muestra `DenominationCountGrid` en modo apertura + botón "Abrir turno" → `POST /api/cash-shifts/open`.

**Turno abierto:** la consulta anterior responde `200` → se muestra el resumen: caja, hora de apertura, total de apertura, `expectedCash`, tabla de denominaciones actuales (`currentQuantity` por denominación). Dos acciones:
- **"Registrar movimiento"** (modal): tipo (`ENTRY`/`WITHDRAWAL`/`EXPENSE`), motivo, `DenominationCountGrid` en modo movimiento → `POST /api/cash-shifts/{id}/movements`. Al guardar, invalida la query del resumen para refrescar `expectedCash`.
- **"Cerrar turno"** (misma pantalla, no modal — es la transición final): `DenominationCountGrid` en modo cierre + campo de notas → `POST /api/cash-shifts/{id}/close` → reemplaza la vista con el resumen final (`cashDifference` resaltado: verde si es `0.00`, ámbar si no).

## 5. `DenominationCountGrid`

Componente reusado en los tres contextos (apertura, movimiento, cierre). `useQuery(['denominations'], ...)` una sola vez (cacheado entre los tres usos). Renderiza un `Input type="number"` por denominación activa, con el valor de la denominación como etiqueta (ej. "RD$500"). Calcula y muestra un total en vivo (`sum(cantidad × valor)`) — solo para feedback visual, no se envía al backend (el backend recalcula el total desde los mismos conteos). Expone `onChange(entries: DenominationCountEntry[])` al componente padre.

## 6. Gating

`usePermission('CASHSHIFT_OPEN')` gatea el nav item "Turno de Caja" (mismo permiso que abrir/ver resumen/registrar movimiento — es el permiso "básico" de operar una caja). `usePermission('CASHSHIFT_CLOSE')` gatea el botón "Cerrar turno" — un cajero podría tener `CASHSHIFT_OPEN` sin `CASHSHIFT_CLOSE` en una configuración de permisos personalizada (aunque el rol `CASHIER` por defecto tiene ambos).

## 7. Manejo de errores

Mismo patrón: `toast.error(err.response?.data?.error ?? 'mensaje generico')`. Caso especial en "Abrir turno": si la respuesta es `409` (carrera — otra pestaña/usuario abrió el turno primero), en vez de solo mostrar el toast, se invalida y refetch `['cash-shift-current', registerId]` para que la UI se recupere mostrando el resumen del turno recién creado por el otro proceso, sin requerir refresh manual.

## 8. Testing

**Backend:** `CashShiftCurrentIntegrationTest` — turno abierto devuelve 200 con los datos correctos; sin turno abierto devuelve 404; caja de otro tenant devuelve 404.

**Frontend:** `e2e/cash-shift.spec.ts` — crear sucursal+caja → abrir turno (conteo de denominaciones) → registrar movimiento (retiro) → confirmar `expectedCash` actualizado en el resumen → cerrar turno (conteo igual al esperado) → confirmar resumen final con diferencia `0.00`.

## 9. Riesgos y notas

- El nuevo endpoint es de solo lectura, sin lógica nueva de negocio — el riesgo es mínimo (mismo nivel que el `GET /api/auth/me` de Frontend Foundation).
- `DenominationCountGrid` compartido entre tres formularios distintos (apertura, movimiento, cierre). `DenominationCountEntry.quantity` es `@Positive` en el backend **en los tres casos** (no solo movimientos) — el componente filtra las entradas con cantidad 0 antes de invocar `onChange` en los tres contextos, así el padre nunca envía una entrada con cantidad 0 (que el backend rechazaría con 400). Apertura y cierre solo exigen que la lista no esté vacía (`@NotEmpty`) — no que estén todas las denominaciones presentes; contar con cero de una denominación simplemente significa omitirla del array.
