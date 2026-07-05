# Branches/Registers — Diseño

**Fecha:** 2026-07-05
**Estado:** Aprobado para pasar a plan de implementación
**Depende de:** Frontend Foundation (mergeado a `main`)
**Precede a:** Products/Categories/Inventory, CashShift, POS, Credit (frontend, cada uno su propio ciclo)

## 1. Resumen

Segundo módulo de frontend: pantalla única de gestión de sucursales y cajas (`/branches`). Requiere dos endpoints nuevos de backend (`PUT` para sucursal y caja — hoy solo existen `create`/`list`/`deactivate` para sucursal y `create`/`list-by-branch` para caja).

## 2. Alcance

**Incluido:**
- Backend: `PUT /api/branches/{id}` (name, address), `PUT /api/registers/{id}` (name), ambos gateados `SETTINGS_MANAGE`, mismo patrón que `create`/`deactivate` ya existentes.
- Backend: fix del bug ya señalado en `BranchService.deactivate` — usa `ResponseStatusException` desnudo en vez de `ResourceNotFoundException` (se toca este archivo de todas formas para agregar `update()`).
- Frontend: pantalla `/branches` — tarjetas de sucursal expandibles mostrando sus cajas. Crear/editar/desactivar sucursal, crear/editar caja. Item de sidebar "Sucursales" gateado por `SETTINGS_MANAGE`.
- Confirmación de desactivación vía diálogo Radix (no `window.confirm`).

**Explícitamente fuera de alcance:**
- Reasignar una caja a otra sucursal (es una operación de "transferencia" con implicaciones propias — turnos abiertos, inventario ligado a la sucursal — decisión explícita de esta sesión).
- Reactivar una sucursal desactivada (no hay endpoint backend para esto; sería aditivo a futuro).
- `UserBranch`/`UserRegister` (asignación de usuarios a sucursales/cajas) — mencionado como deuda técnica pendiente desde el bootstrap, no es parte de este módulo.

## 3. Backend

`BranchService.update(UUID id, UpdateBranchRequest req)`: busca por id+tenant (mismo patrón `findById(id).filter(b -> b.getTenantId().equals(tenantId))` que ya usa `RegisterService.create`), actualiza `name`/`address`, guarda. `deactivate` se corrige para lanzar `ResourceNotFoundException` en vez de `ResponseStatusException`.

`RegisterService.update(UUID id, UpdateRegisterRequest req)`: mismo patrón, busca por id+tenant (vía su `branchId`), actualiza solo `name`.

Endpoints:
```
PUT /api/branches/{id}   {name, address}   — SETTINGS_MANAGE
PUT /api/registers/{id}  {name}            — SETTINGS_MANAGE
```

## 4. Frontend

**`/branches`:** lista de `Card` por sucursal (nombre, dirección, badge activo/inactivo). Botón "Editar" (abre modal con formulario precargado), botón "Desactivar" (abre diálogo de confirmación Radix). Botón expandir/colapsar por tarjeta — al expandir, dispara `useQuery(['registers', branchId])` (lazy, no se piden cajas de sucursales colapsadas) y muestra la lista de cajas con su propio "Editar" (nombre) y botón "+ Nueva caja".

**Gating:** el item de sidebar "Sucursales" usa `usePermission('SETTINGS_MANAGE')` — toda la pantalla es de gestión, no tiene sentido mostrarla a quien no puede mutar nada en ella.

**Data fetching:** `useQuery(['branches'])` para la lista principal; mutaciones de crear/editar/desactivar sucursal invalidan `['branches']`; mutaciones de caja invalidan `['registers', branchId]`.

## 5. Manejo de errores

Mismo patrón ya establecido en Frontend Foundation: cada mutation's `onError` hace `toast.error(err.response?.data?.error ?? 'mensaje generico')`. Sin mapeo especial por código de estado — 400 (validación) y 404 (recurso de otro tenant) terminan en el mismo toast con el mensaje real del backend.

## 6. Testing

**Backend:** tests de integración para los dos endpoints nuevos, mismo estilo que `BranchIntegrationTest`/`RegisterIntegrationTest` existentes (crear vía admin, verificar 200 + campos actualizados; verificar 403 sin `SETTINGS_MANAGE`; verificar 404 para recurso de otro tenant).

**Frontend:** Playwright E2E (`branches.spec.ts`) — flujo completo: crear sucursal → editar sucursal → crear caja dentro → editar caja → desactivar sucursal → confirmar que ya no aparece en la lista.

## 7. Riesgos y notas

- El fix del bug en `BranchService.deactivate` es un cambio mínimo y aislado (una línea de tipo de excepción), sin riesgo de romper el comportamiento existente — el status code que produce sigue siendo 404, solo cambia de un `ResponseStatusException` desnudo (mapeado a 500 por el catch-all si algo cambia el manejo genérico) a la excepción de dominio correcta.
- `RegisterService.update` reutiliza la misma validación de pertenencia por tenant que ya usa `create`/`listByBranch` — sin lógica nueva de autorización.
