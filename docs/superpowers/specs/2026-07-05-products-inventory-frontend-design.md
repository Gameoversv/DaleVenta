# Products/Categories/Inventory (Frontend) — Diseño

**Fecha:** 2026-07-05
**Estado:** Aprobado para pasar a plan de implementación
**Depende de:** Frontend Foundation, Branches/Registers (mergeados a `main`)
**Precede a:** CashShift, POS, Credit (frontend, cada uno su propio ciclo)

## 1. Resumen

Tercer módulo de frontend: dos pantallas — `/products` (categorías + catálogo de productos) e `/inventory` (stock por sucursal + ajustes manuales). Sin cambios de backend — usa las APIs ya existentes de los módulos Product/BranchInventory del backend (mergeados hace tiempo).

## 2. Alcance

**Incluido:**
- `/products`: panel de categorías (crear inline) + tabla de productos (crear/editar vía modal, mismo patrón de diálogo que Branches/Registers).
- `/inventory`: selector de sucursal (reusa `GET /api/branches`) + tabla de stock por sucursal + resaltado de fila si `currentStock < minStock` + modal "Ajustar stock" (ENTRY/EXIT/ADJUSTMENT).
- Gating: nav "Productos"/"Inventario" con `INVENTORY_VIEW`; botones de creación/edición con `INVENTORY_CREATE`/`INVENTORY_EDIT`; botón "Ajustar stock" con `INVENTORY_ADJUST`.
- Columnas de costo/precio en la tabla de productos se ocultan automáticamente cuando el backend devuelve `null` (ya gateado por `COST_VIEW`/`PRICE_VIEW` en `ProductResponse.from`) — sin lógica de permisos adicional en el frontend para esto.

**Explícitamente fuera de alcance:**
- Editar `minStock`/`maxStock` — no existe endpoint backend para esto (siempre `0`/`null` hoy).
- Desactivar un producto o categoría — no existe endpoint backend.
- Imágenes de producto, código de barras por escaneo — Fase 2/POS respectivamente.
- Historial de movimientos de inventario (solo se registra, no se lista) — no hay endpoint `GET` de movimientos, solo `POST`.

## 3. Pantallas

### 3.1 `/products`

Layout de dos columnas: categorías (izquierda, angosta) + productos (derecha, tabla ancha). Crear categoría es un formulario inline simple (nombre + botón), no un modal — es una acción de un solo campo. Crear/editar producto usa un modal (`ProductFormDialog`, mismo patrón `Dialog` que `BranchFormDialog`) con todos los campos de `CreateProductRequest`/`UpdateProductRequest`: categoría (select), código interno, código de barras (opcional), descripción, unidad, costo, precio de venta, precio mayorista, tasa de impuesto, rastrea inventario (checkbox). El código interno y de barras solo se piden al crear (no están en `UpdateProductRequest`, así que el modal de edición no los muestra — son inmutables tras la creación).

Filtro de productos por categoría seleccionada (clic en una categoría de la lista filtra la tabla; "Todas" como opción por defecto).

### 3.2 `/inventory`

Selector de sucursal arriba (reusa `GET /api/branches` — mismo query key `['branches']` que ya usa `/branches`, así que TanStack Query cachea entre pantallas). Al seleccionar, dispara `GET /api/inventory/branch/{id}`. Tabla: producto, stock actual, mínimo, máximo, y una fila resaltada (fondo ámbar sutil) si `currentStock < minStock`. Botón "Ajustar stock" por fila abre un modal (`AdjustStockDialog`) con: tipo (select ENTRY/EXIT/ADJUSTMENT), cantidad, motivo (texto libre, requerido) — llama `POST /api/inventory/movements` y refresca la tabla.

## 4. Gating

`usePermission('INVENTORY_VIEW')` gatea los nav items "Productos" e "Inventario". `usePermission('INVENTORY_CREATE')` gatea los botones "+ Categoría" y "+ Producto". `usePermission('INVENTORY_EDIT')` gatea el botón "Editar" en cada fila de producto. `usePermission('INVENTORY_ADJUST')` gatea el botón "Ajustar stock" en `/inventory`.

## 5. Manejo de errores

Mismo patrón ya establecido: `toast.error(err.response?.data?.error ?? 'mensaje generico')` en cada mutation's `onError`.

## 6. Testing

**`e2e/products.spec.ts`:** crear categoría → crear producto (con esa categoría) → editar producto (cambiar descripción) → confirmar cambios visibles en la tabla.

**`e2e/inventory.spec.ts`:** requiere una sucursal y un producto ya creados (el spec los crea vía la API de setup, no vía UI, para no duplicar el flujo ya cubierto en `products.spec.ts`/`branches.spec.ts`) → seleccionar sucursal → ajustar stock (ENTRY, cantidad 10) → confirmar `currentStock` actualizado a 10 en la tabla.

Sin tests de backend nuevos — no hay cambios de backend en este módulo.

## 7. Riesgos y notas

- El query key `['branches']` compartido entre `/branches` y `/inventory` significa que si el usuario visitó `/branches` recientemente, `/inventory` puede mostrar datos cacheados (stale pero no incorrectos, ya que `staleTime` por defecto de TanStack Query es 0 — revalida en el fondo automáticamente al montar). No requiere manejo especial.
- `ProductFormDialog` es más grande que `BranchFormDialog` (8 campos vs 2) — sigue siendo un solo archivo cohesivo, no amerita dividirse más.
