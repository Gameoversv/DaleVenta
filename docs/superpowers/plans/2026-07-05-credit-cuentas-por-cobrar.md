# Credit / Cuentas por Cobrar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Note for this run:** executed inline in the current session by the controller directly (no subagent dispatch), per explicit user instruction. TDD discipline and per-task test verification still apply exactly as written below.

**Goal:** Add `CREDIT` as a third `PaymentMethod`, backed by a single running balance per customer (`CreditAccount`), with profile management, abonos, and transaction history.

**Architecture:** New `credit` package (`CustomerCreditProfile`, `CreditAccount`, `CreditTransaction`) following the established tenant-scoped + lazy-creation + pessimistic-lock pattern (`BranchInventory`, `CashShiftDenomination`). `SaleService.create`/`voidSale` (existing) are extended, not rewritten, to call into `CreditService` for the `CREDIT` branch — same shape as the existing `CASH`/`TRANSFER` branches.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Data JPA, PostgreSQL, Flyway, JUnit 5, MockMvc.

## Global Constraints

- Money fields: `NUMERIC(14,2)` in Postgres, `BigDecimal` in Java — never float/double.
- Every new table: `tenant_id UUID NOT NULL REFERENCES tenants(id)`, indexed.
- Never throw a bare `org.springframework.web.server.ResponseStatusException`. Use `rd.dalventa.api.shared.web.ResourceNotFoundException` (404), `rd.dalventa.api.shared.web.DuplicateResourceException` (409), `IllegalArgumentException`/`IllegalStateException` (400, already mapped), or `org.springframework.security.access.AccessDeniedException` (403, already mapped by `GlobalExceptionHandler`) — this project's real bugs so far have all been variations of skipping this rule or the next two.
- Jackson: `application.yml` sets `spring.jackson.property-naming-strategy: SNAKE_CASE` globally. Every multi-word camelCase field in any request/response DTO needs `@JsonProperty("exactCamelCaseName")` — a real bug in the previous plan (`discountAmount`) came from forgetting this on exactly one field.
- Every `BigDecimal` field in a response DTO needs `@JsonFormat(shape = JsonFormat.Shape.STRING)`. Every `BigDecimal.ZERO` used as a default value must be `.setScale(2, RoundingMode.HALF_UP)` — a real bug in the previous plan came from a bare `BigDecimal.ZERO` serializing as `"0"` instead of `"0.00"`.
- Concurrency: any mutation of `CreditAccount.balance` must go through a `@Lock(LockModeType.PESSIMISTIC_WRITE)` repository method, same pattern as `BranchInventoryRepository.lockByTenantIdAndBranchIdAndProductId` / `CashShiftDenominationRepository.lockByCashShiftIdAndDenominationId`.
- `SaleService.create`/`voidSale` are modified in place (existing methods extended with a `CREDIT` branch), not duplicated or rewritten.
- No due dates, no overdue blocking, no per-sale `CreditAccount` — one balance per customer, decided explicitly in this plan's design.
- Postgres for tests: `dalventa_test_db` container (db `dalventa_test`/user `dalventa`/password `changeme`) — `docker ps` to check, `docker run -d --name dalventa_test_db -p 5432:5432 -e POSTGRES_DB=dalventa_test -e POSTGRES_USER=dalventa -e POSTGRES_PASSWORD=changeme postgres:16-alpine` if not running.
- Migrations start at `V18` (directory currently ends at `V17__sales.sql`).

---

### Task 1: `CustomerCreditProfile` + `CreditAccount` — profile and balance query

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/domain/CustomerCreditProfile.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/domain/CreditAccount.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/repository/CustomerCreditProfileRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/repository/CreditAccountRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/dto/UpdateCreditProfileRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/dto/CreditProfileResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/dto/CreditAccountResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/service/CreditService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/web/CreditController.java`
- Create: `apps/api/src/main/resources/db/migration/V18__credit.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/credit/CreditProfileIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `CustomerCreditProfileRepository`, `CreditAccountRepository`)

**Interfaces:**
- Consumes: `CustomerRepository.findByIdAndTenantIdAndActiveTrue` (existing).
- Produces: `CustomerCreditProfileRepository.findByCustomerIdAndTenantId(UUID, UUID) : Optional<CustomerCreditProfile>`, `CreditAccountRepository.findByCustomerIdAndTenantId(UUID, UUID) : Optional<CreditAccount>`, `CreditAccountRepository.lockByCustomerIdAndTenantId(UUID, UUID) : Optional<CreditAccount>` (pessimistic write) — Task 2's `CreditService.charge`/`reverseCharge` and Task 3's abono endpoint both depend on these exact signatures. `CreditService.getOrCreateAccount(UUID tenantId, UUID customerId) : CreditAccount` (package-visible, lazy-creation helper) — Task 2 calls this directly.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.credit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CreditProfileIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String customerId) {}

    private Setup setup(String email) throws Exception {
        String token = registerTenantAndGetToken(email, "Secret123!");

        var customerRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"first_name\":\"Juana\",\"last_name\":\"Perez\"}"))
                .andReturn().getResponse().getContentAsString();
        var customerId = objectMapper.readTree(customerRes).path("data").path("id").asText();

        return new Setup(token, customerId);
    }

    @Test
    void updateCreditProfile_asAdmin_persists() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(put("/api/customers/" + s.customerId() + "/credit-profile")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"creditEnabled\":true,\"creditLimit\":\"5000.00\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.creditEnabled").value(true))
                .andExpect(jsonPath("$.data.creditLimit").value("5000.00"));
    }

    @Test
    void getCreditAccount_beforeAnyActivity_returnsZeroBalance() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-account")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balance").value("0.00"));
    }

    @Test
    void updateCreditProfile_forCustomerOfOtherTenant_returnsNotFound() throws Exception {
        var s = setup("admin3@dalventa.test");
        registerTenantAndGetToken("admin4@dalventa.test", "Secret123!");
        String otherToken = registerTenantAndGetToken("admin5@dalventa.test", "Secret123!");

        mockMvc.perform(put("/api/customers/" + s.customerId() + "/credit-profile")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType("application/json")
                        .content("{\"creditEnabled\":true,\"creditLimit\":\"1000.00\"}"))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
cd apps/api
./mvnw test -Dtest=CreditProfileIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE customer_credit_profiles (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID          NOT NULL REFERENCES tenants(id),
    customer_id    UUID          NOT NULL REFERENCES customers(id),
    credit_enabled BOOLEAN       NOT NULL DEFAULT FALSE,
    credit_limit   NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE UNIQUE INDEX idx_ccp_tenant_customer ON customer_credit_profiles(tenant_id, customer_id);

CREATE TABLE credit_accounts (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id),
    customer_id UUID          NOT NULL REFERENCES customers(id),
    balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE UNIQUE INDEX idx_credit_accounts_tenant_customer ON credit_accounts(tenant_id, customer_id);

CREATE TABLE credit_transactions (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID          NOT NULL REFERENCES tenants(id),
    credit_account_id UUID          NOT NULL REFERENCES credit_accounts(id),
    type              VARCHAR(20)   NOT NULL,
    amount            NUMERIC(14,2) NOT NULL,
    sale_id           UUID          REFERENCES sales(id),
    user_id           UUID          NOT NULL REFERENCES users(id),
    note              TEXT,
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE INDEX idx_credit_transactions_account_id ON credit_transactions(credit_account_id);
CREATE INDEX idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);
```
Save as `apps/api/src/main/resources/db/migration/V18__credit.sql`. (This migration also creates `credit_transactions` even though Task 1 doesn't use it yet — it's one cohesive schema change for the whole module, matching how `V15__cash_shifts.sql` created both `cash_shifts` and `cash_shift_denominations` in one file even though a later task added the movements referencing them.)

- [ ] **Step 4: Entities**

```java
package rd.dalventa.api.credit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "customer_credit_profiles")
public class CustomerCreditProfile extends TenantAwareEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "credit_enabled", nullable = false)
    private boolean creditEnabled = false;

    @Column(name = "credit_limit", nullable = false)
    private BigDecimal creditLimit = BigDecimal.ZERO.setScale(2);

    public CustomerCreditProfile(UUID customerId) {
        this.customerId = customerId;
    }
}
```

```java
package rd.dalventa.api.credit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "credit_accounts")
public class CreditAccount extends TenantAwareEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private BigDecimal balance = BigDecimal.ZERO.setScale(2);

    public CreditAccount(UUID customerId) {
        this.customerId = customerId;
    }
}
```

- [ ] **Step 5: Repositories**

```java
package rd.dalventa.api.credit.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.credit.domain.CustomerCreditProfile;

import java.util.Optional;
import java.util.UUID;

public interface CustomerCreditProfileRepository extends JpaRepository<CustomerCreditProfile, UUID> {
    Optional<CustomerCreditProfile> findByCustomerIdAndTenantId(UUID customerId, UUID tenantId);
}
```

```java
package rd.dalventa.api.credit.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.credit.domain.CreditAccount;

import java.util.Optional;
import java.util.UUID;

public interface CreditAccountRepository extends JpaRepository<CreditAccount, UUID> {
    Optional<CreditAccount> findByCustomerIdAndTenantId(UUID customerId, UUID tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ca from CreditAccount ca where ca.customerId = :customerId and ca.tenantId = :tenantId")
    Optional<CreditAccount> lockByCustomerIdAndTenantId(UUID customerId, UUID tenantId);
}
```

- [ ] **Step 6: DTOs**

```java
package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateCreditProfileRequest(
        @JsonProperty("creditEnabled") @NotNull boolean creditEnabled,
        @JsonProperty("creditLimit") @NotNull BigDecimal creditLimit
) {}
```

```java
package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.credit.domain.CustomerCreditProfile;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditProfileResponse(
        @JsonProperty("customerId") UUID customerId,
        @JsonProperty("creditEnabled") boolean creditEnabled,
        @JsonProperty("creditLimit") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal creditLimit
) {
    public static CreditProfileResponse from(CustomerCreditProfile profile) {
        return new CreditProfileResponse(profile.getCustomerId(), profile.isCreditEnabled(), profile.getCreditLimit());
    }
}
```

```java
package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.credit.domain.CreditAccount;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditAccountResponse(
        @JsonProperty("customerId") UUID customerId,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal balance
) {
    public static CreditAccountResponse from(CreditAccount account) {
        return new CreditAccountResponse(account.getCustomerId(), account.getBalance());
    }
}
```

- [ ] **Step 7: Service**

```java
package rd.dalventa.api.credit.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.credit.domain.CreditAccount;
import rd.dalventa.api.credit.domain.CustomerCreditProfile;
import rd.dalventa.api.credit.dto.CreditAccountResponse;
import rd.dalventa.api.credit.dto.CreditProfileResponse;
import rd.dalventa.api.credit.dto.UpdateCreditProfileRequest;
import rd.dalventa.api.credit.repository.CreditAccountRepository;
import rd.dalventa.api.credit.repository.CustomerCreditProfileRepository;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final CustomerCreditProfileRepository customerCreditProfileRepository;
    private final CreditAccountRepository creditAccountRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public CreditProfileResponse updateProfile(UUID customerId, UpdateCreditProfileRequest req) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var profile = customerCreditProfileRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var p = new CustomerCreditProfile(customerId);
                    p.setTenantId(tenantId);
                    return p;
                });
        profile.setCreditEnabled(req.creditEnabled());
        profile.setCreditLimit(req.creditLimit().setScale(2, java.math.RoundingMode.HALF_UP));
        return CreditProfileResponse.from(customerCreditProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public CreditAccountResponse getAccount(UUID customerId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = creditAccountRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var a = new CreditAccount(customerId);
                    a.setTenantId(tenantId);
                    return a;
                });
        return CreditAccountResponse.from(account);
    }

    CreditAccount getOrCreateAccount(UUID tenantId, UUID customerId) {
        return creditAccountRepository.lockByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var a = new CreditAccount(customerId);
                    a.setTenantId(tenantId);
                    return creditAccountRepository.save(a);
                });
    }
}
```

- [ ] **Step 8: Controller**

```java
package rd.dalventa.api.credit.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.credit.dto.CreditAccountResponse;
import rd.dalventa.api.credit.dto.CreditProfileResponse;
import rd.dalventa.api.credit.dto.UpdateCreditProfileRequest;
import rd.dalventa.api.credit.service.CreditService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.UUID;

@RestController
@RequestMapping("/api/customers/{customerId}")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;

    @PutMapping("/credit-profile")
    @PreAuthorize("@permissionService.has('CREDIT_AUTHORIZE')")
    public ApiResponse<CreditProfileResponse> updateProfile(
            @PathVariable UUID customerId,
            @Valid @RequestBody UpdateCreditProfileRequest req) {
        return ApiResponse.ok(creditService.updateProfile(customerId, req));
    }

    @GetMapping("/credit-account")
    @PreAuthorize("@permissionService.has('CUSTOMER_EDIT')")
    public ApiResponse<CreditAccountResponse> getAccount(@PathVariable UUID customerId) {
        return ApiResponse.ok(creditService.getAccount(customerId));
    }
}
```

- [ ] **Step 9: Add repositories to `IntegrationTestBase`**

Add `CustomerCreditProfileRepository` and `CreditAccountRepository` fields; in `cleanAll()`, delete both before `customerRepository.deleteAll()` (they reference `customers`).

- [ ] **Step 10: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CreditProfileIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "feat: add CustomerCreditProfile and CreditAccount with profile/balance endpoints"
```

---

### Task 2: `PaymentMethod.CREDIT` in `SaleService.create`

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/domain/CreditTransactionType.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/domain/CreditTransaction.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/repository/CreditTransactionRepository.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/credit/service/CreditService.java` (add `charge`, `reverseCharge`)
- Modify: `apps/api/src/main/java/rd/dalventa/api/sale/domain/PaymentMethod.java` (add `CREDIT`)
- Modify: `apps/api/src/main/java/rd/dalventa/api/sale/service/SaleService.java` (add `CREDIT` branch to the payments loop)
- Test: `apps/api/src/test/java/rd/dalventa/api/sale/SaleCreditPaymentIntegrationTest.java`

**Interfaces:**
- Consumes: `CreditService.getOrCreateAccount(UUID, UUID)` (Task 1, package-visible — this task's `CreditService.charge` is added in the same class/package, so it can call it directly).
- Produces: `CreditService.charge(UUID tenantId, UUID customerId, java.math.BigDecimal amount, java.util.UUID saleId, java.util.UUID userId) : void` (throws `IllegalArgumentException` if not enabled or over limit) and `CreditService.reverseCharge(UUID tenantId, UUID customerId, java.math.BigDecimal amount, java.util.UUID saleId, java.util.UUID userId) : void` — Task 4 (void) calls `reverseCharge` directly.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.sale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleCreditPaymentIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String branchId, UUID registerId, UUID cashShiftId, UUID productId, String customerId) {}

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

        var categoryRes = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        var categoryId = objectMapper.readTree(categoryRes).path("data").path("id").asText();

        var productRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"0.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = UUID.fromString(objectMapper.readTree(productRes).path("data").path("id").asText());

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + productId
                        + "\",\"type\":\"ENTRY\",\"quantity\":50,\"reason\":\"Compra inicial\"}"));

        var d500Res = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String d500 = null;
        for (var node : objectMapper.readTree(d500Res).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":2}]}"))
                .andReturn().getResponse().getContentAsString();
        var cashShiftId = UUID.fromString(objectMapper.readTree(openRes).path("data").path("id").asText());

        var customerRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"first_name\":\"Juana\",\"last_name\":\"Perez\"}"))
                .andReturn().getResponse().getContentAsString();
        var customerId = objectMapper.readTree(customerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/customers/" + customerId + "/credit-profile")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"creditEnabled\":true,\"creditLimit\":\"1000.00\"}"));

        return new Setup(token, branchId, registerId, cashShiftId, productId, customerId);
    }

    @Test
    void createSale_creditPayment_increasesBalance() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":\"" + s.customerId() + "\",\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"250.00\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value("250.00"));

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-account")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.balance").value("250.00"));
    }

    @Test
    void createSale_creditPaymentWithoutCustomer_returnsBadRequest() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"250.00\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSale_creditPaymentExceedingLimit_rollsBackInventory() throws Exception {
        var s = setup("admin3@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":\"" + s.customerId() + "\",\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":5,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"1250.00\"}]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/inventory/branch/" + s.branchId())
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data[0].currentStock").value(50));
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=SaleCreditPaymentIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error (`CREDIT` doesn't exist on `PaymentMethod` yet).

- [ ] **Step 3: `CreditTransactionType` enum**

```java
package rd.dalventa.api.credit.domain;

public enum CreditTransactionType {
    CHARGE,
    PAYMENT
}
```

- [ ] **Step 4: `CreditTransaction` entity**

```java
package rd.dalventa.api.credit.domain;

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
@Table(name = "credit_transactions")
public class CreditTransaction extends TenantAwareEntity {

    @Column(name = "credit_account_id", nullable = false)
    private UUID creditAccountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CreditTransactionType type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "sale_id")
    private UUID saleId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column
    private String note;

    public CreditTransaction(UUID creditAccountId, CreditTransactionType type, BigDecimal amount,
                              UUID saleId, UUID userId, String note) {
        this.creditAccountId = creditAccountId;
        this.type = type;
        this.amount = amount;
        this.saleId = saleId;
        this.userId = userId;
        this.note = note;
    }
}
```

- [ ] **Step 5: Repository**

```java
package rd.dalventa.api.credit.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.credit.domain.CreditTransaction;

import java.util.List;
import java.util.UUID;

public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, UUID> {
    List<CreditTransaction> findAllByTenantIdAndCreditAccountId(UUID tenantId, UUID creditAccountId);
    List<CreditTransaction> findAllByTenantIdAndSaleId(UUID tenantId, UUID saleId);
}
```

- [ ] **Step 6: Add `charge`/`reverseCharge` to `CreditService`**

Add this field to the existing `CreditService` constructor-injected list (Lombok picks it up): `CreditTransactionRepository creditTransactionRepository`.

```java
    @Transactional
    public void charge(UUID tenantId, UUID customerId, java.math.BigDecimal amount, UUID saleId, UUID userId) {
        var profile = customerCreditProfileRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("El cliente no tiene credito habilitado"));
        if (!profile.isCreditEnabled()) {
            throw new IllegalArgumentException("El cliente no tiene credito habilitado");
        }

        var account = getOrCreateAccount(tenantId, customerId);
        var newBalance = account.getBalance().add(amount);
        if (newBalance.compareTo(profile.getCreditLimit()) > 0) {
            throw new IllegalArgumentException("La venta excede el limite de credito disponible");
        }

        account.setBalance(newBalance);
        creditAccountRepository.save(account);

        var transaction = new CreditTransaction(account.getId(), CreditTransactionType.CHARGE, amount, saleId, userId, null);
        transaction.setTenantId(tenantId);
        creditTransactionRepository.save(transaction);
    }

    @Transactional
    public void reverseCharge(UUID tenantId, UUID customerId, java.math.BigDecimal amount, UUID saleId, UUID userId) {
        var account = getOrCreateAccount(tenantId, customerId);
        account.setBalance(account.getBalance().subtract(amount));
        creditAccountRepository.save(account);

        var transaction = new CreditTransaction(account.getId(), CreditTransactionType.PAYMENT, amount, saleId, userId, "Anulacion venta");
        transaction.setTenantId(tenantId);
        creditTransactionRepository.save(transaction);
    }
```

Add the necessary imports to `CreditService.java`: `rd.dalventa.api.credit.domain.CreditTransaction`, `rd.dalventa.api.credit.domain.CreditTransactionType`, `rd.dalventa.api.credit.repository.CreditTransactionRepository`, `java.util.UUID` (already present).

- [ ] **Step 7: Add `CREDIT` to `PaymentMethod`**

```java
package rd.dalventa.api.sale.domain;

public enum PaymentMethod {
    CASH,
    TRANSFER,
    CREDIT
}
```

- [ ] **Step 8: Add the `CREDIT` branch to `SaleService.create`**

Add this field to the existing `SaleService` constructor-injected list: `rd.dalventa.api.credit.service.CreditService creditService`.

Immediately after the existing `if (req.customerId() != null) { ... }` block in `create`, add:

```java
        boolean hasCreditPayment = req.payments().stream().anyMatch(p -> p.method() == PaymentMethod.CREDIT);
        if (hasCreditPayment && req.customerId() == null) {
            throw new IllegalArgumentException("Una venta a credito requiere un cliente");
        }
        if (hasCreditPayment && !currentUserProvider.current()
                .map(user -> permissionResolutionService.has(user, PermissionCode.CREDIT_AUTHORIZE))
                .orElse(false)) {
            throw new org.springframework.security.access.AccessDeniedException("No tiene permiso para vender a credito");
        }
```

Then, in the payments loop's `if/else if/else` chain, add a new branch right before the final `else` (i.e., after the `CASH` branch's closing `}`):

```java
            } else if (paymentReq.method() == PaymentMethod.CREDIT) {
                var payment = new Payment(sale.getId(), PaymentMethod.CREDIT, paymentReq.amount());
                payment.setTenantId(tenantId);
                paymentRepository.save(payment);

                creditService.charge(tenantId, req.customerId(), paymentReq.amount(), sale.getId(), userId);
            } else {
```

- [ ] **Step 9: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=SaleCreditPaymentIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 10: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`.

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "feat: add CREDIT payment method to Sale, backed by CreditAccount"
```

---

### Task 3: Abonos + transaction history

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/dto/RecordCreditPaymentRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/credit/dto/CreditTransactionResponse.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/credit/service/CreditService.java` (add `recordPayment`, `listTransactions`)
- Modify: `apps/api/src/main/java/rd/dalventa/api/credit/web/CreditController.java` (add both endpoints)
- Test: `apps/api/src/test/java/rd/dalventa/api/credit/CreditPaymentIntegrationTest.java`

**Interfaces:**
- Consumes: `CreditAccountRepository.lockByCustomerIdAndTenantId` (Task 1), `CreditTransactionRepository.findAllByTenantIdAndCreditAccountId` (Task 2).

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.credit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CreditPaymentIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String customerId) {}

    private Setup setupWithBalance(String email, String balanceAmount) throws Exception {
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

        var categoryRes = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        var categoryId = objectMapper.readTree(categoryRes).path("data").path("id").asText();

        var productRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"" + balanceAmount + "\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"0.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = objectMapper.readTree(productRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + productId
                        + "\",\"type\":\"ENTRY\",\"quantity\":10,\"reason\":\"Compra inicial\"}"));

        var d500Res = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String d500 = null;
        for (var node : objectMapper.readTree(d500Res).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":2}]}"))
                .andReturn().getResponse().getContentAsString();
        var cashShiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        var customerRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"first_name\":\"Juana\",\"last_name\":\"Perez\"}"))
                .andReturn().getResponse().getContentAsString();
        var customerId = objectMapper.readTree(customerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/customers/" + customerId + "/credit-profile")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"creditEnabled\":true,\"creditLimit\":\"1000.00\"}"));

        mockMvc.perform(post("/api/sales")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"registerId\":\"" + registerId + "\",\"cashShiftId\":\"" + cashShiftId + "\","
                        + "\"customerId\":\"" + customerId + "\",\"items\":[{\"productId\":\"" + productId
                        + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                        + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"" + balanceAmount + "\"}]}"));

        return new Setup(token, customerId);
    }

    @Test
    void recordPayment_reducesBalance() throws Exception {
        var s = setupWithBalance("admin@dalventa.test", "300.00");

        mockMvc.perform(post("/api/customers/" + s.customerId() + "/credit-payments")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"amount\":\"100.00\",\"note\":\"Abono parcial\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-account")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.balance").value("200.00"));
    }

    @Test
    void recordPayment_exceedingBalance_returnsBadRequest() throws Exception {
        var s = setupWithBalance("admin2@dalventa.test", "100.00");

        mockMvc.perform(post("/api/customers/" + s.customerId() + "/credit-payments")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"amount\":\"500.00\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listTransactions_showsChargeAndPayment() throws Exception {
        var s = setupWithBalance("admin3@dalventa.test", "300.00");

        mockMvc.perform(post("/api/customers/" + s.customerId() + "/credit-payments")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"amount\":\"100.00\"}"));

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-transactions")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].type").value("CHARGE"))
                .andExpect(jsonPath("$.data[1].type").value("PAYMENT"));
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=CreditPaymentIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: DTOs**

```java
package rd.dalventa.api.credit.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record RecordCreditPaymentRequest(
        @NotNull @Positive BigDecimal amount,
        String note
) {}
```

```java
package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.credit.domain.CreditTransaction;
import rd.dalventa.api.credit.domain.CreditTransactionType;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditTransactionResponse(
        UUID id,
        CreditTransactionType type,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount,
        @JsonProperty("saleId") UUID saleId,
        String note
) {
    public static CreditTransactionResponse from(CreditTransaction t) {
        return new CreditTransactionResponse(t.getId(), t.getType(), t.getAmount(), t.getSaleId(), t.getNote());
    }
}
```

- [ ] **Step 4: Add `recordPayment`/`listTransactions` to `CreditService`**

```java
    @Transactional
    public CreditAccountResponse recordPayment(UUID customerId, RecordCreditPaymentRequest req, UUID userId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = getOrCreateAccount(tenantId, customerId);
        if (req.amount().compareTo(account.getBalance()) > 0) {
            throw new IllegalArgumentException("El abono no puede ser mayor al balance actual");
        }

        account.setBalance(account.getBalance().subtract(req.amount()));
        creditAccountRepository.save(account);

        var transaction = new CreditTransaction(account.getId(), CreditTransactionType.PAYMENT, req.amount(), null, userId, req.note());
        transaction.setTenantId(tenantId);
        creditTransactionRepository.save(transaction);

        return CreditAccountResponse.from(account);
    }

    @Transactional(readOnly = true)
    public java.util.List<CreditTransactionResponse> listTransactions(UUID customerId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = creditAccountRepository.findByCustomerIdAndTenantId(customerId, tenantId).orElse(null);
        if (account == null) {
            return java.util.List.of();
        }
        return creditTransactionRepository.findAllByTenantIdAndCreditAccountId(tenantId, account.getId())
                .stream().map(CreditTransactionResponse::from).toList();
    }
```

Add imports to `CreditService.java`: `rd.dalventa.api.credit.dto.RecordCreditPaymentRequest`, `rd.dalventa.api.credit.dto.CreditTransactionResponse`.

- [ ] **Step 5: Add endpoints to `CreditController`**

Add the imports `org.springframework.http.HttpStatus`, `rd.dalventa.api.credit.dto.RecordCreditPaymentRequest`, `rd.dalventa.api.credit.dto.CreditTransactionResponse`, `rd.dalventa.api.shared.security.CurrentUserProvider` to `CreditController.java`, add a `CurrentUserProvider currentUserProvider` constructor field, and add these two methods to the existing class:

```java
    @PostMapping("/credit-payments")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('CREDIT_RECEIVE_PAYMENT')")
    public ApiResponse<CreditAccountResponse> recordPayment(
            @PathVariable UUID customerId,
            @Valid @RequestBody RecordCreditPaymentRequest req) {
        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        return ApiResponse.ok(creditService.recordPayment(customerId, req, userId));
    }

    @GetMapping("/credit-transactions")
    @PreAuthorize("@permissionService.has('CUSTOMER_EDIT')")
    public ApiResponse<java.util.List<CreditTransactionResponse>> listTransactions(@PathVariable UUID customerId) {
        return ApiResponse.ok(creditService.listTransactions(customerId));
    }
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CreditPaymentIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 7: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat: add credit abono endpoint and transaction history"
```

---

### Task 4: Reverse credit charge on `SaleService.voidSale`

**Files:**
- Modify: `apps/api/src/main/java/rd/dalventa/api/sale/service/SaleService.java` (extend `voidSale`)
- Test: `apps/api/src/test/java/rd/dalventa/api/sale/SaleCreditVoidIntegrationTest.java`

**Interfaces:**
- Consumes: `CreditService.reverseCharge(UUID, UUID, BigDecimal, UUID, UUID)` (Task 2).

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.sale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleCreditVoidIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void voidSale_creditPayment_reversesBalance() throws Exception {
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

        var categoryRes = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        var categoryId = objectMapper.readTree(categoryRes).path("data").path("id").asText();

        var productRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"0.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = objectMapper.readTree(productRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + productId
                        + "\",\"type\":\"ENTRY\",\"quantity\":10,\"reason\":\"Compra inicial\"}"));

        var d500Res = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String d500 = null;
        for (var node : objectMapper.readTree(d500Res).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":2}]}"))
                .andReturn().getResponse().getContentAsString();
        var cashShiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        var customerRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"first_name\":\"Juana\",\"last_name\":\"Perez\"}"))
                .andReturn().getResponse().getContentAsString();
        var customerId = objectMapper.readTree(customerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/customers/" + customerId + "/credit-profile")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"creditEnabled\":true,\"creditLimit\":\"1000.00\"}"));

        var saleRes = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"cashShiftId\":\"" + cashShiftId + "\","
                                + "\"customerId\":\"" + customerId + "\",\"items\":[{\"productId\":\"" + productId
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"250.00\"}]}"))
                .andReturn().getResponse().getContentAsString();
        var saleId = objectMapper.readTree(saleRes).path("data").path("id").asText();

        mockMvc.perform(get("/api/customers/" + customerId + "/credit-account")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.balance").value("250.00"));

        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"voidReason\":\"Cliente se arrepintio\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/customers/" + customerId + "/credit-account")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.balance").value("0.00"));
    }
}
```

- [ ] **Step 2: Run to confirm it fails**

```bash
./mvnw test -Dtest=SaleCreditVoidIntegrationTest -Dspring.profiles.active=test
```
Expected: the final assertion fails — balance stays `250.00` after void, since `voidSale` doesn't reverse credit charges yet.

- [ ] **Step 3: Extend `SaleService.voidSale`**

Add this line right after the existing cash-movement-reversal loop in `voidSale` (after the `for (var movement : cashMovementRepository.findAllByTenantIdAndSaleId(...)) { ... }` block, before `sale.setStatus(SaleStatus.VOIDED);`):

```java
        for (Payment payment : paymentRepository.findAllBySaleId(sale.getId())) {
            if (payment.getMethod() == PaymentMethod.CREDIT) {
                creditService.reverseCharge(tenantId, sale.getCustomerId(), payment.getAmount(), sale.getId(), userId);
            }
        }
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=SaleCreditVoidIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 1, Failures: 0, Errors: 0`.

- [ ] **Step 5: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`. Total should be 78 (baseline after POS/Sale) + 3 (Task 1) + 3 (Task 2) + 3 (Task 3) + 1 (Task 4) = 88.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat: reverse CREDIT charge when a sale is voided"
```

---

## What comes after this plan

This plan delivers the full Fase 1 MVP core described in the original system design (`docs/superpowers/specs/2026-07-04-dalventa-design.md`) except the frontend. What remains, per the last "whats missing" review: due-date-based `CreditAccount`-per-sale and overdue blocking (explicitly deferred in this plan's own design, §2), partial returns, suspended sales, post-closure void, `TenantSettings`, and — most importantly — the entire Next.js frontend, which has no plan yet and should be brainstormed as its own project once the backend API surface is considered stable enough to build against.
