# CashShift / Denominaciones / Algoritmo de Cambio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Note for this run:** executed inline in the current session by the controller directly (no subagent dispatch), per explicit user instruction. TDD discipline and per-task test verification still apply exactly as written below.

**Goal:** Add cash-shift lifecycle (open/close), a per-tenant denomination catalog, manual cash movements (entry/withdrawal/expense), and the change-suggestion algorithm — all without a `Sale` entity, which is the next module.

**Architecture:** Two new package-by-feature areas — `denomination` (catalog) and `cashshift` (shift lifecycle, movements, change algorithm) — on the existing Spring Boot monolith, following the established tenant-scoped-CRUD + `@PreAuthorize` pattern (`branch`/`register`/`product`/`inventory`). `CashShiftDenomination` is a single table combining the opening snapshot, live balance, and closing snapshot per (shift, denomination) pair — see design spec §3.1.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Data JPA, PostgreSQL, Flyway, JUnit 5, MockMvc.

## Global Constraints

- Money fields: `NUMERIC(12,2)`/`NUMERIC(14,2)` in Postgres, `BigDecimal` in Java — never float/double. The change-suggestion algorithm's internal computation uses `long` cents, converting at the service boundary only (never propagated to entities).
- Every new table: `tenant_id UUID NOT NULL REFERENCES tenants(id)`, indexed.
- Never throw a bare `org.springframework.web.server.ResponseStatusException` — this project's catch-all `@ExceptionHandler(Exception.class)` swallows it into a 500. Use `rd.dalventa.api.shared.web.ResourceNotFoundException` (404), `rd.dalventa.api.shared.web.DuplicateResourceException` (409, already exists and mapped), or `IllegalArgumentException`/`IllegalStateException` (400, already mapped).
- Jackson: `application.yml` sets `spring.jackson.property-naming-strategy: SNAKE_CASE` globally. Every multi-word camelCase field in any request/response DTO needs `@JsonProperty("exactCamelCaseName")`.
- One `OPEN` `CashShift` per `Register` — enforced by a partial unique index in Postgres (`WHERE status = 'OPEN'`), not just an application check. The service pre-checks (fast path, good error message) AND catches `org.springframework.dao.DataIntegrityViolationException` around the actual insert (race-condition safety net) and rewrites it to `DuplicateResourceException`.
- Migrations start at `V14` (directory currently ends at `V13__inventory_movements.sql`).
- No `Sale` entity, no `TenantSettings`/configurable difference policy in this plan — see design spec §2 for what's explicitly deferred.
- Postgres for tests: `dalventa_test_db` container (db `dalventa_test`/user `dalventa`/password `changeme`) — `docker ps` to check, `docker run -d --name dalventa_test_db -p 5432:5432 -e POSTGRES_DB=dalventa_test -e POSTGRES_USER=dalventa -e POSTGRES_PASSWORD=changeme postgres:16-alpine` if not running.

---

### Task 1: `Denomination` catalog + tenant-registration seeding

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/denomination/domain/DenominationType.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/denomination/domain/Denomination.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/denomination/repository/DenominationRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/denomination/dto/CreateDenominationRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/denomination/dto/DenominationResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/denomination/service/DenominationService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/denomination/web/DenominationController.java`
- Create: `apps/api/src/main/resources/db/migration/V14__denominations.sql`
- Modify: `apps/api/src/main/java/rd/dalventa/api/tenant/service/TenantService.java` (call `DenominationService.seedDefaults` after saving the tenant)
- Test: `apps/api/src/test/java/rd/dalventa/api/denomination/DenominationIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `DenominationRepository`)

**Interfaces:**
- Produces: `Denomination(BigDecimal value, DenominationType type)` constructor, `DenominationRepository.findAllByTenantIdAndActiveTrue(UUID) : List<Denomination>`, `.findByIdAndTenantId(UUID, UUID) : Optional<Denomination>`. `DenominationService.seedDefaults(UUID tenantId)` — called by `TenantService`, and later tasks' tests rely on this producing exactly 10 rows with the exact values below.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.denomination;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DenominationIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void registeringTenant_seedsDefaultDominicanDenominations() throws Exception {
        registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        var tenantId = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin@dalventa.test"))
                .findFirst().orElseThrow().getTenantId();

        var values = denominationRepository.findAllByTenantIdAndActiveTrue(tenantId).stream()
                .map(d -> d.getValue().stripTrailingZeros())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(values).hasSize(10);
        assertThat(values).contains(
                BigDecimal.valueOf(2000).stripTrailingZeros(), BigDecimal.valueOf(1000).stripTrailingZeros(),
                BigDecimal.valueOf(500).stripTrailingZeros(), BigDecimal.valueOf(200).stripTrailingZeros(),
                BigDecimal.valueOf(100).stripTrailingZeros(), BigDecimal.valueOf(50).stripTrailingZeros(),
                BigDecimal.valueOf(25).stripTrailingZeros(), BigDecimal.valueOf(10).stripTrailingZeros(),
                BigDecimal.valueOf(5).stripTrailingZeros(), BigDecimal.valueOf(1).stripTrailingZeros()
        );
    }

    @Test
    void createDenomination_asAdmin_persists() throws Exception {
        String token = registerTenantAndGetToken("admin2@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/denominations")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"value\":\"2000.00\",\"type\":\"BILL\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.value").value("2000.00"))
                .andExpect(jsonPath("$.data.type").value("BILL"));
    }

    @Test
    void listDenominations_returnsOnlyCurrentTenant() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");

        var resA = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var resB = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(resA).path("data")).hasSize(10);
        assertThat(objectMapper.readTree(resB).path("data")).hasSize(10);
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
cd apps/api
./mvnw test -Dtest=DenominationIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE denominations (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID          NOT NULL REFERENCES tenants(id),
    value      NUMERIC(12,2) NOT NULL,
    type       VARCHAR(10)   NOT NULL,
    active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_denominations_tenant_id ON denominations(tenant_id);
```
Save as `apps/api/src/main/resources/db/migration/V14__denominations.sql`.

- [ ] **Step 4: `DenominationType` enum**

```java
package rd.dalventa.api.denomination.domain;

public enum DenominationType {
    BILL,
    COIN
}
```

- [ ] **Step 5: Entity**

```java
package rd.dalventa.api.denomination.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "denominations")
public class Denomination extends TenantAwareEntity {

    @Column(nullable = false)
    private BigDecimal value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DenominationType type;

    @Column(nullable = false)
    private boolean active = true;

    public Denomination(BigDecimal value, DenominationType type) {
        this.value = value;
        this.type = type;
    }
}
```

- [ ] **Step 6: Repository**

```java
package rd.dalventa.api.denomination.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.denomination.domain.Denomination;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DenominationRepository extends JpaRepository<Denomination, UUID> {
    List<Denomination> findAllByTenantIdAndActiveTrue(UUID tenantId);
    Optional<Denomination> findByIdAndTenantId(UUID id, UUID tenantId);
}
```

- [ ] **Step 7: DTOs**

```java
package rd.dalventa.api.denomination.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.denomination.domain.DenominationType;

import java.math.BigDecimal;

public record CreateDenominationRequest(
        @NotNull BigDecimal value,
        @JsonProperty("type") @NotNull DenominationType type
) {}
```

```java
package rd.dalventa.api.denomination.dto;

import rd.dalventa.api.denomination.domain.Denomination;
import rd.dalventa.api.denomination.domain.DenominationType;

import java.math.BigDecimal;
import java.util.UUID;

public record DenominationResponse(
        UUID id,
        BigDecimal value,
        DenominationType type,
        boolean active
) {
    public static DenominationResponse from(Denomination d) {
        return new DenominationResponse(d.getId(), d.getValue(), d.getType(), d.isActive());
    }
}
```

- [ ] **Step 8: Service**

```java
package rd.dalventa.api.denomination.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.denomination.domain.Denomination;
import rd.dalventa.api.denomination.domain.DenominationType;
import rd.dalventa.api.denomination.dto.CreateDenominationRequest;
import rd.dalventa.api.denomination.dto.DenominationResponse;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DenominationService {

    private final DenominationRepository denominationRepository;

    private static final BigDecimal[] DEFAULT_BILLS = {
            BigDecimal.valueOf(2000), BigDecimal.valueOf(1000), BigDecimal.valueOf(500),
            BigDecimal.valueOf(200), BigDecimal.valueOf(100), BigDecimal.valueOf(50)
    };
    private static final BigDecimal[] DEFAULT_COINS = {
            BigDecimal.valueOf(25), BigDecimal.valueOf(10), BigDecimal.valueOf(5), BigDecimal.valueOf(1)
    };

    @Transactional
    public void seedDefaults(UUID tenantId) {
        for (BigDecimal value : DEFAULT_BILLS) {
            var d = new Denomination(value, DenominationType.BILL);
            d.setTenantId(tenantId);
            denominationRepository.save(d);
        }
        for (BigDecimal value : DEFAULT_COINS) {
            var d = new Denomination(value, DenominationType.COIN);
            d.setTenantId(tenantId);
            denominationRepository.save(d);
        }
    }

    @Transactional
    public DenominationResponse create(CreateDenominationRequest req) {
        var d = new Denomination(req.value(), req.type());
        d.setTenantId(TenantContext.require());
        return DenominationResponse.from(denominationRepository.save(d));
    }

    @Transactional(readOnly = true)
    public List<DenominationResponse> list() {
        return denominationRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(DenominationResponse::from).toList();
    }
}
```

- [ ] **Step 9: Controller**

```java
package rd.dalventa.api.denomination.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.denomination.dto.CreateDenominationRequest;
import rd.dalventa.api.denomination.dto.DenominationResponse;
import rd.dalventa.api.denomination.service.DenominationService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/api/denominations")
@RequiredArgsConstructor
public class DenominationController {

    private final DenominationService denominationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<DenominationResponse> create(@Valid @RequestBody CreateDenominationRequest req) {
        return ApiResponse.ok(denominationService.create(req));
    }

    @GetMapping
    public ApiResponse<List<DenominationResponse>> list() {
        return ApiResponse.ok(denominationService.list());
    }
}
```

- [ ] **Step 10: Wire seeding into tenant registration**

In `apps/api/src/main/java/rd/dalventa/api/tenant/service/TenantService.java`:
- Add constructor field: `private final rd.dalventa.api.denomination.service.DenominationService denominationService;` (Lombok `@RequiredArgsConstructor` picks it up automatically).
- Add the import: `import rd.dalventa.api.denomination.service.DenominationService;`
- In `registerTenant`, immediately after `tenant = tenantRepository.save(tenant);`, add: `denominationService.seedDefaults(tenant.getId());`

- [ ] **Step 11: Add `DenominationRepository` to `IntegrationTestBase`**

Add `@Autowired protected DenominationRepository denominationRepository;` and, in `cleanAll()`, `denominationRepository.deleteAll();` before `branchRepository.deleteAll();`.

- [ ] **Step 12: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=DenominationIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 13: Commit**

```bash
git add apps/api
git commit -m "feat: add Denomination catalog, seeded on tenant registration"
```

---

### Task 2: `CashShift` open + `CashShiftDenomination`

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/domain/CashShiftStatus.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/domain/CashShift.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/domain/CashShiftDenomination.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/repository/CashShiftRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/repository/CashShiftDenominationRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/DenominationCountEntry.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/OpenCashShiftRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/CashShiftDenominationEntry.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/CashShiftSummaryResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/service/CashShiftService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/web/CashShiftController.java`
- Create: `apps/api/src/main/resources/db/migration/V15__cash_shifts.sql`
- Modify: `apps/api/src/main/java/rd/dalventa/api/register/repository/RegisterRepository.java` (add `findByIdAndTenantId`)
- Test: `apps/api/src/test/java/rd/dalventa/api/cashshift/CashShiftIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `CashShiftRepository`, `CashShiftDenominationRepository`)

**Interfaces:**
- Consumes: `Register` (existing) — validated via new `RegisterRepository.findByIdAndTenantId`. `Denomination` (Task 1) — `openingCounts` reference `Denomination.getId()`.
- Produces: `CashShiftRepository.findByIdAndTenantId(UUID, UUID) : Optional<CashShift>`, `.findByRegisterIdAndStatus(UUID, CashShiftStatus) : Optional<CashShift>`, `.findAllByTenantIdAndRegisterId(UUID, UUID) : List<CashShift>`. `CashShiftDenominationRepository.findAllByCashShiftId(UUID) : List<CashShiftDenomination>`, `.findByCashShiftIdAndDenominationId(UUID, UUID) : Optional<CashShiftDenomination>`, and a pessimistic-lock variant `lockByCashShiftIdAndDenominationId(UUID, UUID) : Optional<CashShiftDenomination>` — Task 3's movement service and Task 4's change algorithm both depend on these exact signatures.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CashShiftIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, UUID registerId) {}

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
        var registerId = UUID.fromString(objectMapper.readTree(registerRes).path("data").path("id").asText());

        return new Setup(token, registerId);
    }

    private String denominationIdFor(String token, String valueStr) throws Exception {
        var res = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        var data = objectMapper.readTree(res).path("data");
        for (var node : data) {
            if (node.path("value").asText().startsWith(valueStr)) {
                return node.path("id").asText();
            }
        }
        throw new IllegalStateException("Denomination " + valueStr + " not found");
    }

    @Test
    void openCashShift_computesOpeningTotal() throws Exception {
        var s = setup("admin@dalventa.test");
        String d1000 = denominationIdFor(s.token(), "1000");
        String d500 = denominationIdFor(s.token(), "500");

        mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d1000 + "\",\"quantity\":2},"
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":1}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.openingTotal").value("2500.00"));
    }

    @Test
    void openCashShift_whenRegisterAlreadyHasOpenShift_returnsConflict() throws Exception {
        var s = setup("admin2@dalventa.test");
        String d1000 = denominationIdFor(s.token(), "1000");
        String body = "{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                + "{\"denominationId\":\"" + d1000 + "\",\"quantity\":1}]}";

        mockMvc.perform(post("/api/cash-shifts/open")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content(body));

        mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void getSummary_returnsDenominationBreakdown() throws Exception {
        var s = setup("admin3@dalventa.test");
        String d1000 = denominationIdFor(s.token(), "1000");

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d1000 + "\",\"quantity\":3}]}"))
                .andReturn().getResponse().getContentAsString();
        var shiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        mockMvc.perform(get("/api/cash-shifts/" + shiftId + "/summary")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.denominations[0].openingQuantity").value(3))
                .andExpect(jsonPath("$.data.denominations[0].currentQuantity").value(3));
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=CashShiftIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE cash_shifts (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID          NOT NULL REFERENCES tenants(id),
    register_id    UUID          NOT NULL REFERENCES registers(id),
    status         VARCHAR(10)   NOT NULL,
    opened_by      UUID          NOT NULL REFERENCES users(id),
    opened_at      TIMESTAMP     NOT NULL,
    closed_at      TIMESTAMP,
    opening_total  NUMERIC(14,2) NOT NULL,
    expected_cash  NUMERIC(14,2),
    counted_cash   NUMERIC(14,2),
    cash_difference NUMERIC(14,2),
    closing_notes  TEXT,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE INDEX idx_cash_shifts_tenant_id ON cash_shifts(tenant_id);
CREATE INDEX idx_cash_shifts_register_id ON cash_shifts(register_id);
CREATE UNIQUE INDEX idx_cash_shifts_one_open_per_register ON cash_shifts(register_id) WHERE status = 'OPEN';

CREATE TABLE cash_shift_denominations (
    id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID      NOT NULL REFERENCES tenants(id),
    cash_shift_id    UUID      NOT NULL REFERENCES cash_shifts(id),
    denomination_id  UUID      NOT NULL REFERENCES denominations(id),
    opening_quantity INT       NOT NULL DEFAULT 0,
    current_quantity INT       NOT NULL DEFAULT 0,
    closing_quantity INT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by       VARCHAR(255),
    updated_by       VARCHAR(255)
);

CREATE UNIQUE INDEX idx_csd_shift_denom ON cash_shift_denominations(cash_shift_id, denomination_id);
CREATE INDEX idx_csd_tenant_id ON cash_shift_denominations(tenant_id);
```
Save as `apps/api/src/main/resources/db/migration/V15__cash_shifts.sql`.

- [ ] **Step 4: `CashShiftStatus` enum**

```java
package rd.dalventa.api.cashshift.domain;

public enum CashShiftStatus {
    OPEN,
    CLOSED
}
```

- [ ] **Step 5: `CashShift` entity**

```java
package rd.dalventa.api.cashshift.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cash_shifts")
public class CashShift extends TenantAwareEntity {

    @Column(name = "register_id", nullable = false)
    private UUID registerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CashShiftStatus status;

    @Column(name = "opened_by", nullable = false)
    private UUID openedBy;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "opening_total", nullable = false)
    private BigDecimal openingTotal;

    @Column(name = "expected_cash")
    private BigDecimal expectedCash;

    @Column(name = "counted_cash")
    private BigDecimal countedCash;

    @Column(name = "cash_difference")
    private BigDecimal cashDifference;

    @Column(name = "closing_notes")
    private String closingNotes;

    public CashShift(UUID registerId, UUID openedBy, BigDecimal openingTotal) {
        this.registerId = registerId;
        this.openedBy = openedBy;
        this.openingTotal = openingTotal;
        this.status = CashShiftStatus.OPEN;
        this.openedAt = Instant.now();
    }
}
```

- [ ] **Step 6: `CashShiftDenomination` entity**

```java
package rd.dalventa.api.cashshift.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cash_shift_denominations")
public class CashShiftDenomination extends TenantAwareEntity {

    @Column(name = "cash_shift_id", nullable = false)
    private UUID cashShiftId;

    @Column(name = "denomination_id", nullable = false)
    private UUID denominationId;

    @Column(name = "opening_quantity", nullable = false)
    private int openingQuantity;

    @Column(name = "current_quantity", nullable = false)
    private int currentQuantity;

    @Column(name = "closing_quantity")
    private Integer closingQuantity;

    public CashShiftDenomination(UUID cashShiftId, UUID denominationId, int openingQuantity) {
        this.cashShiftId = cashShiftId;
        this.denominationId = denominationId;
        this.openingQuantity = openingQuantity;
        this.currentQuantity = openingQuantity;
    }
}
```

- [ ] **Step 7: Repositories**

```java
package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashShiftRepository extends JpaRepository<CashShift, UUID> {
    Optional<CashShift> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<CashShift> findByRegisterIdAndStatus(UUID registerId, CashShiftStatus status);
    List<CashShift> findAllByTenantIdAndRegisterId(UUID tenantId, UUID registerId);
}
```

```java
package rd.dalventa.api.cashshift.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashShiftDenominationRepository extends JpaRepository<CashShiftDenomination, UUID> {
    List<CashShiftDenomination> findAllByCashShiftId(UUID cashShiftId);
    Optional<CashShiftDenomination> findByCashShiftIdAndDenominationId(UUID cashShiftId, UUID denominationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select csd from CashShiftDenomination csd where csd.cashShiftId = :cashShiftId and csd.denominationId = :denominationId")
    Optional<CashShiftDenomination> lockByCashShiftIdAndDenominationId(UUID cashShiftId, UUID denominationId);
}
```

- [ ] **Step 8: Add `findByIdAndTenantId` to `RegisterRepository`**

```java
    java.util.Optional<Register> findByIdAndTenantId(java.util.UUID id, java.util.UUID tenantId);
```
(Add this line to the existing `RegisterRepository` interface, with proper `import java.util.Optional;` and `import java.util.UUID;` at the top rather than fully-qualified names — the fully-qualified form above is just for copy-paste clarity.)

- [ ] **Step 9: DTOs**

```java
package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record DenominationCountEntry(
        @JsonProperty("denominationId") @NotNull UUID denominationId,
        @Positive int quantity
) {}
```

```java
package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record OpenCashShiftRequest(
        @JsonProperty("registerId") @NotNull UUID registerId,
        @JsonProperty("openingCounts") @NotEmpty @Valid List<DenominationCountEntry> openingCounts
) {}
```

```java
package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;

import java.util.UUID;

public record CashShiftDenominationEntry(
        @JsonProperty("denominationId") UUID denominationId,
        @JsonProperty("openingQuantity") int openingQuantity,
        @JsonProperty("currentQuantity") int currentQuantity,
        @JsonProperty("closingQuantity") Integer closingQuantity
) {
    public static CashShiftDenominationEntry from(CashShiftDenomination csd) {
        return new CashShiftDenominationEntry(csd.getDenominationId(), csd.getOpeningQuantity(),
                csd.getCurrentQuantity(), csd.getClosingQuantity());
    }
}
```

```java
package rd.dalventa.api.cashshift.dto;

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
        @JsonProperty("openingTotal") BigDecimal openingTotal,
        @JsonProperty("expectedCash") BigDecimal expectedCash,
        @JsonProperty("countedCash") BigDecimal countedCash,
        @JsonProperty("cashDifference") BigDecimal cashDifference,
        List<CashShiftDenominationEntry> denominations
) {
    public static CashShiftSummaryResponse from(CashShift shift, List<CashShiftDenominationEntry> denominations) {
        return new CashShiftSummaryResponse(shift.getId(), shift.getRegisterId(), shift.getStatus(),
                shift.getOpenedAt(), shift.getClosedAt(), shift.getOpeningTotal(), shift.getExpectedCash(),
                shift.getCountedCash(), shift.getCashDifference(), denominations);
    }
}
```

- [ ] **Step 10: Service**

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
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.dto.OpenCashShiftRequest;
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

    CashShift requireShiftInTenant(UUID id) {
        var tenantId = TenantContext.require();
        return cashShiftRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turno no encontrado"));
    }

    private CashShiftSummaryResponse buildSummary(CashShift shift) {
        List<CashShiftDenominationEntry> denominations = cashShiftDenominationRepository
                .findAllByCashShiftId(shift.getId())
                .stream().map(CashShiftDenominationEntry::from).toList();
        return CashShiftSummaryResponse.from(shift, denominations);
    }
}
```

- [ ] **Step 11: Controller**

```java
package rd.dalventa.api.cashshift.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.cashshift.dto.CashShiftSummaryResponse;
import rd.dalventa.api.cashshift.dto.OpenCashShiftRequest;
import rd.dalventa.api.cashshift.service.CashShiftService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.UUID;

@RestController
@RequestMapping("/api/cash-shifts")
@RequiredArgsConstructor
public class CashShiftController {

    private final CashShiftService cashShiftService;

    @PostMapping("/open")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashShiftSummaryResponse> open(@Valid @RequestBody OpenCashShiftRequest req) {
        return ApiResponse.ok(cashShiftService.open(req));
    }

    @GetMapping("/{id}/summary")
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashShiftSummaryResponse> summary(@PathVariable UUID id) {
        return ApiResponse.ok(cashShiftService.getSummary(id));
    }
}
```

- [ ] **Step 12: Add repositories to `IntegrationTestBase`**

Add `CashShiftRepository` and `CashShiftDenominationRepository` fields; in `cleanAll()`, delete `cashShiftDenominationRepository` then `cashShiftRepository` before `registerRepository.deleteAll()`.

- [ ] **Step 13: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CashShiftIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 14: Commit**

```bash
git add apps/api
git commit -m "feat: add CashShift open with denomination-based opening total"
```

---

### Task 3: `CashMovement` — entrada/retiro/gasto

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/domain/CashMovementType.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/domain/CashMovement.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/domain/CashMovementDenomination.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/repository/CashMovementRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/repository/CashMovementDenominationRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/CreateCashMovementRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/CashMovementResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/service/CashMovementService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/cashshift/web/CashShiftController.java` (add movement endpoint)
- Create: `apps/api/src/main/resources/db/migration/V16__cash_movements.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/cashshift/CashMovementIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add both new repositories)

**Interfaces:**
- Consumes: `CashShiftDenominationRepository.lockByCashShiftIdAndDenominationId` (Task 2). `CashShiftService.requireShiftInTenant(UUID) : CashShift` (Task 2, package-private — this task's service lives in the same package and can call it directly).
- Produces: `CashMovementRepository.findAllByTenantIdAndCashShiftId(UUID, UUID) : List<CashMovement>` — Task 5's close computation depends on this exact method to sum `ENTRY`/`WITHDRAWAL`/`EXPENSE` amounts.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CashMovementIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String shiftId, String denomination500Id) {}

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
        String d500 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":4}]}"))
                .andReturn().getResponse().getContentAsString();
        var shiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        return new Setup(token, shiftId, d500);
    }

    @Test
    void entryMovement_increasesCurrentQuantityAndReturnsAmount() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"type\":\"ENTRY\",\"reason\":\"Fondo adicional\",\"denominations\":["
                                + "{\"denominationId\":\"" + s.denomination500Id() + "\",\"quantity\":2}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.amount").value("1000.00"));

        mockMvc.perform(get("/api/cash-shifts/" + s.shiftId() + "/summary")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.denominations[0].currentQuantity").value(6));
    }

    @Test
    void withdrawalMovement_exceedingAvailable_returnsBadRequest() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"type\":\"WITHDRAWAL\",\"reason\":\"Deposito\",\"denominations\":["
                                + "{\"denominationId\":\"" + s.denomination500Id() + "\",\"quantity\":10}]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/cash-shifts/" + s.shiftId() + "/summary")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.denominations[0].currentQuantity").value(4));
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=CashMovementIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE cash_movements (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id),
    cash_shift_id UUID        NOT NULL REFERENCES cash_shifts(id),
    type        VARCHAR(20)   NOT NULL,
    amount      NUMERIC(14,2) NOT NULL,
    reason      TEXT          NOT NULL,
    user_id     UUID          NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_cash_movements_tenant_id ON cash_movements(tenant_id);
CREATE INDEX idx_cash_movements_shift_id ON cash_movements(cash_shift_id);

CREATE TABLE cash_movement_denominations (
    id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID      NOT NULL REFERENCES tenants(id),
    cash_movement_id  UUID      NOT NULL REFERENCES cash_movements(id),
    denomination_id   UUID      NOT NULL REFERENCES denominations(id),
    quantity          INT       NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE INDEX idx_cmd_movement_id ON cash_movement_denominations(cash_movement_id);
CREATE INDEX idx_cmd_tenant_id ON cash_movement_denominations(tenant_id);
```
Save as `apps/api/src/main/resources/db/migration/V16__cash_movements.sql`.

- [ ] **Step 4: `CashMovementType` enum**

```java
package rd.dalventa.api.cashshift.domain;

public enum CashMovementType {
    ENTRY,
    WITHDRAWAL,
    EXPENSE
}
```

- [ ] **Step 5: Entities**

```java
package rd.dalventa.api.cashshift.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "cash_movements")
public class CashMovement extends TenantAwareEntity {

    @Column(name = "cash_shift_id", nullable = false)
    private UUID cashShiftId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashMovementType type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String reason;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    public CashMovement(UUID cashShiftId, CashMovementType type, BigDecimal amount, String reason, UUID userId) {
        this.cashShiftId = cashShiftId;
        this.type = type;
        this.amount = amount;
        this.reason = reason;
        this.userId = userId;
    }
}
```

```java
package rd.dalventa.api.cashshift.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "cash_movement_denominations")
public class CashMovementDenomination extends TenantAwareEntity {

    @Column(name = "cash_movement_id", nullable = false)
    private UUID cashMovementId;

    @Column(name = "denomination_id", nullable = false)
    private UUID denominationId;

    @Column(nullable = false)
    private int quantity;

    public CashMovementDenomination(UUID cashMovementId, UUID denominationId, int quantity) {
        this.cashMovementId = cashMovementId;
        this.denominationId = denominationId;
        this.quantity = quantity;
    }
}
```

- [ ] **Step 6: Repositories**

```java
package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.CashMovement;

import java.util.List;
import java.util.UUID;

public interface CashMovementRepository extends JpaRepository<CashMovement, UUID> {
    List<CashMovement> findAllByTenantIdAndCashShiftId(UUID tenantId, UUID cashShiftId);
}
```

```java
package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.CashMovementDenomination;

import java.util.List;
import java.util.UUID;

public interface CashMovementDenominationRepository extends JpaRepository<CashMovementDenomination, UUID> {
    List<CashMovementDenomination> findAllByCashMovementId(UUID cashMovementId);
}
```

- [ ] **Step 7: DTOs**

```java
package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.cashshift.domain.CashMovementType;

import java.util.List;

public record CreateCashMovementRequest(
        @NotNull CashMovementType type,
        @NotBlank String reason,
        @JsonProperty("denominations") @NotEmpty @Valid List<DenominationCountEntry> denominations
) {}
```

```java
package rd.dalventa.api.cashshift.dto;

import rd.dalventa.api.cashshift.domain.CashMovement;
import rd.dalventa.api.cashshift.domain.CashMovementType;

import java.math.BigDecimal;
import java.util.UUID;

public record CashMovementResponse(
        UUID id,
        CashMovementType type,
        BigDecimal amount,
        String reason
) {
    public static CashMovementResponse from(CashMovement m) {
        return new CashMovementResponse(m.getId(), m.getType(), m.getAmount(), m.getReason());
    }
}
```

- [ ] **Step 8: Service**

Validate every denomination's resulting quantity BEFORE mutating any of them (so a request touching 3 denominations, one of which would go negative, rejects the whole request with zero side effects — `@Transactional` also guarantees rollback, but this pre-check gives a precise error before any lock/write happens).

```java
package rd.dalventa.api.cashshift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashMovement;
import rd.dalventa.api.cashshift.domain.CashMovementDenomination;
import rd.dalventa.api.cashshift.domain.CashMovementType;
import rd.dalventa.api.cashshift.dto.CashMovementResponse;
import rd.dalventa.api.cashshift.dto.CreateCashMovementRequest;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.repository.CashMovementDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashMovementRepository;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashMovementService {

    private final CashShiftService cashShiftService;
    private final CashShiftDenominationRepository cashShiftDenominationRepository;
    private final DenominationRepository denominationRepository;
    private final CashMovementRepository cashMovementRepository;
    private final CashMovementDenominationRepository cashMovementDenominationRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public CashMovementResponse recordMovement(UUID cashShiftId, CreateCashMovementRequest req) {
        var shift = cashShiftService.requireShiftInTenant(cashShiftId);
        var tenantId = TenantContext.require();
        boolean isOutflow = req.type() != CashMovementType.ENTRY;

        Map<UUID, rd.dalventa.api.cashshift.domain.CashShiftDenomination> locked = new HashMap<>();
        BigDecimal amount = BigDecimal.ZERO;

        for (DenominationCountEntry entry : req.denominations()) {
            var csd = cashShiftDenominationRepository
                    .lockByCashShiftIdAndDenominationId(cashShiftId, entry.denominationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Denominacion no registrada en este turno"));

            int newQuantity = isOutflow
                    ? csd.getCurrentQuantity() - entry.quantity()
                    : csd.getCurrentQuantity() + entry.quantity();
            if (newQuantity < 0) {
                throw new IllegalArgumentException("Existencia insuficiente de esa denominacion en la caja");
            }
            locked.put(entry.denominationId(), csd);

            var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
            amount = amount.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        var movement = new CashMovement(cashShiftId, req.type(), amount, req.reason(), userId);
        movement.setTenantId(tenantId);
        movement = cashMovementRepository.save(movement);

        for (DenominationCountEntry entry : req.denominations()) {
            var csd = locked.get(entry.denominationId());
            int updated = isOutflow ? csd.getCurrentQuantity() - entry.quantity() : csd.getCurrentQuantity() + entry.quantity();
            csd.setCurrentQuantity(updated);
            cashShiftDenominationRepository.save(csd);

            var cmd = new CashMovementDenomination(movement.getId(), entry.denominationId(), entry.quantity());
            cmd.setTenantId(tenantId);
            cashMovementDenominationRepository.save(cmd);
        }

        return CashMovementResponse.from(movement);
    }
}
```

- [ ] **Step 9: Add the endpoint to `CashShiftController`**

Add a new constructor-injected field `CashMovementService cashMovementService` (picked up automatically by `@RequiredArgsConstructor`) and this endpoint:

```java
    @PostMapping("/{id}/movements")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<rd.dalventa.api.cashshift.dto.CashMovementResponse> recordMovement(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody rd.dalventa.api.cashshift.dto.CreateCashMovementRequest req) {
        return ApiResponse.ok(cashMovementService.recordMovement(id, req));
    }
```
(Clean up the fully-qualified names into normal `import` statements when applying this step — shown fully-qualified here only for copy-paste clarity.)

- [ ] **Step 10: Add new repositories to `IntegrationTestBase`**

Add `CashMovementRepository` and `CashMovementDenominationRepository`; in `cleanAll()`, delete `cashMovementDenominationRepository` then `cashMovementRepository` before `cashShiftDenominationRepository.deleteAll()`.

- [ ] **Step 11: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CashMovementIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 12: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`.

- [ ] **Step 13: Commit**

```bash
git add apps/api
git commit -m "feat: add CashMovement entry/withdrawal/expense mutating live denomination balance"
```

---

### Task 4: Algoritmo de sugerencia de cambio

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/service/ChangeSuggestionCalculator.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/service/CashShiftChangeService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/ChangeSuggestionRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/ChangeSuggestionResponse.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/cashshift/web/CashShiftController.java` (add change-suggestion endpoint)
- Test: `apps/api/src/test/java/rd/dalventa/api/cashshift/service/ChangeSuggestionCalculatorTest.java` (pure unit test, no Spring context, no DB)
- Test: `apps/api/src/test/java/rd/dalventa/api/cashshift/ChangeSuggestionIntegrationTest.java`

**Interfaces:**
- Consumes: `CashShiftRepository.findByRegisterIdAndStatus(UUID, CashShiftStatus.OPEN)` (Task 2), `CashShiftDenominationRepository.findAllByCashShiftId` (Task 2), `Denomination` (Task 1).
- Produces: `ChangeSuggestionCalculator.suggest(long changeAmountCents, List<AvailableDenomination> available) : SuggestionResult` — a pure, dependency-free algorithm class. `AvailableDenomination(UUID id, long valueCents, int quantityAvailable)` and `SuggestionResult(boolean exact, Map<UUID, Integer> combination)` are records nested in or alongside this class (define them as static nested records in `ChangeSuggestionCalculator` — no other task depends on their exact location, only on `ChangeSuggestionCalculator.suggest(...)`'s behavior).

- [ ] **Step 1: Write the failing unit test for the pure algorithm**

```java
package rd.dalventa.api.cashshift.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ChangeSuggestionCalculatorTest {

    @Test
    void suggest_exactCombinationExists_returnsMinimalPieceCount() {
        var d500 = UUID.randomUUID();
        var d100 = UUID.randomUUID();
        var d50 = UUID.randomUUID();
        var available = List.of(
                new ChangeSuggestionCalculator.AvailableDenomination(d500, 50000, 5),
                new ChangeSuggestionCalculator.AvailableDenomination(d100, 10000, 5),
                new ChangeSuggestionCalculator.AvailableDenomination(d50, 5000, 5)
        );

        // Change needed: RD$650.00 = 65000 cents -> 1x500 + 1x100 + 1x50 (3 pieces)
        var result = ChangeSuggestionCalculator.suggest(65000, available);

        assertThat(result.exact()).isTrue();
        assertThat(result.combination()).containsEntry(d500, 1).containsEntry(d100, 1).containsEntry(d50, 1);
        assertThat(result.combination().values().stream().mapToInt(Integer::intValue).sum()).isEqualTo(3);
    }

    @Test
    void suggest_noExactCombination_returnsNotExact() {
        var d500 = UUID.randomUUID();
        var available = List.of(
                new ChangeSuggestionCalculator.AvailableDenomination(d500, 50000, 1)
        );

        // Change needed: RD$700.00 = 70000 cents -> cannot be made from a single 500 (only 1 available)
        var result = ChangeSuggestionCalculator.suggest(70000, available);

        assertThat(result.exact()).isFalse();
        assertThat(result.combination()).isEmpty();
    }

    @Test
    void suggest_respectsQuantityLimits_perDenomination() {
        var d100 = UUID.randomUUID();
        var available = List.of(
                new ChangeSuggestionCalculator.AvailableDenomination(d100, 10000, 2)
        );

        // Change needed: RD$300.00 = 30000 cents, needs 3x100 but only 2 available
        var result = ChangeSuggestionCalculator.suggest(30000, available);

        assertThat(result.exact()).isFalse();
    }

    @Test
    void suggest_zeroChange_returnsExactEmptyCombination() {
        var result = ChangeSuggestionCalculator.suggest(0, List.of());

        assertThat(result.exact()).isTrue();
        assertThat(result.combination()).isEmpty();
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
cd apps/api
./mvnw test -Dtest=ChangeSuggestionCalculatorTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Implement the calculator**

```java
package rd.dalventa.api.cashshift.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ChangeSuggestionCalculator {

    private ChangeSuggestionCalculator() {}

    public record AvailableDenomination(UUID denominationId, long valueCents, int quantityAvailable) {}

    public record SuggestionResult(boolean exact, Map<UUID, Integer> combination) {}

    public static SuggestionResult suggest(long changeAmountCents, List<AvailableDenomination> available) {
        if (changeAmountCents == 0) {
            return new SuggestionResult(true, Map.of());
        }

        int target = Math.toIntExact(changeAmountCents);
        int[] dp = new int[target + 1];
        java.util.Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;

        @SuppressWarnings("unchecked")
        Map<UUID, Integer>[] usedCount = new Map[target + 1];
        usedCount[0] = new HashMap<>();

        List<AvailableDenomination> byValueDesc = new ArrayList<>(available);
        byValueDesc.sort((a, b) -> Long.compare(b.valueCents(), a.valueCents()));

        for (int amount = 1; amount <= target; amount++) {
            for (AvailableDenomination denom : byValueDesc) {
                if (denom.valueCents() > amount) {
                    continue;
                }
                int prevAmount = amount - Math.toIntExact(denom.valueCents());
                Map<UUID, Integer> prevUsed = usedCount[prevAmount];
                if (prevUsed == null) {
                    continue;
                }
                int alreadyUsed = prevUsed.getOrDefault(denom.denominationId(), 0);
                if (alreadyUsed + 1 > denom.quantityAvailable()) {
                    continue;
                }
                int candidatePieces = dp[prevAmount] + 1;
                if (candidatePieces < dp[amount]) {
                    dp[amount] = candidatePieces;
                    Map<UUID, Integer> newUsed = new HashMap<>(prevUsed);
                    newUsed.merge(denom.denominationId(), 1, Integer::sum);
                    usedCount[amount] = newUsed;
                }
            }
        }

        if (dp[target] == Integer.MAX_VALUE) {
            return new SuggestionResult(false, Map.of());
        }
        return new SuggestionResult(true, usedCount[target]);
    }
}
```

- [ ] **Step 4: Run to confirm the unit test passes**

```bash
./mvnw test -Dtest=ChangeSuggestionCalculatorTest -Dspring.profiles.active=test
```
Expected: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 5: Write the failing integration test wiring it to a real shift**

```java
package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChangeSuggestionIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void changeSuggestion_forOpenShift_returnsExactCombination() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

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
        String d500 = null, d100 = null, d50 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            var v = node.path("value").asText();
            if (v.startsWith("500")) d500 = node.path("id").asText();
            if (v.startsWith("100")) d100 = node.path("id").asText();
            if (v.startsWith("50.")) d50 = node.path("id").asText();
        }

        mockMvc.perform(post("/api/cash-shifts/open")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                        + "{\"denominationId\":\"" + d500 + "\",\"quantity\":2},"
                        + "{\"denominationId\":\"" + d100 + "\",\"quantity\":2},"
                        + "{\"denominationId\":\"" + d50 + "\",\"quantity\":2}]}"));

        // Change needed: RD$650.00 -> 1x500 + 1x100 + 1x50, all available
        mockMvc.perform(post("/api/cash-shifts/change-suggestion")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"changeAmountCents\":65000,"
                                + "\"receivedDenominations\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exact").value(true));
    }

    @Test
    void changeSuggestion_withoutOpenShift_returnsNotFound() throws Exception {
        String token = registerTenantAndGetToken("admin2@dalventa.test", "Secret123!");

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

        mockMvc.perform(post("/api/cash-shifts/change-suggestion")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"changeAmountCents\":1000,"
                                + "\"receivedDenominations\":[]}"))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 6: Run to confirm compile failure**

```bash
./mvnw test -Dtest=ChangeSuggestionIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 7: DTOs**

```java
package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;
import java.util.UUID;

public record ChangeSuggestionRequest(
        @JsonProperty("registerId") @NotNull UUID registerId,
        @JsonProperty("changeAmountCents") @PositiveOrZero long changeAmountCents,
        @JsonProperty("receivedDenominations") List<DenominationCountEntry> receivedDenominations
) {}
```

```java
package rd.dalventa.api.cashshift.dto;

import java.util.List;

public record ChangeSuggestionResponse(
        boolean exact,
        List<DenominationCountEntry> combination
) {}
```

- [ ] **Step 8: Orchestration service**

```java
package rd.dalventa.api.cashshift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;
import rd.dalventa.api.cashshift.dto.ChangeSuggestionRequest;
import rd.dalventa.api.cashshift.dto.ChangeSuggestionResponse;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.denomination.domain.Denomination;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashShiftChangeService {

    private final CashShiftRepository cashShiftRepository;
    private final CashShiftDenominationRepository cashShiftDenominationRepository;
    private final DenominationRepository denominationRepository;

    @Transactional(readOnly = true)
    public ChangeSuggestionResponse suggest(ChangeSuggestionRequest req) {
        var tenantId = TenantContext.require();
        var shift = cashShiftRepository.findByRegisterIdAndStatus(req.registerId(), CashShiftStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException("No hay turno abierto en esa caja"));

        Map<UUID, Denomination> denominationsById = denominationRepository
                .findAllByTenantIdAndActiveTrue(tenantId).stream()
                .collect(java.util.stream.Collectors.toMap(Denomination::getId, d -> d));

        Map<UUID, Integer> receivedByDenomination = new HashMap<>();
        if (req.receivedDenominations() != null) {
            for (DenominationCountEntry entry : req.receivedDenominations()) {
                receivedByDenomination.merge(entry.denominationId(), entry.quantity(), Integer::sum);
            }
        }

        List<ChangeSuggestionCalculator.AvailableDenomination> available = new ArrayList<>();
        for (var csd : cashShiftDenominationRepository.findAllByCashShiftId(shift.getId())) {
            var denomination = denominationsById.get(csd.getDenominationId());
            if (denomination == null) {
                continue;
            }
            long valueCents = denomination.getValue().multiply(BigDecimal.valueOf(100)).longValueExact();
            int quantity = csd.getCurrentQuantity() + receivedByDenomination.getOrDefault(csd.getDenominationId(), 0);
            available.add(new ChangeSuggestionCalculator.AvailableDenomination(csd.getDenominationId(), valueCents, quantity));
        }

        var result = ChangeSuggestionCalculator.suggest(req.changeAmountCents(), available);
        List<DenominationCountEntry> combination = result.combination().entrySet().stream()
                .map(e -> new DenominationCountEntry(e.getKey(), e.getValue()))
                .toList();
        return new ChangeSuggestionResponse(result.exact(), combination);
    }
}
```

- [ ] **Step 9: Add the endpoint to `CashShiftController`**

```java
    @PostMapping("/change-suggestion")
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<rd.dalventa.api.cashshift.dto.ChangeSuggestionResponse> changeSuggestion(
            @Valid @RequestBody rd.dalventa.api.cashshift.dto.ChangeSuggestionRequest req) {
        return ApiResponse.ok(cashShiftChangeService.suggest(req));
    }
```
(Add the `CashShiftChangeService cashShiftChangeService` constructor field, clean up fully-qualified names into imports.)

- [ ] **Step 10: Run both tests to confirm they pass**

```bash
./mvnw test -Dtest=ChangeSuggestionIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 11: Run the full suite**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`.

- [ ] **Step 12: Commit**

```bash
git add apps/api
git commit -m "feat: add change-suggestion algorithm (pure DP calculator + preview endpoint)"
```

---

### Task 5: Cierre de turno + historial

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/cashshift/dto/CloseCashShiftRequest.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/cashshift/service/CashShiftService.java` (add `close`, `list`)
- Modify: `apps/api/src/main/java/rd/dalventa/api/cashshift/web/CashShiftController.java` (add close + history endpoints)
- Test: `apps/api/src/test/java/rd/dalventa/api/cashshift/CashShiftCloseIntegrationTest.java`

**Interfaces:**
- Consumes: `CashMovementRepository.findAllByTenantIdAndCashShiftId` (Task 3) to compute `expectedCash`.

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

class CashShiftCloseIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String shiftId, String d500) {}

    private Setup openShiftWithFourFiveHundreds(String email) throws Exception {
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
        String d500 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":4}]}"))
                .andReturn().getResponse().getContentAsString();
        var shiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        return new Setup(token, shiftId, d500);
    }

    @Test
    void closeShift_matchingCount_noDifference_closesWithoutRequiringNotes() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":4}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"))
                .andExpect(jsonPath("$.data.cashDifference").value("0.00"));
    }

    @Test
    void closeShift_withDifferenceAndNoNotes_returnsBadRequest() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin2@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":3}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void closeShift_withDifferenceAndNotes_closesAndRecordsDifference() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin3@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":3}],"
                                + "\"closingNotes\":\"Faltante detectado, en revision\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cashDifference").value("-500.00"));
    }

    @Test
    void closeShift_alreadyClosed_returnsConflict() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin4@dalventa.test");
        String closeBody = "{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":4}]}";

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content(closeBody));

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content(closeBody))
                .andExpect(status().isConflict());
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=CashShiftCloseIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: DTO**

```java
package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CloseCashShiftRequest(
        @JsonProperty("closingCounts") @NotEmpty @Valid List<DenominationCountEntry> closingCounts,
        @JsonProperty("closingNotes") String closingNotes
) {}
```

- [ ] **Step 4: Add `close` to `CashShiftService`**

Add these fields to the existing `CashShiftService` constructor-injected list (Lombok picks them up): `CashMovementRepository cashMovementRepository`. Add this method:

```java
    @Transactional
    public CashShiftSummaryResponse close(UUID id, rd.dalventa.api.cashshift.dto.CloseCashShiftRequest req) {
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

        BigDecimal expectedCash = shift.getOpeningTotal();
        for (var movement : cashMovementRepository.findAllByTenantIdAndCashShiftId(tenantId, id)) {
            expectedCash = switch (movement.getType()) {
                case ENTRY -> expectedCash.add(movement.getAmount());
                case WITHDRAWAL, EXPENSE -> expectedCash.subtract(movement.getAmount());
            };
        }

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
```

Add the necessary imports to `CashShiftService.java`: `rd.dalventa.api.cashshift.dto.DenominationCountEntry`, `rd.dalventa.api.cashshift.repository.CashMovementRepository`, `rd.dalventa.api.shared.web.DuplicateResourceException`.

- [ ] **Step 5: Add endpoints to `CashShiftController`**

```java
    @PostMapping("/{id}/close")
    @PreAuthorize("@permissionService.has('CASHSHIFT_CLOSE')")
    public ApiResponse<CashShiftSummaryResponse> close(
            @PathVariable UUID id,
            @Valid @RequestBody rd.dalventa.api.cashshift.dto.CloseCashShiftRequest req) {
        return ApiResponse.ok(cashShiftService.close(id, req));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('CASHSHIFT_VIEW_HISTORY')")
    public ApiResponse<java.util.List<CashShiftSummaryResponse>> list(@RequestParam UUID registerId) {
        return ApiResponse.ok(cashShiftService.list(registerId));
    }
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CashShiftCloseIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 7: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`. Total should be 47 (baseline after Product/BranchInventory) + 3 (Denomination) + 3 (CashShift open) + 2 (CashMovement) + 4 (ChangeSuggestionCalculator unit) + 2 (ChangeSuggestion integration) + 4 (Close) = 65.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat: add CashShift close with expected-vs-counted cash difference"
```

---

## What comes after this plan

This plan delivers the full cash-shift lifecycle without `Sale`. The next plan is POS/Sale: creating a sale will (a) call `InventoryMovementService.recordMovement` (from the Product/BranchInventory plan) to decrement stock, and (b) for cash payments, call into this plan's `ChangeSuggestionCalculator`/`CashShiftDenominationRepository` to confirm and *persist* the change given (this plan only previews) via a new `CashMovement`-like mechanism or a direct `CashShiftDenomination` mutation — that persistence path is POS/Sale's job, not this plan's. `CashShiftService.close`'s `expectedCash` formula gains a "ventas en efectivo" line at that point; the formula's structure (start from `openingTotal`, loop movements, add/subtract) is designed to extend by adding one more loop over `Sale` cash payments, not to be rewritten.
