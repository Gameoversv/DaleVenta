# Branches/Registers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Note for this run:** executed inline in the current session by the controller directly (no subagent dispatch), per standing user instruction. TDD discipline and per-task verification still apply exactly as written below.

**Goal:** Add `PUT /api/branches/{id}` and `PUT /api/registers/{id}` to the backend, then build a single `/branches` frontend screen — expandable branch cards showing their registers, with create/edit/deactivate for branches and create/edit for registers.

**Architecture:** Two small backend additions (`update` methods mirroring the existing `create`/`deactivate` patterns in `BranchService`/`RegisterService`), then frontend dialog components built on a new shared `Dialog` primitive (Radix, matching the established shadcn-style pattern from Frontend Foundation), assembled into one page.

**Tech Stack:** Java 21/Spring Boot 3.3.5 (backend), Next.js 16/React 19/TypeScript, TanStack Query, react-hook-form + zod, `@radix-ui/react-dialog` (already a dependency, unused until now), Playwright.

## Global Constraints

- Backend: never a bare `ResponseStatusException` — use `ResourceNotFoundException` (404). Every multi-word camelCase field needs `@JsonProperty` given the global `SNAKE_CASE` Jackson strategy (already followed by `CreateRegisterRequest.branchId`).
- Both new endpoints gated `@PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")`, matching `create`/`deactivate` on `BranchController`.
- Register name-only edit — no branch reassignment (explicit scope decision in the design spec, §2).
- No branch reactivation — no such backend endpoint exists, not part of this module.
- Deactivation confirmation uses a Radix `Dialog`, never `window.confirm`.
- Frontend error handling: `toast.error(err.response?.data?.error ?? 'mensaje generico')` in every mutation's `onError`, matching the pattern from Frontend Foundation's login/register pages — no per-status special-casing.
- Sidebar "Sucursales" nav item gated by `usePermission('SETTINGS_MANAGE')` (`@/hooks/usePermission`, from Frontend Foundation).
- TanStack Query keys: `['branches']` for the branch list, `['registers', branchId]` per expanded branch — lazy, only fetched when a branch card is expanded.

---

### Task 1: Backend — `PUT /api/branches/{id}` + fix `deactivate`'s bare exception

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/branch/dto/UpdateBranchRequest.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/branch/service/BranchService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/branch/web/BranchController.java`
- Test: `apps/api/src/test/java/rd/dalventa/api/branch/BranchIntegrationTest.java`

**Interfaces:**
- Consumes: `BranchRepository` (existing, no new methods needed — `findById` + tenant filter, same as `deactivate` already does).
- Produces: `BranchService.update(UUID id, UpdateBranchRequest req) : BranchResponse` — no other task depends on this Java signature (frontend only calls the HTTP endpoint).

- [ ] **Step 1: Write the failing tests**

Add to `BranchIntegrationTest.java` (same file, alongside the existing tests):

```java
    @Test
    void updateBranch_asAdmin_persistsChanges() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/branches/" + branchId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Renombrada\",\"address\":\"Nueva Direccion\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Sucursal Renombrada"))
                .andExpect(jsonPath("$.data.address").value("Nueva Direccion"));
    }

    @Test
    void updateBranch_forBranchOfOtherTenant_returnsNotFound() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/branches/" + branchId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"name\":\"Hackeada\",\"address\":\"X\"}"))
                .andExpect(status().isNotFound());
    }
```

Add `put` to the static imports at the top of the file:
```java
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
```

- [ ] **Step 2: Run to confirm compile/behavior failure**

```bash
cd apps/api
./mvnw test -Dtest=BranchIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error (no `PUT /api/branches/{id}` mapping exists yet).

- [ ] **Step 3: Create `UpdateBranchRequest`**

```java
package rd.dalventa.api.branch.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateBranchRequest(
        @NotBlank String name,
        String address
) {}
```

- [ ] **Step 4: Add `update` to `BranchService`, fix the bare exception in `deactivate`**

Replace the full contents of `apps/api/src/main/java/rd/dalventa/api/branch/service/BranchService.java`:

```java
package rd.dalventa.api.branch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.branch.domain.Branch;
import rd.dalventa.api.branch.dto.BranchResponse;
import rd.dalventa.api.branch.dto.CreateBranchRequest;
import rd.dalventa.api.branch.dto.UpdateBranchRequest;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;

    @Transactional
    public BranchResponse create(CreateBranchRequest req) {
        var branch = new Branch(req.name(), req.address());
        branch.setTenantId(TenantContext.require());
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> list() {
        return branchRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(BranchResponse::from).toList();
    }

    @Transactional
    public BranchResponse update(UUID id, UpdateBranchRequest req) {
        var branch = findOwnedBranch(id);
        branch.setName(req.name());
        branch.setAddress(req.address());
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public void deactivate(UUID id) {
        var branch = findOwnedBranch(id);
        branch.deactivate();
        branchRepository.save(branch);
    }

    private Branch findOwnedBranch(UUID id) {
        var tenantId = TenantContext.require();
        return branchRepository.findById(id)
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada"));
    }
}
```

- [ ] **Step 5: Add the endpoint to `BranchController`**

Add these imports: `org.springframework.web.bind.annotation.PutMapping`, `rd.dalventa.api.branch.dto.UpdateBranchRequest`.

Add this method to the class (after `create`):
```java
    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<BranchResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateBranchRequest req) {
        return ApiResponse.ok(branchService.update(id, req));
    }
```

- [ ] **Step 6: Run the tests to confirm they pass**

```bash
./mvnw test -Dtest=BranchIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 5, Failures: 0, Errors: 0` (3 existing + 2 new).

- [ ] **Step 7: Run the full backend suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `Tests run: 92, Failures: 0, Errors: 0` (90 + 2).

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat: add PUT /api/branches/{id}, fix bare ResponseStatusException in deactivate"
```

---

### Task 2: Backend — `PUT /api/registers/{id}`

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/register/dto/UpdateRegisterRequest.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/register/dto/RegisterResponse.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/register/service/RegisterService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/register/web/RegisterController.java`
- Test: `apps/api/src/test/java/rd/dalventa/api/register/RegisterIntegrationTest.java`

**Interfaces:**
- Consumes: `RegisterRepository.findByIdAndTenantId(UUID, UUID) : Optional<Register>` (already exists).
- Produces: `RegisterService.update(UUID id, UpdateRegisterRequest req) : RegisterResponse`. `RegisterResponse.branchId` now serializes as JSON key `"branchId"` (was silently `"branch_id"` before this task — never caught because no existing test asserted that field's JSON key). The frontend's `RegisterResponse` type (`@/types/branch`, Task 3) assumes the fixed `branchId` key.

**Note on a pre-existing bug found during this plan's self-review:** `RegisterResponse` has no `@JsonProperty` on `branchId`, so under the global `SNAKE_CASE` Jackson strategy it silently serializes as `branch_id` today. This step fixes it while the file is already being touched for this task — same precedent as Task 1's `deactivate` exception fix.

- [ ] **Step 1: Write the failing tests**

Add to `RegisterIntegrationTest.java`:

```java
    @Test
    void updateRegister_asAdmin_persistsNewName() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        String registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/registers/" + registerId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja Principal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Caja Principal"))
                .andExpect(jsonPath("$.data.branchId").value(branchId));
    }

    @Test
    void updateRegister_forRegisterOfOtherTenant_returnsNotFound() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        String registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/registers/" + registerId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"name\":\"Hackeada\"}"))
                .andExpect(status().isNotFound());
    }
```

Add `put` to the static imports:
```java
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
```

- [ ] **Step 2: Run to confirm compile/behavior failure**

```bash
./mvnw test -Dtest=RegisterIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Create `UpdateRegisterRequest`**

```java
package rd.dalventa.api.register.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateRegisterRequest(
        @NotBlank String name
) {}
```

- [ ] **Step 4: Fix `RegisterResponse.branchId` to serialize as `branchId`, not `branch_id`**

Replace the full contents of `apps/api/src/main/java/rd/dalventa/api/register/dto/RegisterResponse.java`:

```java
package rd.dalventa.api.register.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.register.domain.Register;

import java.util.UUID;

public record RegisterResponse(
        UUID id,
        String name,
        @JsonProperty("branchId") UUID branchId,
        boolean active
) {
    public static RegisterResponse from(Register r) {
        return new RegisterResponse(r.getId(), r.getName(), r.getBranchId(), r.isActive());
    }
}
```

- [ ] **Step 5: Add `update` to `RegisterService`**

Add this method to the existing class:
```java
    @Transactional
    public RegisterResponse update(UUID id, UpdateRegisterRequest req) {
        var tenantId = TenantContext.require();
        var register = registerRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));
        register.setName(req.name());
        return RegisterResponse.from(registerRepository.save(register));
    }
```

Add the import: `rd.dalventa.api.register.dto.UpdateRegisterRequest`.

- [ ] **Step 6: Add the endpoint to `RegisterController`**

Add these imports: `org.springframework.security.access.prepost.PreAuthorize`, `rd.dalventa.api.register.dto.UpdateRegisterRequest`.

Add this method (after `create`):
```java
    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<RegisterResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateRegisterRequest req) {
        return ApiResponse.ok(registerService.update(id, req));
    }
```

- [ ] **Step 7: Run the tests to confirm they pass**

```bash
./mvnw test -Dtest=RegisterIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 5, Failures: 0, Errors: 0` (3 existing + 2 new).

- [ ] **Step 8: Run the full backend suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `Tests run: 94, Failures: 0, Errors: 0` (92 + 2).

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat: add PUT /api/registers/{id}, fix RegisterResponse.branchId JSON key"
```

---

### Task 3: Frontend — dialog primitive, types, and form dialogs

**Files:**
- Create: `apps/web/src/components/ui/dialog.tsx`
- Create: `apps/web/src/types/branch.ts`
- Create: `apps/web/src/components/branches/BranchFormDialog.tsx`
- Create: `apps/web/src/components/branches/DeactivateBranchDialog.tsx`
- Create: `apps/web/src/components/branches/RegisterFormDialog.tsx`

**Interfaces:**
- Consumes: `Button`/`Input`/`Label` (`@/components/ui/*`, Frontend Foundation), `api` (`@/lib/api`, Frontend Foundation).
- Produces: `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`/`DialogTrigger` (`@/components/ui/dialog`); `BranchResponse`, `RegisterResponse` types (`@/types/branch`) — Task 4 imports all of these. `BranchFormDialog({ branch?, trigger }) `, `DeactivateBranchDialog({ branch, trigger })`, `RegisterFormDialog({ branchId, register?, trigger })` — each accepts an optional existing entity (edit mode) or none (create mode), and a `trigger: React.ReactNode` rendered inside `DialogTrigger asChild`. Each dialog manages its own open/close state internally and invalidates the relevant query on success.

- [ ] **Step 1: `src/components/ui/dialog.tsx`**

```tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-background p-6 shadow-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export { Dialog, DialogTrigger, DialogPortal, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle };
```

- [ ] **Step 2: `src/types/branch.ts`**

```typescript
export interface BranchResponse {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  createdAt: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  branchId: string;
  active: boolean;
}

export interface CreateBranchRequest {
  name: string;
  address: string;
}

export interface UpdateBranchRequest {
  name: string;
  address: string;
}

export interface CreateRegisterRequest {
  name: string;
  branchId: string;
}

export interface UpdateRegisterRequest {
  name: string;
}
```

- [ ] **Step 3: `src/components/branches/BranchFormDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { BranchResponse } from "@/types/branch";

const branchSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  address: z.string().optional(),
});
type BranchForm = z.infer<typeof branchSchema>;

interface BranchFormDialogProps {
  branch?: BranchResponse;
  trigger: React.ReactNode;
}

export function BranchFormDialog({ branch, trigger }: BranchFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!branch;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: branch?.name ?? "", address: branch?.address ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: BranchForm) =>
      isEdit
        ? api.put(`/api/branches/${branch!.id}`, values)
        : api.post("/api/branches", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al guardar";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Nombre</Label>
            <Input id="branch-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-address">Direccion</Label>
            <Input id="branch-address" {...register("address")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Note: `DialogFooter` must be imported too — add it to the `@/components/ui/dialog` import line above (`import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";`).

- [ ] **Step 4: `src/components/branches/DeactivateBranchDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { BranchResponse } from "@/types/branch";

interface DeactivateBranchDialogProps {
  branch: BranchResponse;
  trigger: React.ReactNode;
}

export function DeactivateBranchDialog({ branch, trigger }: DeactivateBranchDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/api/branches/${branch.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al desactivar";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desactivar {branch.name}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Esta sucursal dejara de aparecer en la lista. Esta accion no se puede deshacer desde aqui.
        </p>
        <DialogFooter>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Desactivando..." : "Confirmar desactivacion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: `src/components/branches/RegisterFormDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { RegisterResponse } from "@/types/branch";

const registerFormSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
});
type RegisterFormValues = z.infer<typeof registerFormSchema>;

interface RegisterFormDialogProps {
  branchId: string;
  register?: RegisterResponse;
  trigger: React.ReactNode;
}

export function RegisterFormDialog({ branchId, register: existingRegister, trigger }: RegisterFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!existingRegister;

  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: existingRegister?.name ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      isEdit
        ? api.put(`/api/registers/${existingRegister!.id}`, values)
        : api.post("/api/registers", { name: values.name, branchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registers", branchId] });
      setOpen(false);
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al guardar";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar caja" : "Nueva caja"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">Nombre</Label>
            <Input id="register-name" {...registerField("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Verify the build**

```bash
cd apps/web
npm run build
```
Expected: build succeeds (these components aren't used anywhere yet, but TypeScript must compile clean).

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: add dialog primitive and branch/register form dialogs"
```

---

### Task 4: Frontend — `/branches` page, `BranchCard`, sidebar nav

**Files:**
- Create: `apps/web/src/components/branches/BranchCard.tsx`
- Create: `apps/web/src/app/(dashboard)/branches/page.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `BranchFormDialog`/`DeactivateBranchDialog`/`RegisterFormDialog` (Task 3), `BranchResponse`/`RegisterResponse` (`@/types/branch`, Task 3), `usePermission` (`@/hooks/usePermission`, Frontend Foundation).

- [ ] **Step 1: `src/components/branches/BranchCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus, Power } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { BranchFormDialog } from "./BranchFormDialog";
import { DeactivateBranchDialog } from "./DeactivateBranchDialog";
import { RegisterFormDialog } from "./RegisterFormDialog";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

async function fetchRegisters(branchId: string): Promise<RegisterResponse[]> {
  const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId } });
  return res.data.data;
}

export function BranchCard({ branch }: { branch: BranchResponse }) {
  const [expanded, setExpanded] = useState(false);

  const { data: registers, isLoading } = useQuery({
    queryKey: ["registers", branch.id],
    queryFn: () => fetchRegisters(branch.id),
    enabled: expanded,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <p className="font-semibold">{branch.name}</p>
            {branch.address && <p className="text-sm text-muted-foreground">{branch.address}</p>}
          </div>
        </button>
        <div className="flex items-center gap-2">
          <BranchFormDialog
            branch={branch}
            trigger={
              <Button variant="outline" size="icon" aria-label="Editar sucursal">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <DeactivateBranchDialog
            branch={branch}
            trigger={
              <Button variant="outline" size="icon" aria-label="Desactivar sucursal">
                <Power className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando cajas...</p>}
          {registers && registers.length === 0 && (
            <p className="text-sm text-muted-foreground">Esta sucursal no tiene cajas todavia.</p>
          )}
          {registers && registers.length > 0 && (
            <ul className="space-y-2">
              {registers.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm">{r.name}</span>
                  <RegisterFormDialog
                    branchId={branch.id}
                    register={r}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Editar ${r.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          <RegisterFormDialog
            branchId={branch.id}
            trigger={
              <Button variant="secondary" size="sm" className="mt-3">
                <Plus className="h-4 w-4" />
                Nueva caja
              </Button>
            }
          />
        </CardContent>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: `src/app/(dashboard)/branches/page.tsx`**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { BranchCard } from "@/components/branches/BranchCard";
import { BranchFormDialog } from "@/components/branches/BranchFormDialog";
import type { BranchResponse } from "@/types/branch";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

export default function BranchesPage() {
  const { data: branches, isLoading } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sucursales</h1>
        <BranchFormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Nueva sucursal
            </Button>
          }
        />
      </div>
      {isLoading && <p className="text-muted-foreground">Cargando sucursales...</p>}
      {branches && branches.length === 0 && (
        <p className="text-muted-foreground">No hay sucursales todavia. Crea la primera.</p>
      )}
      <div className="space-y-3">
        {branches?.map((branch) => (
          <BranchCard key={branch.id} branch={branch} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add "Sucursales" to the sidebar, gated by `SETTINGS_MANAGE`**

Replace the full contents of `src/components/layout/Sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionCode } from "@/types/auth";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionCode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/branches", label: "Sucursales", icon: Building2, permission: "SETTINGS_MANAGE" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
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
}

function GatedNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const allowed = usePermission(item.permission!);
  if (!allowed) return null;
  return <NavLink item={item} active={active} />;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
      <nav className="flex flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) =>
          item.permission ? (
            <GatedNavLink key={item.href} item={item} active={pathname === item.href} />
          ) : (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          )
        )}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Verify the build**

```bash
cd apps/web
npm run build
```
Expected: build succeeds, `/branches` route listed in the output.

- [ ] **Step 5: Manual smoke check**

Start the backend (`cd apps/api && ./mvnw spring-boot:run -Dspring-boot.run.profiles=test`, real Postgres via the `dalventa_test` container) and the frontend (`npm run dev` in `apps/web`). Log in as a freshly registered tenant admin (registration grants `SETTINGS_MANAGE` by default — same assumption the design's E2E test in Task 5 relies on). Confirm: "Sucursales" appears in the sidebar; `/branches` lists an empty state; creating a branch shows it in the list; expanding it shows "no tiene cajas todavia"; creating a register shows it in the expanded list; editing both branch and register persists; deactivating a branch removes it from the list.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat: add /branches page with expandable branch cards and register management"
```

---

### Task 5: Playwright E2E test

**Files:**
- Create: `apps/web/e2e/branches.spec.ts`

**Interfaces:**
- Consumes: the running Next.js dev server and backend (same convention as Frontend Foundation's `auth.spec.ts` — no mocking, hits the real API).

- [ ] **Step 1: `e2e/branches.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("crear, editar caja, y desactivar sucursal", async ({ page }) => {
  const uniqueEmail = `e2e-branches-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Branches E2E");
  await page.getByLabel("Tu nombre").fill("Admin Branches");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Sucursales" }).click();
  await expect(page).toHaveURL(/\/branches/);

  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro");
  await page.getByLabel("Direccion").fill("Calle Duarte 12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro")).toBeVisible();

  await page.getByRole("button", { name: "Editar sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro Renombrada");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro Renombrada")).toBeVisible();

  await page.getByText("Sucursal Centro Renombrada").click();
  await page.getByRole("button", { name: "Nueva caja" }).click();
  await page.getByLabel("Nombre").fill("Caja 1");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja 1")).toBeVisible();

  await page.getByRole("button", { name: "Editar Caja 1" }).click();
  await page.getByLabel("Nombre").fill("Caja Principal");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja Principal")).toBeVisible();

  await page.getByRole("button", { name: "Desactivar sucursal" }).click();
  await page.getByRole("button", { name: "Confirmar desactivacion" }).click();
  await expect(page.getByText("Sucursal Centro Renombrada")).not.toBeVisible();
});
```

- [ ] **Step 2: Run the E2E suite**

Backend must be running locally first (test profile, same as Frontend Foundation's Task 5).

```bash
cd apps/web
npm run test:e2e
```
Expected: 3 passed (this new spec plus the two from Frontend Foundation, since `playwright.config.ts` runs the whole `e2e/` directory).

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "test: add Playwright E2E coverage for Branches/Registers"
```

---

## What comes after this plan

Next modules, each its own spec→plan→build cycle: Products/Categories/Inventory screens, CashShift open/close + denomination counting UI, the POS/Sale screen, Credit/CuentasPorCobrar screens, and the real Dashboard (Fase 2).
