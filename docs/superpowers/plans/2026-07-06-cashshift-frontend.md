# CashShift (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a state-driven `/cash-shift` screen (no-shift → open → summary/movements → close → final summary) plus the one missing backend endpoint it needs (`GET /api/cash-shifts/current`), so a cashier can run an entire cash-shift lifecycle from the UI.

**Architecture:** One new backend read endpoint on the existing `CashShiftController`/`CashShiftService` (reuses `CashShiftRepository.findByRegisterIdAndStatus`, already used internally by `open()`). One new frontend feature directory `components/cash-shift/` with a state-machine root component (`CashShiftWorkspace`) that swaps between four child views based on query state + local transitional state, plus a shared `DenominationCountGrid` reused by all three denomination-count forms (open, movement, close). Follows the exact patterns already established by `/inventory` and `/branches` (query keys, axios error unwrapping, react-hook-form + zod, shadcn-style primitives).

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Data JPA (backend); Next.js 16 (App Router), React 19, TanStack Query v5, react-hook-form + zod, axios, Tailwind v4, Playwright (frontend).

## Global Constraints

- Jackson: `application.yml` sets `spring.jackson.property-naming-strategy: SNAKE_CASE` globally — every multi-word camelCase field in any request/response DTO needs `@JsonProperty("exactCamelCaseName")`.
- Never throw a bare `org.springframework.web.server.ResponseStatusException`. Use `rd.dalventa.api.shared.web.ResourceNotFoundException` (404) — the project's `GlobalExceptionHandler` catch-all intercepts the bare one and turns it into a 500.
- Money: `BigDecimal` end to end in Java, serialized as JSON strings (`@JsonFormat(shape = JsonFormat.Shape.STRING)`) — frontend types model these fields as `string`, never `number`.
- `branchId`/`registerId` scoping and 404-for-other-tenant already established — reuse `registerRepository.findByIdAndTenantId` before touching `CashShiftRepository`, same as `CashShiftService.open()` does.
- Frontend query keys (must match exactly, they are shared/invalidated across components): `["branches"]`, `["registers", branchId]`, `["denominations"]`, `["cash-shift-current", registerId]`.
- Frontend error toasts: `toast.error(err.response?.data?.error ?? "<mensaje generico>")` — same pattern as `AdjustStockDialog`/`ProductFormDialog`.
- `DenominationCountEntry.quantity` is `@Positive` on the backend in all three request shapes (open, movement, close) — the frontend must never send an entry with `quantity: 0`; filter those out before calling `onChange`.
- No new UI primitives — reuse `Button`, `Card`/`CardHeader`/`CardTitle`/`CardContent`, `Dialog*`, `Input`, `Label` from `apps/web/src/components/ui/`. A single multi-line `<textarea>` (closing notes) is styled inline with the same classes `Input` uses — not worth a new primitive for one usage.
- No frontend unit test framework in this project (only Playwright E2E, `apps/web/e2e/*.spec.ts`, run via `npm run test:e2e` from `apps/web`) — frontend tasks are verified by `npx tsc --noEmit` (type check) plus manual dev-server check where noted; the final E2E test is the executable verification of the whole flow.

---

### Task 1: `GET /api/cash-shifts/current` + live `expectedCash` for open shifts

**Files:**
- Modify: `apps/api/src/main/java/rd/dalventa/api/cashshift/web/CashShiftController.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/cashshift/service/CashShiftService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/CashShiftSummaryResponse.java`
- Test: `apps/api/src/test/java/rd/dalventa/api/cashshift/CashShiftCurrentIntegrationTest.java`

**Interfaces:**
- Consumes: `CashShiftRepository.findByRegisterIdAndStatus(UUID, CashShiftStatus)` (existing), `RegisterRepository.findByIdAndTenantId` (existing), `CashMovementRepository.findAllByTenantIdAndCashShiftId` (existing).
- Produces: `GET /api/cash-shifts/current?registerId=` → `ApiResponse<CashShiftSummaryResponse>` (200) or 404 body `{success:false,error:"..."}`. This is what Task 3's frontend query hits. `CashShiftSummaryResponse.expectedCash` is now always live-computed for `OPEN` shifts (not just frozen at close) — Task 4's "Registrar movimiento" flow depends on this to show updated `expectedCash` after invalidating the query.

The current `buildSummary(CashShift)` reads `shift.getExpectedCash()` directly, which is only ever set inside `close()` — for an `OPEN` shift it is always `null`. The design spec requires the summary screen to show a live `expectedCash` while the shift is open, so this task also fixes `buildSummary` to compute it on the fly for `OPEN` shifts (extracting the existing loop out of `close()` so there's one computation, not two).

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CashShiftCurrentIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String registerId, String d100) {}

    private Setup setup(String email) throws Exception {
        String token = registerTenantAndGetToken(email, "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        var registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

        var denomRes = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String d100 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            if (node.path("value").asText().startsWith("100")) d100 = node.path("id").asText();
        }

        return new Setup(token, registerId, d100);
    }

    @Test
    void current_withOpenShift_returnsSummaryWithLiveExpectedCash() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/open")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                        + "{\"denominationId\":\"" + s.d100() + "\",\"quantity\":5}]}"));

        mockMvc.perform(get("/api/cash-shifts/current").param("registerId", s.registerId())
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.registerId").value(s.registerId()))
                .andExpect(jsonPath("$.data.expectedCash").value("500.00"));
    }

    @Test
    void current_withoutOpenShift_returnsNotFound() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(get("/api/cash-shifts/current").param("registerId", s.registerId())
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isNotFound());
    }

    @Test
    void current_registerFromOtherTenant_returnsNotFound() throws Exception {
        var s = setup("admin3@dalventa.test");
        String otherToken = registerTenantAndGetToken("admin4@dalventa.test", "Secret123!");

        mockMvc.perform(get("/api/cash-shifts/current").param("registerId", s.registerId())
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run to confirm compile/behavior failure**

```bash
cd apps/api
./mvnw test -Dtest=CashShiftCurrentIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error (`GET /api/cash-shifts/current` doesn't exist yet).

- [ ] **Step 3: `CashShiftSummaryResponse.from` takes `expectedCash` explicitly**

```java
package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CashShiftSummaryResponse(
        UUID id,
        @JsonProperty("registerId") UUID registerId,
        CashShiftStatus status,
        @JsonProperty("openedAt") Instant openedAt,
        @JsonProperty("closedAt") Instant closedAt,
        @JsonProperty("openingTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal openingTotal,
        @JsonProperty("expectedCash") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal expectedCash,
        @JsonProperty("countedCash") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal countedCash,
        @JsonProperty("cashDifference") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference,
        List<CashShiftDenominationEntry> denominations
) {
    public static CashShiftSummaryResponse from(CashShift shift, BigDecimal expectedCash, List<CashShiftDenominationEntry> denominations) {
        return new CashShiftSummaryResponse(shift.getId(), shift.getRegisterId(), shift.getStatus(),
                shift.getOpenedAt(), shift.getClosedAt(), shift.getOpeningTotal(), expectedCash,
                shift.getCountedCash(), shift.getCashDifference(), denominations);
    }
}
```

- [ ] **Step 4: `CashShiftService` — `getCurrentOpenShift`, `computeExpectedCash`, updated `buildSummary`/`close`**

Replace the whole file with:

```java
package rd.dalventa.api.cashshift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;
import rd.dalventa.api.cashshift.dto.CashShiftDenominationEntry;
import rd.dalventa.api.cashshift.dto.CashShiftSummaryResponse;
import rd.dalventa.api.cashshift.dto.CloseCashShiftRequest;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.dto.OpenCashShiftRequest;
import rd.dalventa.api.cashshift.repository.CashMovementRepository;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashShiftService {

    private final CashShiftRepository cashShiftRepository;
    private final CashShiftDenominationRepository cashShiftDenominationRepository;
    private final RegisterRepository registerRepository;
    private final DenominationRepository denominationRepository;
    private final CurrentUserProvider currentUserProvider;
    private final CashMovementRepository cashMovementRepository;

    @Transactional
    public CashShiftSummaryResponse open(OpenCashShiftRequest req) {
        var tenantId = TenantContext.require();
        registerRepository.findByIdAndTenantId(req.registerId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));

        if (cashShiftRepository.findByRegisterIdAndStatus(req.registerId(), CashShiftStatus.OPEN).isPresent()) {
            throw new DuplicateResourceException("Esta caja ya tiene un turno abierto");
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();

        BigDecimal openingTotal = BigDecimal.ZERO;
        for (DenominationCountEntry entry : req.openingCounts()) {
            var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
            openingTotal = openingTotal.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
        }

        var shift = new CashShift(req.registerId(), userId, openingTotal);
        shift.setTenantId(tenantId);
        try {
            shift = cashShiftRepository.save(shift);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Esta caja ya tiene un turno abierto");
        }

        for (DenominationCountEntry entry : req.openingCounts()) {
            var csd = new CashShiftDenomination(shift.getId(), entry.denominationId(), entry.quantity());
            csd.setTenantId(tenantId);
            cashShiftDenominationRepository.save(csd);
        }

        return buildSummary(shift);
    }

    @Transactional(readOnly = true)
    public CashShiftSummaryResponse getSummary(UUID id) {
        var shift = requireShiftInTenant(id);
        return buildSummary(shift);
    }

    @Transactional(readOnly = true)
    public CashShiftSummaryResponse getCurrentOpenShift(UUID registerId) {
        var tenantId = TenantContext.require();
        registerRepository.findByIdAndTenantId(registerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));
        var shift = cashShiftRepository.findByRegisterIdAndStatus(registerId, CashShiftStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException("No hay turno abierto para esta caja"));
        return buildSummary(shift);
    }

    @Transactional
    public CashShiftSummaryResponse close(UUID id, CloseCashShiftRequest req) {
        var shift = requireShiftInTenant(id);
        var tenantId = TenantContext.require();
        if (shift.getStatus() != CashShiftStatus.OPEN) {
            throw new DuplicateResourceException("Este turno ya esta cerrado");
        }

        BigDecimal countedCash = BigDecimal.ZERO;
        for (DenominationCountEntry entry : req.closingCounts()) {
            var csd = cashShiftDenominationRepository
                    .findByCashShiftIdAndDenominationId(id, entry.denominationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Denominacion no registrada en este turno"));
            csd.setClosingQuantity(entry.quantity());
            cashShiftDenominationRepository.save(csd);

            var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
            countedCash = countedCash.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
        }

        BigDecimal expectedCash = computeExpectedCash(shift, tenantId);

        BigDecimal difference = countedCash.subtract(expectedCash);
        if (difference.compareTo(BigDecimal.ZERO) != 0
                && (req.closingNotes() == null || req.closingNotes().isBlank())) {
            throw new IllegalArgumentException("Se requiere una nota explicando la diferencia de caja");
        }

        shift.setExpectedCash(expectedCash);
        shift.setCountedCash(countedCash);
        shift.setCashDifference(difference);
        shift.setClosingNotes(req.closingNotes());
        shift.setStatus(CashShiftStatus.CLOSED);
        shift.setClosedAt(java.time.Instant.now());
        cashShiftRepository.save(shift);

        return buildSummary(shift);
    }

    @Transactional(readOnly = true)
    public List<CashShiftSummaryResponse> list(UUID registerId) {
        var tenantId = TenantContext.require();
        return cashShiftRepository.findAllByTenantIdAndRegisterId(tenantId, registerId)
                .stream().map(this::buildSummary).toList();
    }

    CashShift requireShiftInTenant(UUID id) {
        var tenantId = TenantContext.require();
        return cashShiftRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turno no encontrado"));
    }

    private BigDecimal computeExpectedCash(CashShift shift, UUID tenantId) {
        BigDecimal expected = shift.getOpeningTotal();
        for (var movement : cashMovementRepository.findAllByTenantIdAndCashShiftId(tenantId, shift.getId())) {
            expected = switch (movement.getType()) {
                case ENTRY -> expected.add(movement.getAmount());
                case WITHDRAWAL, EXPENSE -> expected.subtract(movement.getAmount());
            };
        }
        return expected;
    }

    private CashShiftSummaryResponse buildSummary(CashShift shift) {
        List<CashShiftDenominationEntry> denominations = cashShiftDenominationRepository
                .findAllByCashShiftId(shift.getId())
                .stream().map(CashShiftDenominationEntry::from).toList();
        BigDecimal expectedCash = shift.getStatus() == CashShiftStatus.OPEN
                ? computeExpectedCash(shift, TenantContext.require())
                : shift.getExpectedCash();
        return CashShiftSummaryResponse.from(shift, expectedCash, denominations);
    }
}
```

- [ ] **Step 5: Controller — add `GET /current`**

Add to `CashShiftController` (above the existing `GET /{id}/summary` mapping, order doesn't matter to Spring but keep it readable):

```java
    @GetMapping("/current")
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashShiftSummaryResponse> current(@RequestParam UUID registerId) {
        return ApiResponse.ok(cashShiftService.getCurrentOpenShift(registerId));
    }
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CashShiftCurrentIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 7: Run the full cashshift/sale suites to confirm the `buildSummary` refactor didn't break existing tests**

```bash
./mvnw test -Dtest=CashShift*,Sale* -Dspring.profiles.active=test
```
Expected: all green — `SaleCashPaymentIntegrationTest` in particular reads `$.data.denominations[].currentQuantity` off `/summary`, unaffected by the `expectedCash` change, but confirms nothing regressed.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat: add GET /api/cash-shifts/current with live expectedCash for open shifts"
```

---

### Task 2: Frontend types + shared `DenominationCountGrid`

**Files:**
- Create: `apps/web/src/types/cash-shift.ts`
- Create: `apps/web/src/components/cash-shift/DenominationCountGrid.tsx`

**Interfaces:**
- Consumes: `GET /api/denominations` (existing, response shape `{id, value: string, type: "BILL"|"COIN", active: boolean}`).
- Produces: `DenominationCountGridProps.onChange(entries: DenominationCountEntry[])` — Tasks 3, 4, 5 each render this component and read the array it reports (quantity-0 entries already filtered out).

- [ ] **Step 1: Types**

```typescript
export interface DenominationResponse {
  id: string;
  value: string;
  type: "BILL" | "COIN";
  active: boolean;
}

export interface DenominationCountEntry {
  denominationId: string;
  quantity: number;
}

export type CashShiftStatus = "OPEN" | "CLOSED";

export interface CashShiftDenominationEntry {
  denominationId: string;
  openingQuantity: number;
  currentQuantity: number;
  closingQuantity: number | null;
}

export interface CashShiftSummaryResponse {
  id: string;
  registerId: string;
  status: CashShiftStatus;
  openedAt: string;
  closedAt: string | null;
  openingTotal: string;
  expectedCash: string | null;
  countedCash: string | null;
  cashDifference: string | null;
  denominations: CashShiftDenominationEntry[];
}

export interface OpenCashShiftRequest {
  registerId: string;
  openingCounts: DenominationCountEntry[];
}

export type CashMovementType = "ENTRY" | "WITHDRAWAL" | "EXPENSE";

export interface CreateCashMovementRequest {
  type: CashMovementType;
  reason: string;
  denominations: DenominationCountEntry[];
}

export interface CloseCashShiftRequest {
  closingCounts: DenominationCountEntry[];
  closingNotes?: string;
}
```

Save as `apps/web/src/types/cash-shift.ts`.

- [ ] **Step 2: `DenominationCountGrid`**

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DenominationCountEntry, DenominationResponse } from "@/types/cash-shift";

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

export function formatDenominationValue(value: string): string {
  const n = Number(value);
  return Number.isInteger(n) ? `RD$${n}` : `RD$${n.toFixed(2)}`;
}

interface DenominationCountGridProps {
  onChange: (entries: DenominationCountEntry[]) => void;
}

export function DenominationCountGrid({ onChange }: DenominationCountGridProps) {
  const { data: denominations } = useQuery({ queryKey: ["denominations"], queryFn: fetchDenominations });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleChange = (denominationId: string, rawValue: string) => {
    const quantity = Math.max(0, parseInt(rawValue, 10) || 0);
    const next = { ...quantities, [denominationId]: quantity };
    setQuantities(next);
    onChange(
      Object.entries(next)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ denominationId: id, quantity: qty }))
    );
  };

  const active = denominations?.filter((d) => d.active) ?? [];
  const total = active.reduce((sum, d) => sum + (quantities[d.id] ?? 0) * Number(d.value), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {active.map((d) => (
          <div key={d.id} className="space-y-1">
            <Label htmlFor={`denom-${d.id}`}>{formatDenominationValue(d.value)}</Label>
            <Input
              id={`denom-${d.id}`}
              type="number"
              min={0}
              value={quantities[d.id] ?? ""}
              onChange={(e) => handleChange(d.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="text-sm font-medium">Total: RD${total.toFixed(2)}</p>
    </div>
  );
}
```

Save as `apps/web/src/components/cash-shift/DenominationCountGrid.tsx`.

- [ ] **Step 3: Type-check**

```bash
cd apps/web
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/types/cash-shift.ts apps/web/src/components/cash-shift/DenominationCountGrid.tsx
git commit -m "feat: add cash-shift types and shared DenominationCountGrid"
```

---

### Task 3: `/cash-shift` page shell + open-shift form + nav gating

**Files:**
- Create: `apps/web/src/app/(dashboard)/cash-shift/page.tsx`
- Create: `apps/web/src/components/cash-shift/CashShiftWorkspace.tsx`
- Create: `apps/web/src/components/cash-shift/OpenShiftForm.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx` (add "Turno de Caja" nav item, gated on `CASHSHIFT_OPEN`)

**Interfaces:**
- Consumes: `DenominationCountGrid` (Task 2), `GET /api/branches` (existing, query key `["branches"]`), `GET /api/registers?branchId=` (existing, query key `["registers", branchId]`), `POST /api/cash-shifts/open` (existing), `GET /api/cash-shifts/current` (Task 1).
- Produces: `CashShiftWorkspace({ registerId }: { registerId: string })` — Tasks 4 and 5 add the `open`/`closing`/`closed` branches to this component's render logic (this task only implements the `loading`/`no-shift` branches, leaving a `TODO`-free stub `<p>Turno abierto</p>` for the `open` branch that Task 4 replaces).

- [ ] **Step 1: `OpenShiftForm`**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DenominationCountGrid } from "./DenominationCountGrid";
import type { DenominationCountEntry } from "@/types/cash-shift";

export function OpenShiftForm({ registerId }: { registerId: string }) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);

  const mutation = useMutation({
    mutationFn: () => api.post("/api/cash-shifts/open", { registerId, openingCounts: entries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
    },
    onError: (err: unknown) => {
      const response = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
      if (response?.status === 409) {
        // Otra pestana/usuario abrio el turno primero: recuperar el estado real en vez de solo mostrar el error.
        queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
        return;
      }
      toast.error(response?.data?.error ?? "Error al abrir el turno");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DenominationCountGrid onChange={setEntries} />
        <Button disabled={entries.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Abriendo..." : "Abrir turno"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

Save as `apps/web/src/components/cash-shift/OpenShiftForm.tsx`.

- [ ] **Step 2: `CashShiftWorkspace` (stub `open` branch, replaced in Task 4)**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { OpenShiftForm } from "./OpenShiftForm";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";

async function fetchCurrentShift(registerId: string): Promise<CashShiftSummaryResponse | null> {
  try {
    const res = await api.get<{ data: CashShiftSummaryResponse }>("/api/cash-shifts/current", {
      params: { registerId },
    });
    return res.data.data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export function CashShiftWorkspace({ registerId }: { registerId: string }) {
  const { data: currentShift, isLoading } = useQuery({
    queryKey: ["cash-shift-current", registerId],
    queryFn: () => fetchCurrentShift(registerId),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando turno...</p>;
  }
  if (!currentShift) {
    return <OpenShiftForm registerId={registerId} />;
  }
  return <p className="text-muted-foreground">Turno abierto (resumen pendiente).</p>;
}
```

Save as `apps/web/src/components/cash-shift/CashShiftWorkspace.tsx`.

- [ ] **Step 3: `/cash-shift` page — branch/register selectors**

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { CashShiftWorkspace } from "@/components/cash-shift/CashShiftWorkspace";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

async function fetchRegisters(branchId: string): Promise<RegisterResponse[]> {
  const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId } });
  return res.data.data;
}

export default function CashShiftPage() {
  const [branchId, setBranchId] = useState("");
  const [registerId, setRegisterId] = useState("");

  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });
  const { data: registers } = useQuery({
    queryKey: ["registers", branchId],
    queryFn: () => fetchRegisters(branchId),
    enabled: !!branchId,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Turno de Caja</h1>
      <div className="flex gap-4">
        <div className="max-w-xs flex-1 space-y-2">
          <label htmlFor="cash-shift-branch" className="text-sm font-medium">
            Sucursal
          </label>
          <select
            id="cash-shift-branch"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setRegisterId("");
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecciona una sucursal</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="max-w-xs flex-1 space-y-2">
          <label htmlFor="cash-shift-register" className="text-sm font-medium">
            Caja
          </label>
          <select
            id="cash-shift-register"
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            disabled={!branchId}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecciona una caja</option>
            {registers?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {registerId && <CashShiftWorkspace registerId={registerId} />}
    </div>
  );
}
```

Save as `apps/web/src/app/(dashboard)/cash-shift/page.tsx`.

- [ ] **Step 4: Nav gating**

In `apps/web/src/components/layout/Sidebar.tsx`, add the `Wallet` icon import and the nav item:

```typescript
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Package, Boxes, Wallet } from "lucide-react";
```

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/branches", label: "Sucursales", icon: Building2, permission: "SETTINGS_MANAGE" },
  { href: "/products", label: "Productos", icon: Package, permission: "INVENTORY_VIEW" },
  { href: "/inventory", label: "Inventario", icon: Boxes, permission: "INVENTORY_VIEW" },
  { href: "/cash-shift", label: "Turno de Caja", icon: Wallet, permission: "CASHSHIFT_OPEN" },
];
```

- [ ] **Step 5: Manual verification**

```bash
cd apps/web
npx tsc --noEmit
npm run dev
```
Log in, open `/cash-shift`, pick a branch and a register with no open shift, confirm the denomination grid renders and "Abrir turno" persists (check network tab for `POST /api/cash-shifts/open` 201, then the page settles on the "Turno abierto (resumen pendiente)" stub).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app apps/web/src/components/cash-shift apps/web/src/components/layout/Sidebar.tsx
git commit -m "feat: add /cash-shift page with branch/register selection and open-shift form"
```

---

### Task 4: Shift summary + "Registrar movimiento"

**Files:**
- Create: `apps/web/src/components/cash-shift/ShiftSummary.tsx`
- Create: `apps/web/src/components/cash-shift/CashMovementDialog.tsx`
- Modify: `apps/web/src/components/cash-shift/CashShiftWorkspace.tsx` (replace the stub `open` branch with `ShiftSummary`, thread through the `closing` state Task 5 will use)

**Interfaces:**
- Consumes: `DenominationCountGrid` (Task 2), `formatDenominationValue` (Task 2), `usePermission` (existing hook), `POST /api/cash-shifts/{id}/movements` (existing).
- Produces: `ShiftSummaryProps.onRequestClose: () => void` — Task 5's `CashShiftWorkspace` wiring calls this to flip into the `closing` branch. `CashMovementDialog` invalidates `["cash-shift-current", registerId]` on success, which is how the summary's `expectedCash`/denomination table refresh.

- [ ] **Step 1: `CashMovementDialog`**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { DenominationCountGrid } from "./DenominationCountGrid";
import type { CashMovementType, DenominationCountEntry } from "@/types/cash-shift";

interface CashMovementDialogProps {
  cashShiftId: string;
  registerId: string;
  trigger: React.ReactNode;
}

export function CashMovementDialog({ cashShiftId, registerId, trigger }: CashMovementDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CashMovementType>("ENTRY");
  const [reason, setReason] = useState("");
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/api/cash-shifts/${cashShiftId}/movements`, { type, reason, denominations: entries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
      setOpen(false);
      setReason("");
      setEntries([]);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al registrar el movimiento";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="movement-type">Tipo</Label>
            <select
              id="movement-type"
              value={type}
              onChange={(e) => setType(e.target.value as CashMovementType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ENTRY">Entrada</option>
              <option value="WITHDRAWAL">Retiro</option>
              <option value="EXPENSE">Gasto</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="movement-reason">Motivo</Label>
            <Input id="movement-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DenominationCountGrid onChange={setEntries} />
          <DialogFooter>
            <Button
              disabled={entries.length === 0 || reason.trim() === "" || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Save as `apps/web/src/components/cash-shift/CashMovementDialog.tsx`.

- [ ] **Step 2: `ShiftSummary`**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashMovementDialog } from "./CashMovementDialog";
import { formatDenominationValue } from "./DenominationCountGrid";
import type { CashShiftSummaryResponse, DenominationResponse } from "@/types/cash-shift";

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

interface ShiftSummaryProps {
  shift: CashShiftSummaryResponse;
  registerId: string;
  onRequestClose: () => void;
}

export function ShiftSummary({ shift, registerId, onRequestClose }: ShiftSummaryProps) {
  const canClose = usePermission("CASHSHIFT_CLOSE");
  const { data: denominations } = useQuery({ queryKey: ["denominations"], queryFn: fetchDenominations });

  const denominationLabel = (id: string) => {
    const d = denominations?.find((d) => d.id === id);
    return d ? formatDenominationValue(d.value) : id;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turno abierto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Abierto</p>
            <p className="font-medium">{new Date(shift.openedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total de apertura</p>
            <p className="font-medium">RD${shift.openingTotal}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Efectivo esperado</p>
            <p className="font-medium">RD${shift.expectedCash}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Denominacion</th>
              <th className="py-2">Cantidad actual</th>
            </tr>
          </thead>
          <tbody>
            {shift.denominations.map((d) => (
              <tr key={d.denominationId} className="border-b border-border">
                <td className="py-2">{denominationLabel(d.denominationId)}</td>
                <td className="py-2">{d.currentQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <CashMovementDialog
            cashShiftId={shift.id}
            registerId={registerId}
            trigger={<Button variant="secondary">Registrar movimiento</Button>}
          />
          {canClose && (
            <Button variant="outline" onClick={onRequestClose}>
              Cerrar turno
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

Save as `apps/web/src/components/cash-shift/ShiftSummary.tsx`.

- [ ] **Step 3: Wire `ShiftSummary` into `CashShiftWorkspace`**

Replace the whole file:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { OpenShiftForm } from "./OpenShiftForm";
import { ShiftSummary } from "./ShiftSummary";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";

async function fetchCurrentShift(registerId: string): Promise<CashShiftSummaryResponse | null> {
  try {
    const res = await api.get<{ data: CashShiftSummaryResponse }>("/api/cash-shifts/current", {
      params: { registerId },
    });
    return res.data.data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export function CashShiftWorkspace({ registerId }: { registerId: string }) {
  const { data: currentShift, isLoading } = useQuery({
    queryKey: ["cash-shift-current", registerId],
    queryFn: () => fetchCurrentShift(registerId),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando turno...</p>;
  }
  if (!currentShift) {
    return <OpenShiftForm registerId={registerId} />;
  }
  return (
    <ShiftSummary shift={currentShift} registerId={registerId} onRequestClose={() => {}} />
  );
}
```

(The `onRequestClose={() => {}}` no-op and the missing `closing`/`closed` branches are intentional here — Task 5 replaces this file again to wire the full state machine. Splitting it this way keeps this task's deliverable — open shift + movement registration, end to end — independently testable before the close flow exists.)

- [ ] **Step 4: Manual verification**

```bash
cd apps/web
npx tsc --noEmit
npm run dev
```
With a shift already open (from Task 3's flow), reload `/cash-shift`, select the same branch/register, confirm `ShiftSummary` renders with `expectedCash` equal to the opening total. Click "Registrar movimiento", submit a `WITHDRAWAL` with a denomination and reason, confirm the dialog closes and `expectedCash` in the summary decreases by the withdrawn amount.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/cash-shift
git commit -m "feat: add shift summary with cash movement registration"
```

---

### Task 5: Close-shift flow + final summary + 409-recovery note

**Files:**
- Create: `apps/web/src/components/cash-shift/CloseShiftForm.tsx`
- Create: `apps/web/src/components/cash-shift/FinalShiftSummary.tsx`
- Modify: `apps/web/src/components/cash-shift/CashShiftWorkspace.tsx` (full state machine: `no-shift` → `open` → `closing` → `closed`)

**Interfaces:**
- Consumes: `DenominationCountGrid` (Task 2), `ShiftSummary`/`OpenShiftForm` (Tasks 3-4), `POST /api/cash-shifts/{id}/close` (existing).
- Produces: nothing further consumed — this is the last screen in the state machine.

- [ ] **Step 1: `CloseShiftForm`**

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { DenominationCountGrid } from "./DenominationCountGrid";
import type { CashShiftSummaryResponse, DenominationCountEntry } from "@/types/cash-shift";

interface CloseShiftFormProps {
  shift: CashShiftSummaryResponse;
  onCancel: () => void;
  onClosed: (closed: CashShiftSummaryResponse) => void;
}

export function CloseShiftForm({ shift, onCancel, onClosed }: CloseShiftFormProps) {
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ data: CashShiftSummaryResponse }>(`/api/cash-shifts/${shift.id}/close`, {
        closingCounts: entries,
        closingNotes: notes || undefined,
      }),
    onSuccess: (res) => {
      onClosed(res.data.data);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al cerrar el turno";
      toast.error(message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cerrar turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DenominationCountGrid onChange={setEntries} />
        <div className="space-y-2">
          <Label htmlFor="close-notes">Notas (obligatorio si hay diferencia de caja)</Label>
          <textarea
            id="close-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex gap-2">
          <Button disabled={entries.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Cerrando..." : "Confirmar cierre"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

Save as `apps/web/src/components/cash-shift/CloseShiftForm.tsx`.

- [ ] **Step 2: `FinalShiftSummary`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";

export function FinalShiftSummary({
  shift,
  onDone,
}: {
  shift: CashShiftSummaryResponse;
  onDone: () => void;
}) {
  const difference = Number(shift.cashDifference ?? "0");
  const isExact = difference === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turno cerrado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Efectivo esperado</p>
            <p className="font-medium">RD${shift.expectedCash}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Efectivo contado</p>
            <p className="font-medium">RD${shift.countedCash}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Diferencia</p>
            <p className={cn("font-medium", isExact ? "text-emerald-600" : "text-amber-600")}>
              RD${shift.cashDifference}
            </p>
          </div>
        </div>
        <Button onClick={onDone}>Volver</Button>
      </CardContent>
    </Card>
  );
}
```

Save as `apps/web/src/components/cash-shift/FinalShiftSummary.tsx`.

- [ ] **Step 3: Full state machine in `CashShiftWorkspace`**

Replace the whole file:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { OpenShiftForm } from "./OpenShiftForm";
import { ShiftSummary } from "./ShiftSummary";
import { CloseShiftForm } from "./CloseShiftForm";
import { FinalShiftSummary } from "./FinalShiftSummary";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";

async function fetchCurrentShift(registerId: string): Promise<CashShiftSummaryResponse | null> {
  try {
    const res = await api.get<{ data: CashShiftSummaryResponse }>("/api/cash-shifts/current", {
      params: { registerId },
    });
    return res.data.data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export function CashShiftWorkspace({ registerId }: { registerId: string }) {
  const queryClient = useQueryClient();
  const [closing, setClosing] = useState(false);
  const [closedShift, setClosedShift] = useState<CashShiftSummaryResponse | null>(null);

  const { data: currentShift, isLoading } = useQuery({
    queryKey: ["cash-shift-current", registerId],
    queryFn: () => fetchCurrentShift(registerId),
    enabled: !closedShift,
  });

  if (closedShift) {
    return (
      <FinalShiftSummary
        shift={closedShift}
        onDone={() => {
          setClosedShift(null);
          queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
        }}
      />
    );
  }
  if (isLoading) {
    return <p className="text-muted-foreground">Cargando turno...</p>;
  }
  if (!currentShift) {
    return <OpenShiftForm registerId={registerId} />;
  }
  if (closing) {
    return (
      <CloseShiftForm
        shift={currentShift}
        onCancel={() => setClosing(false)}
        onClosed={(closed) => {
          setClosing(false);
          setClosedShift(closed);
        }}
      />
    );
  }
  return <ShiftSummary shift={currentShift} registerId={registerId} onRequestClose={() => setClosing(true)} />;
}
```

- [ ] **Step 4: Manual verification**

```bash
cd apps/web
npx tsc --noEmit
npm run dev
```
With an open shift (opening total matching one denomination), click "Cerrar turno", count back the exact same denominations, confirm "Confirmar cierre" succeeds and `FinalShiftSummary` shows `cashDifference: 0.00` in green. Repeat with a deliberately different count and confirm the amber color plus the required-notes 400 if notes are left blank.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/cash-shift
git commit -m "feat: add close-shift flow and final summary with cash-difference highlight"
```

---

### Task 6: E2E coverage

**Files:**
- Create: `apps/web/e2e/cash-shift.spec.ts`

**Interfaces:**
- Consumes: the full `/cash-shift` flow built in Tasks 3-5, plus `/branches` and `/products`+`/inventory` to seed a branch/register (same registration flow `branches.spec.ts`/`inventory.spec.ts` already use).

- [ ] **Step 1: Write the E2E test**

```typescript
import { test, expect } from "@playwright/test";

test("abrir turno, registrar movimiento, cerrar turno sin diferencia", async ({ page }) => {
  const uniqueEmail = `e2e-cashshift-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria CashShift E2E");
  await page.getByLabel("Tu nombre").fill("Admin CashShift");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Sucursales" }).click();
  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro");
  await page.getByLabel("Direccion").fill("Calle Duarte 12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro")).toBeVisible();

  await page.getByText("Sucursal Centro").click();
  await page.getByRole("button", { name: "Nueva caja" }).click();
  await page.getByLabel("Nombre").fill("Caja 1");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja 1")).toBeVisible();

  await page.getByRole("link", { name: "Turno de Caja" }).click();
  await expect(page).toHaveURL(/\/cash-shift/);
  await page.getByLabel("Sucursal").selectOption({ label: "Sucursal Centro" });
  await page.getByLabel("Caja").selectOption({ label: "Caja 1" });

  await expect(page.getByRole("heading", { name: "Abrir turno" })).toBeVisible();
  await page.getByLabel("RD$1000").fill("1");
  await page.getByRole("button", { name: "Abrir turno" }).click();
  await expect(page.getByRole("heading", { name: "Turno abierto" })).toBeVisible();
  await expect(page.getByText("RD$1000.00")).toBeVisible();

  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  await page.getByLabel("Tipo").selectOption({ label: "Retiro" });
  await page.getByLabel("Motivo").fill("Deposito bancario");
  await page.getByLabel("RD$1000").fill("1");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("RD$0.00")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar turno" }).click();
  await expect(page.getByRole("heading", { name: "Cerrar turno" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(page.getByRole("heading", { name: "Turno cerrado" })).toBeVisible();
  await expect(page.getByText("RD$0.00").first()).toBeVisible();
});
```

Save as `apps/web/e2e/cash-shift.spec.ts`.

The `"RD$1000"` label assumes the seeded Dominican Republic denomination catalog includes a RD$1000 bill (per `2026-07-05-cashshift-denominaciones-design.md` §"Sembrado automatico"). If the seeded catalog uses a different top denomination, adjust the label in this test to match — do not change the seed data to match the test.

- [ ] **Step 2: Run it**

```bash
cd apps/web
npm run test:e2e -- cash-shift.spec.ts
```
Expected: 1 passed. Requires the backend running locally against the `dalventa_test_db`/dev Postgres instance per this project's existing E2E setup (same prerequisite as `branches.spec.ts`/`inventory.spec.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/cash-shift.spec.ts
git commit -m "test: add Playwright E2E coverage for CashShift open/movement/close flow"
```
