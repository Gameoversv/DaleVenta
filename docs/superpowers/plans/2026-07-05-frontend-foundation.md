# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Note for this run:** executed inline in the current session by the controller directly (no subagent dispatch), per standing user instruction. TDD discipline and per-task verification still apply exactly as written below.

**Goal:** Stand up the Next.js frontend foundation — scaffold, API client, auth (login + tenant registration), a permission-gated protected layout, and an empty dashboard placeholder — so every subsequent module (Branches, Products, CashShift, POS, Credit) has a working shell to build screens into.

**Architecture:** Two small backend prerequisite fixes (Customer DTO casing consistency, a new `GET /api/auth/me` endpoint), then a Next.js 16 App Router app (`apps/web`) mirroring the sibling TallerFacilRD project's stack and conventions: axios client with JWT interceptor, TanStack Query-backed `AuthContext`, shadcn-style UI primitives, a protected route group with guard+sidebar+topbar.

**Tech Stack:** Java 21/Spring Boot 3.3.5 (backend prerequisites) — Next.js 16, React 19, TypeScript, Tailwind 4, TanStack Query 5, react-hook-form + zod, axios, sonner, lucide-react, Playwright (E2E).

## Global Constraints

- Backend: never a bare `ResponseStatusException`; every response DTO `BigDecimal` needs `@JsonFormat(shape = STRING)` (not applicable this module — no money fields) and every multi-word camelCase field needs an explicit `@JsonProperty` given the global `SNAKE_CASE` Jackson strategy.
- Frontend TypeScript: `strict: true`, path alias `@/*` → `./src/*`, App Router only (no `pages/`).
- Frontend package versions pinned to match TallerFacilRD exactly: `next@16.2.9`, `react@19.2.4`, `react-dom@19.2.4`, `tailwindcss@^4`, `@tanstack/react-query@^5.101.1`, `axios@^1.18.1`, `react-hook-form@^7.80.0`, `zod@^4.4.3`, `@hookform/resolvers@^5.4.0`, `sonner@^2.0.7`, `lucide-react@^1.21.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.6.0`, `@radix-ui/react-dialog@^1.1.17`, `@radix-ui/react-dropdown-menu@^2.1.18`, `@radix-ui/react-label@^2.1.10`, `@radix-ui/react-slot@^1.3.0`.
- Token stored in `localStorage` under key `token` (matches TallerFacilRD, accepted tradeoff — not httpOnly cookie).
- No case-conversion layer in the API client — every backend DTO is camelCase after Task 1, so the frontend sends/receives plain camelCase JSON everywhere except `/api/tenants/register`, which is documented as a deliberate native-snake_case exception (its DTO has no `@JsonProperty` overrides and this plan does not add any).
- Visual direction: neutral/standard SaaS look (light theme, zinc/slate neutral palette) — not TallerFacilRD's dark automotive theme.
- No stub pages for future modules — sidebar has exactly one item ("Dashboard") until the next module's plan adds its own.

---

### Task 1: Backend — Customer DTO camelCase consistency

**Files:**
- Modify: `apps/api/src/main/java/rd/dalventa/api/customer/dto/CreateCustomerRequest.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/customer/dto/UpdateCustomerRequest.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/customer/dto/CustomerResponse.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/customer/CustomerIntegrationTest.java`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Customer` JSON now uses `firstName`/`lastName`/`fullName`/`documentId`/`createdAt` keys instead of snake_case — every later frontend task assumes this.

- [ ] **Step 1: Update the test assertions to the new (target) camelCase keys first**

In `apps/api/src/test/java/rd/dalventa/api/customer/CustomerIntegrationTest.java`, change:

```java
                .andExpect(jsonPath("$.data.full_name").value("Juan Perez"))
                .andExpect(jsonPath("$.data.document_id").value("00100100100"));
```
to:
```java
                .andExpect(jsonPath("$.data.fullName").value("Juan Perez"))
                .andExpect(jsonPath("$.data.documentId").value("00100100100"));
```

Change:
```java
                .andExpect(jsonPath("$.data[0].last_name").value("Lopez"));
```
to:
```java
                .andExpect(jsonPath("$.data[0].lastName").value("Lopez"));
```

Change:
```java
                .andExpect(jsonPath("$.data.first_name").value("Ana"));
```
to:
```java
                .andExpect(jsonPath("$.data.firstName").value("Ana"));
```

- [ ] **Step 2: Run the test to confirm it now fails against the current (snake_case) DTOs**

```bash
cd apps/api
./mvnw test -Dtest=CustomerIntegrationTest -Dspring.profiles.active=test
```
Expected: 3 failures (`fullName`/`documentId`/`lastName`/`firstName` not found — actual keys are still `full_name` etc.).

- [ ] **Step 3: Add `@JsonProperty` overrides to `CreateCustomerRequest`**

```java
package rd.dalventa.api.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCustomerRequest(
        @JsonProperty("firstName") @NotBlank @Size(max = 100) String firstName,
        @JsonProperty("lastName") @NotBlank @Size(max = 100) String lastName,
        @Size(max = 20) String phone,
        @Size(max = 20) String whatsapp,
        @Size(max = 255) String email,
        String address,
        @JsonProperty("documentId") @Size(max = 20) String documentId
) {}
```

- [ ] **Step 4: Add `@JsonProperty` overrides to `UpdateCustomerRequest`**

```java
package rd.dalventa.api.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

public record UpdateCustomerRequest(
        @JsonProperty("firstName") @Size(max = 100) String firstName,
        @JsonProperty("lastName") @Size(max = 100) String lastName,
        @Size(max = 20) String phone,
        @Size(max = 20) String whatsapp,
        @Size(max = 255) String email,
        String address,
        @JsonProperty("documentId") @Size(max = 20) String documentId
) {}
```

- [ ] **Step 5: Add `@JsonProperty` overrides to `CustomerResponse`**

```java
package rd.dalventa.api.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.customer.domain.Customer;

import java.time.Instant;
import java.util.UUID;

public record CustomerResponse(
        UUID id,
        @JsonProperty("firstName") String firstName,
        @JsonProperty("lastName") String lastName,
        @JsonProperty("fullName") String fullName,
        String phone,
        String whatsapp,
        String email,
        String address,
        @JsonProperty("documentId") String documentId,
        boolean active,
        @JsonProperty("createdAt") Instant createdAt
) {
    public static CustomerResponse from(Customer c) {
        return new CustomerResponse(
                c.getId(),
                c.getFirstName(),
                c.getLastName(),
                c.getFirstName() + " " + c.getLastName(),
                c.getPhone(),
                c.getWhatsapp(),
                c.getEmail(),
                c.getAddress(),
                c.getDocumentId(),
                c.isActive(),
                c.getCreatedAt()
        );
    }
}
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CustomerIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 8, Failures: 0, Errors: 0`.

- [ ] **Step 7: Run the full backend suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `Tests run: 88, Failures: 0, Errors: 0` (same 88 as before — `Sale`/`Credit` reference `customerId` only, never the `Customer` JSON shape, so nothing else is affected).

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "fix: make Customer DTOs use camelCase JSON consistently with the rest of the API"
```

---

### Task 2: Backend — `GET /api/auth/me`

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/auth/dto/MeResponse.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/auth/web/AuthController.java`
- Test: `apps/api/src/test/java/rd/dalventa/api/auth/AuthMeIntegrationTest.java`

**Interfaces:**
- Consumes: `PermissionResolutionService.resolveAll(User) : Set<PermissionCode>` (existing, unmodified), `CurrentUserProvider.current() : Optional<User>` (existing).
- Produces: `GET /api/auth/me` → `ApiResponse<MeResponse>` where `MeResponse(UserResponse user, List<PermissionCode> permissions)` — every frontend task in this plan depends on this exact shape.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthMeIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void me_withValidToken_returnsUserAndPermissions() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.email").value("admin@dalventa.test"))
                .andExpect(jsonPath("$.data.permissions").isArray())
                .andExpect(jsonPath("$.data.permissions", org.hamcrest.Matchers.hasItem("USERS_MANAGE")));
    }

    @Test
    void me_withoutToken_returnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=AuthMeIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error (`/api/auth/me` doesn't exist).

- [ ] **Step 3: Create `MeResponse`**

```java
package rd.dalventa.api.auth.dto;

import rd.dalventa.api.permission.domain.PermissionCode;

import java.util.List;

public record MeResponse(UserResponse user, List<PermissionCode> permissions) {}
```

- [ ] **Step 4: Add the `/me` endpoint to `AuthController`**

Add these imports to `AuthController.java`: `org.springframework.web.bind.annotation.GetMapping`, `rd.dalventa.api.auth.dto.MeResponse`, `rd.dalventa.api.permission.service.PermissionResolutionService`, `rd.dalventa.api.shared.security.CurrentUserProvider`.

Add these two fields to the constructor-injected list:
```java
    private final PermissionResolutionService permissionResolutionService;
    private final CurrentUserProvider currentUserProvider;
```

Add this method to the class:
```java
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MeResponse>> me() {
        var user = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"));
        var permissions = permissionResolutionService.resolveAll(user).stream().toList();
        return ResponseEntity.ok(ApiResponse.ok(new MeResponse(UserResponse.from(user), permissions)));
    }
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=AuthMeIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 6: Run the full backend suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `Tests run: 90, Failures: 0, Errors: 0` (88 + 2 new).

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat: add GET /api/auth/me returning current user and effective permissions"
```

---

### Task 3: Frontend scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/.gitignore`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/label.tsx`
- Create: `apps/web/src/components/ui/card.tsx`

**Interfaces:**
- Produces: `cn(...)` utility (`@/lib/utils`), `api` axios instance (`@/lib/api`, default export), UI primitives `Button`/`Input`/`Label`/`Card`/`CardHeader`/`CardTitle`/`CardContent` (`@/components/ui/*`) — every later task in this plan imports these exact names.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.4.0",
    "@radix-ui/react-dialog": "^1.1.17",
    "@radix-ui/react-dropdown-menu": "^2.1.18",
    "@radix-ui/react-label": "^2.1.10",
    "@radix-ui/react-slot": "^1.3.0",
    "@tanstack/react-query": "^5.101.1",
    "axios": "^1.18.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.21.0",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.80.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: `postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: `eslint.config.mjs`**

```javascript
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];

export default eslintConfig;
```

- [ ] **Step 6: `.gitignore`**

```
node_modules
.next
out
.env*.local
*.tsbuildinfo
next-env.d.ts
test-results
playwright-report
```

- [ ] **Step 7: `src/app/globals.css`** — neutral light SaaS palette (zinc/slate)

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  color-scheme: light;

  --background: #ffffff;
  --foreground: #18181b;

  --card: #ffffff;
  --card-foreground: #18181b;

  --popover: #ffffff;
  --popover-foreground: #18181b;

  --primary: #18181b;
  --primary-foreground: #fafafa;

  --secondary: #f4f4f5;
  --secondary-foreground: #18181b;

  --muted: #f4f4f5;
  --muted-foreground: #71717a;

  --accent: #f4f4f5;
  --accent-foreground: #18181b;

  --destructive: #ef4444;
  --destructive-foreground: #fafafa;

  --border: #e4e4e7;
  --input: #e4e4e7;
  --ring: #a1a1aa;

  --sidebar: #fafafa;
  --sidebar-foreground: #3f3f46;
  --sidebar-accent: #f0f0f1;
  --sidebar-border: #e4e4e7;

  --radius: 0.5rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-border: var(--sidebar-border);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] **Step 8: `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DaleVenta",
  description: "Punto de venta y gestion comercial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: `src/app/page.tsx`** — root redirect to login

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
```

- [ ] **Step 10: `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 11: `src/lib/api.ts`**

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthEndpoint = error.config?.url?.includes("/api/auth/");
    if (status === 401 && !isAuthEndpoint && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login?expired=1";
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 12: `src/components/ui/button.tsx`**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 13: `src/components/ui/input.tsx`**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 14: `src/components/ui/label.tsx`**

```tsx
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

- [ ] **Step 15: `src/components/ui/card.tsx`**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

- [ ] **Step 16: Install dependencies and verify the build**

```bash
cd apps/web
npm install
npm run build
```
Expected: build succeeds (root `/` redirects to `/login`, which 404s for now — that's expected, Task 4 adds it).

- [ ] **Step 17: Commit**

```bash
git add apps/web
git commit -m "chore: scaffold Next.js frontend foundation"
```

---

### Task 4: Auth + protected layout + dashboard

**Files:**
- Create: `apps/web/src/types/auth.ts`
- Create: `apps/web/src/lib/auth-context.tsx`
- Create: `apps/web/src/hooks/usePermission.ts`
- Create: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/register/page.tsx`
- Create: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/components/layout/Topbar.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `api` (`@/lib/api`, Task 3), `Button`/`Input`/`Label`/`Card*` (`@/components/ui/*`, Task 3), backend `POST /api/auth/login`, `POST /api/tenants/register`, `GET /api/auth/me` (Task 2).
- Produces: `useAuth() : { user, permissions, isLoading, login(email, password), logout() }` (`@/lib/auth-context`), `usePermission(code: PermissionCode) : boolean` (`@/hooks/usePermission`) — every later frontend module's plan imports these two.

- [ ] **Step 1: `src/types/auth.ts`**

```typescript
export type RoleName = "SUPER_ADMIN" | "ADMIN" | "CASHIER" | "CLIENT";

export type PermissionCode =
  | "INVENTORY_VIEW"
  | "INVENTORY_CREATE"
  | "INVENTORY_EDIT"
  | "INVENTORY_ADJUST"
  | "COST_VIEW"
  | "PRICE_VIEW"
  | "SALE_CREATE"
  | "SALE_DISCOUNT"
  | "SALE_PRICE_OVERRIDE"
  | "SALE_VOID"
  | "SALE_RETURN"
  | "CASHSHIFT_OPEN"
  | "CASHSHIFT_CLOSE"
  | "CASHSHIFT_VIEW_HISTORY"
  | "CUSTOMER_CREATE"
  | "CUSTOMER_EDIT"
  | "CREDIT_AUTHORIZE"
  | "CREDIT_RECEIVE_PAYMENT"
  | "REPORTS_VIEW"
  | "PROFIT_VIEW"
  | "USERS_MANAGE"
  | "SETTINGS_MANAGE";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  active: boolean;
}

export interface MeResponse {
  user: UserResponse;
  permissions: PermissionCode[];
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
```

- [ ] **Step 2: `src/app/providers.tsx`** — TanStack Query provider (client component wrapper)

```tsx
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

Note: `sonner`'s `Toaster` component is used directly, no wrapper needed beyond mounting it once at the root.

- [ ] **Step 3: `src/lib/auth-context.tsx`**

```tsx
"use client";

import { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { AuthResponse, MeResponse, PermissionCode, UserResponse } from "@/types/auth";

interface AuthContextValue {
  user: UserResponse | null;
  permissions: PermissionCode[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<MeResponse | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;
  const res = await api.get<{ data: MeResponse }>("/api/auth/me");
  return res.data.data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ data: AuthResponse }>("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.data.token);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/dashboard");
    },
    [queryClient, router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    queryClient.setQueryData(["me"], null);
    router.push("/login");
  }, [queryClient, router]);

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        permissions: data?.permissions ?? [],
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: `src/hooks/usePermission.ts`**

```typescript
import { useAuth } from "@/lib/auth-context";
import type { PermissionCode } from "@/types/auth";

export function usePermission(code: PermissionCode): boolean {
  const { permissions } = useAuth();
  return permissions.includes(code);
}
```

- [ ] **Step 5: Wire `Providers` into the root layout**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DaleVenta",
  description: "Punto de venta y gestion comercial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: `src/app/(auth)/login/page.tsx`**

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

const loginSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(1, "Contrasena requerida"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    try {
      await login(values.email, values.password);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al iniciar sesion";
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar sesion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No tienes cuenta?{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Registra tu negocio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: `src/app/(auth)/register/page.tsx`**

The honeypot field `website` must stay empty and hidden from real users (backend rejects the submission as spam if it's filled — see `HoneypotGuard`). It's rendered off-screen, not `display:none` or `type=hidden`, so that basic bots that only skip hidden inputs still get caught.

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { AuthResponse } from "@/types/auth";

const registerSchema = z.object({
  tenantName: z.string().min(1, "Nombre del negocio requerido"),
  adminName: z.string().min(1, "Tu nombre es requerido"),
  adminEmail: z.string().email("Correo invalido"),
  adminPassword: z.string().min(8, "Minimo 8 caracteres"),
  website: z.string().max(0).optional(),
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterForm) {
    try {
      const res = await api.post<{ data: AuthResponse }>("/api/tenants/register", {
        tenant_name: values.tenantName,
        admin_name: values.adminName,
        admin_email: values.adminEmail,
        admin_password: values.adminPassword,
        website: values.website ?? "",
      });
      localStorage.setItem("token", res.data.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al registrar";
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Registra tu negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nombre del negocio</Label>
              <Input id="tenantName" {...register("tenantName")} />
              {errors.tenantName && <p className="text-sm text-destructive">{errors.tenantName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Tu nombre</Label>
              <Input id="adminName" {...register("adminName")} />
              {errors.adminName && <p className="text-sm text-destructive">{errors.adminName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Correo</Label>
              <Input id="adminEmail" type="email" {...register("adminEmail")} />
              {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Contrasena</Label>
              <Input id="adminPassword" type="password" {...register("adminPassword")} />
              {errors.adminPassword && <p className="text-sm text-destructive">{errors.adminPassword.message}</p>}
            </div>
            <div className="absolute left-[-9999px]" aria-hidden="true">
              <Label htmlFor="website">No llenar</Label>
              <Input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Inicia sesion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: `src/components/layout/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
      <nav className="flex flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent",
                active && "bg-sidebar-accent text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 9: `src/components/layout/Topbar.tsx`**

```tsx
"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <span className="font-semibold">DaleVenta</span>
      <div className="flex items-center gap-3">
        {user && <span className="text-sm text-muted-foreground">{user.name}</span>}
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Cerrar sesion">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 10: `src/app/(dashboard)/layout.tsx`** — the guard

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const hasToken = typeof window !== "undefined" && localStorage.getItem("token");
    if (!hasToken) {
      router.replace("/login");
      return;
    }
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: `src/app/(dashboard)/dashboard/page.tsx`**

```tsx
"use client";

import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bienvenido, {user?.name}</h1>
    </div>
  );
}
```

- [ ] **Step 12: Verify manually**

```bash
cd apps/web
npm run build
```
Expected: build succeeds with no type errors. Then start the backend (`cd ../api && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` or however it's normally run locally) and the frontend (`npm run dev` in `apps/web`), and manually confirm: `/register` creates a tenant and lands on `/dashboard` showing "Bienvenido, {name}"; `/dashboard` visited directly in a fresh incognito window (no token) redirects to `/login`; the logout button returns to `/login`.

- [ ] **Step 13: Commit**

```bash
git add apps/web
git commit -m "feat: add auth pages, protected layout, and dashboard placeholder"
```

---

### Task 5: Playwright E2E tests

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/auth.spec.ts`
- Create: `apps/web/e2e/auth-guard.spec.ts`

**Interfaces:**
- Consumes: the running Next.js dev server (Playwright's `webServer` config starts it) and the running backend (must be started separately — see Step 4's note).

- [ ] **Step 1: `playwright.config.ts`**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
```

- [ ] **Step 2: `e2e/auth.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("registro de tenant -> login automatico -> dashboard -> logout", async ({ page }) => {
  const uniqueEmail = `e2e-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria E2E");
  await page.getByLabel("Tu nombre").fill("Admin E2E");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Bienvenido, Admin E2E")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 3: `e2e/auth-guard.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("acceder a /dashboard sin sesion redirige a /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 4: Run the E2E suite**

The backend must be running locally first (`cd apps/api && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`, or the project's normal local-run command, listening on `http://localhost:8080`), since these tests hit the real API — no mocking, per this project's established "integration test against the real stack" convention (mirrors the backend's own `IntegrationTestBase` philosophy of testing against a real Postgres, not mocks).

```bash
cd apps/web
npx playwright install --with-deps chromium
npm run test:e2e
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "test: add Playwright E2E coverage for auth flow and route guard"
```

---

## What comes after this plan

Foundation is now in place. Next modules, each its own spec→plan→build cycle: Branches/Registers management screens, Products/Categories/Inventory screens, CashShift open/close + denomination counting UI, the POS/Sale screen (highest-value, most complex), Credit/CuentasPorCobrar screens (profile, abonos, history), and finally a real Dashboard with actual metrics (Fase 2, matches backend Fase 2 scope).
