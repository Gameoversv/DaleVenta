# Frontend Foundation — Diseño

**Fecha:** 2026-07-05
**Estado:** Aprobado para pasar a plan de implementación
**Depende de:** Bootstrap/RBAC, Product/BranchInventory, CashShift/Denominaciones, POS/Sale, Credit/CuentasPorCobrar (todos mergeados a `main`)
**Precede a:** Frontend por módulo (Branches/Registers, Products/Inventory, CashShift, POS, Credit, Dashboard) — cada uno su propio ciclo spec→plan→build

## 1. Resumen

Primer módulo de frontend: scaffold de Next.js, autenticación (login + registro de tenant), layout protegido con sidebar gateado por permisos reales, y una única pantalla real (dashboard vacío). Es deliberadamente angosto — el resto de los módulos (Branches, Products, CashShift, POS, Credit) se construyen después, cada uno como su propio ciclo, igual que se hizo en el backend.

## 2. Alcance

**Incluido:**
- Dos cambios chicos de backend, prerequisito de este módulo (ver §3).
- Scaffold Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4, componentes estilo shadcn (Radix + CVA), TanStack Query, react-hook-form + zod, axios, sonner, lucide-react — mismas versiones que el proyecto hermano TallerFacilRD.
- Cliente API (axios) con interceptor de token y de 401.
- Páginas `(auth)/login` y `(auth)/register` (registro de tenant).
- `AuthContext` (usuario + permisos efectivos), hook `usePermission(code)`.
- Layout protegido `(dashboard)`: sidebar + topbar + guard de autenticación.
- Página `/dashboard` placeholder (saludo, sin datos).
- Manejo de errores (toasts vía sonner, 401 global, 403 local).
- Tests E2E (Playwright): registro→login→dashboard→logout, y guard sin token.

**Explícitamente fuera de alcance (queda para módulos futuros):**
- Cualquier pantalla de negocio real (Branches, Registers, Products, Inventory, CashShift, POS, Credit, Customers) — ninguna, ni siquiera como stub de navegación.
- Datos reales en el dashboard (ventas, stock bajo, etc.) — es Fase 2 también en el backend.
- Unit tests de componentes UI aislados — bajo ROI para layout/auth puro; entran cuando haya lógica real que testear (cálculo de cambio, validación de límite de crédito, etc.).
- Recuperación de contraseña, 2FA, "recordarme" — no estaban en el alcance de Fase 1 del backend tampoco.

## 3. Prerequisitos de backend

Dos cambios chicos, cada uno su propio commit, antes de empezar el frontend:

1. **Consistencia de casing en `Customer`:** `CreateCustomerRequest` y `CustomerResponse` (`apps/api/src/main/java/rd/dalventa/api/customer/dto/`) ganan `@JsonProperty` explícito en cada campo camelCase multi-palabra (`firstName`, `lastName`, `documentId`, etc.), igual que ya lo hacen `CreateProductRequest`, `CreateSaleRequest`, etc. Hoy `Customer` es el único módulo que expone snake_case (`first_name`) porque nunca se le agregaron los overrides — confirmado durante el módulo Credit, donde los tests de `Customer` fallaban silenciosamente hasta corregir las keys. Este fix elimina la única excepción, así el frontend no necesita lógica de conversión de casing en absoluto.
2. **`GET /api/auth/me`:** nuevo endpoint en `AuthController` que retorna `{ user: UserResponse, permissions: PermissionCode[] }`, usando `PermissionResolutionService.resolveAll(user)` que ya existe (no hay lógica nueva, solo exponerla). Necesario porque el modelo de permisos tiene overrides individuales por usuario (`UserPermission` GRANT/REVOKE) — el rol solo no alcanza para saber qué puede hacer un usuario específico, y el frontend necesita esa lista real para gatear el sidebar y los botones de acciones sensibles.

Los tests existentes de `CustomerIntegrationTest` deben seguir en verde después del cambio 1 (ya usan `first_name`/`last_name` en el JSON — hay que actualizarlos a camelCase también, en el mismo commit).

## 4. Stack y estructura de carpetas

Mismo stack y convención de carpetas que TallerFacilRD (`apps/web`):

```
apps/web/
  src/
    app/
      (auth)/
        login/page.tsx
        register/page.tsx
      (dashboard)/
        layout.tsx          # guard + sidebar + topbar
        dashboard/page.tsx  # placeholder
      layout.tsx            # root layout (fonts, providers)
      globals.css
    components/
      layout/               # Sidebar, Topbar
      ui/                   # botones, inputs, etc. (estilo shadcn)
    hooks/
      useAuth.ts            # consume AuthContext
      usePermission.ts
    lib/
      api.ts                # cliente axios
      auth-context.tsx       # AuthContext + provider
    types/
      auth.ts               # UserResponse, PermissionCode, etc.
```

Dependencias (`package.json`), idénticas a TallerFacilRD: `next@16`, `react@19`, `@tanstack/react-query@^5`, `axios`, `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-slot`, Tailwind 4 + `@tailwindcss/postcss`.

## 5. Cliente API

`lib/api.ts`: instancia de axios con `baseURL` desde `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`).

- Interceptor de request: agrega `Authorization: Bearer <token>` leyendo `localStorage.getItem('token')`. Sin conversión de casing (gracias al fix de Customer en §3, todo el backend es camelCase ahora).
- Interceptor de response: en error, si `status === 401` y la URL no es `/api/auth/*`, limpia `localStorage` y redirige a `/login?expired=1`. En cualquier otro error, relanza tal cual — cada caller decide cómo mostrarlo (no hay manejo genérico que oculte el mensaje real del backend).

## 6. Autenticación

**`/login`:** formulario (email, password) con react-hook-form + zod. `POST /api/auth/login` → `{token, user}`. Guarda `token` en localStorage, llama `GET /api/auth/me` para obtener permisos, puebla `AuthContext`, redirige a `/dashboard`.

**`/register`:** formulario (nombre del negocio, nombre del admin, email, password) → `POST /api/tenants/register`, mismo shape que ya usan los tests de integración del backend (`tenant_name`, `admin_name`, `admin_email`, `admin_password` — este endpoint específico ya es snake_case nativo en el backend, no se toca). Éxito → mismo flujo que login (el registro ya retorna token).

**`AuthContext`** (`lib/auth-context.tsx`): expone `{ user, permissions, isLoading, login(), logout() }`. Implementado con TanStack Query (`useQuery(['me'], ...)`, `staleTime: Infinity`, invalidado manualmente en login/logout) en vez de estado ad-hoc, para reusar cache/loading states.

**Logout:** limpia `localStorage`, invalida query `['me']`, redirige a `/login`.

## 7. Layout protegido

`(dashboard)/layout.tsx` (client component):
- En mount, si no hay token en localStorage → redirige a `/login` inmediatamente.
- Mientras `useAuth()` está cargando → skeleton (evita flash de contenido protegido).
- Si carga bien → renderiza sidebar + topbar + `children`.

**Sidebar:** en esta fase, un solo item ("Dashboard"). Cada módulo futuro agrega su propio item, gateado por `usePermission(code)` — ej. el item de Créditos solo aparece si el usuario tiene `CREDIT_AUTHORIZE` o `CREDIT_RECEIVE_PAYMENT`. No se agregan links a páginas que no existen todavía.

**Topbar:** nombre del negocio (tenant), nombre del usuario, botón de logout.

**`usePermission(code: PermissionCode): boolean`:** lee `permissions` del `AuthContext`, retorna `permissions.includes(code)`. Mismo criterio que gatea `@PreAuthorize` en el backend — el frontend espeja esa decisión, no la reinventa.

**`/dashboard`:** página placeholder — "Bienvenido, {user.name}" y nada más. Datos reales (ventas del día, cajas abiertas, stock bajo, créditos pendientes) son Fase 2, tanto en backend como en frontend.

## 8. Manejo de errores

- Errores de mutación/query: `toast.error(error.response?.data?.error ?? 'Error inesperado')` vía `sonner` — el mensaje ya viene en español desde el backend (`ApiResponse.error`), no se reescribe.
- Validación de formulario: zod schema espejando las constraints del backend (`@NotBlank`, `@Size`, etc.) — validación optimista client-side, el backend sigue siendo la fuente de verdad.
- 401: manejado globalmente en el interceptor (§5) — limpia sesión, redirige a login con mensaje de sesión expirada.
- 403: toast de error puntual, sin redirigir — la sesión sigue siendo válida, solo esa acción específica no está permitida.

## 9. Testing

Playwright E2E (`apps/web/e2e/`):
- `auth.spec.ts`: registro de tenant → login automático → ve `/dashboard` con su nombre → logout → vuelve a `/login`.
- `auth-guard.spec.ts`: navegar directo a `/dashboard` sin sesión → redirige a `/login`.

Sin unit tests de componentes en esta fase (ver §2, fuera de alcance).

## 10. Riesgos y notas

- **El fix de Customer toca un módulo ya mergeado.** Se hace como su propio commit chico antes de arrancar el frontend, con su propio test run completo del backend (no solo `CustomerIntegrationTest`) para confirmar que no rompe nada en `Sale`/`Credit` (ambos referencian `customerId`, no el shape de `Customer` en sí, así que el riesgo real es bajo).
- **`GET /api/auth/me` no requiere nueva lógica de permisos** — es una capa delgada sobre `PermissionResolutionService.resolveAll()`, que ya tiene su propio test (`PermissionResolutionServiceTest`). El riesgo es solo de exposición (nuevo endpoint, nuevo DTO de respuesta).
- **localStorage para el token** (no httpOnly cookie) — mismo patrón que TallerFacilRD, aceptado ahí, se mantiene por consistencia. No es parte del alcance de este módulo reabrir esa decisión.
- **Sin refresh token** — el JWT actual no tiene mecanismo de refresh (confirmado en el backend existente); al expirar, el 401 global fuerza un nuevo login. Aceptable para el MVP, señalado como posible mejora futura, no bloqueante.
