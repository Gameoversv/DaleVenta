# DaleVenta Bootstrap + RBAC + Branch/Register — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork the proven TallerFacilRD backend skeleton into DaleVenta, strip taller-only domain modules, and land the foundation every later module depends on: renamed roles, a granular permission system (role + individual overrides), and multi-branch/multi-register entities with tenant-scoped CRUD.

**Architecture:** Spring Boot 3 monolith, package-by-feature (`branch`, `register`, `permission`, plus reused `auth`, `tenant`, `superadmin`, `shared`, `dashboard`, `customer`). PostgreSQL via Flyway migrations, numbered fresh from `V1` (this is a brand-new repo with no production data — no need to preserve TallerFacilRD's migration history). JWT auth reused unchanged. Method-level authorization via a custom `@PreAuthorize("@permissionService.has('...')")` SpEL bean, backed by a `PermissionResolutionService` that unions role permissions with per-user grants and subtracts per-user revokes.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Security, Spring Data JPA, PostgreSQL 16, Flyway, JJWT, Lombok, JUnit 5, AssertJ, MockMvc, Testcontainers deps present (integration tests run against a real Postgres instance per existing convention, not per-test containers).

## Global Constraints

- Money fields: `NUMERIC(14,2)` in Postgres, `BigDecimal` in Java. Never `float`/`double`.
- All new tables carry `tenant_id UUID NOT NULL` (except `permissions`, which is a global catalog) and index `(tenant_id, ...)` per query pattern.
- No physical deletes on entities with any downstream reference — use `active BOOLEAN` soft-delete (applies from Branch/Register onward; nothing here yet has sales history to protect, but the convention starts now).
- Base package: `rd.dalventa.api`. Maven groupId `rd.dalventa`, artifactId `api`, name `DaleVenta API`.
- Every entity extends `rd.dalventa.api.shared.domain.BaseEntity` or `TenantAwareEntity` (reused as-is from TallerFacilRD).
- Follow existing project conventions: Lombok `@Getter`/`@RequiredArgsConstructor`, constructor injection, records for DTOs, `ApiResponse<T>` envelope for controller responses, Jackson snake_case.
- Frontend (`apps/web`) is **out of scope for this plan** — copied and adapted in a follow-up plan once the API contracts here are stable.

---

### Task 1: Fork the skeleton and get it compiling under the new namespace

**Files:**
- Create: entire `DaleVenta/apps/api/` (copied from `TallerFacilRD/apps/api/`)
- Create: `DaleVenta/infra/docker-compose.yml`, `DaleVenta/infra/nginx/nginx.conf` (copied)
- Modify: `DaleVenta/apps/api/pom.xml` (groupId/artifactId/name/description)
- Modify: `DaleVenta/apps/api/src/main/resources/application.yml`, `application-test.yml`
- Modify: `DaleVenta/.env.example`
- Modify: every `.java` file under `apps/api/src/main/java` and `src/test/java` (package rename)

This is a mechanical fork, not TDD — correctness is verified by a full compile + the existing test suite passing at the end of Task 2 (some tests reference modules pruned in Task 2, so full green is deferred to Task 2's completion; this task only needs a clean **compile**).

- [ ] **Step 1: Copy the API skeleton**

```bash
cd "C:/Users/wilki/Proyectos"
cp -r TallerFacilRD/apps/api DaleVenta/apps/api
cp -r TallerFacilRD/infra DaleVenta/infra
rm -rf DaleVenta/apps/api/target
```

- [ ] **Step 2: Rename the Java package on disk**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src"
mkdir -p main/java/rd/dalventa
mv main/java/rd/tallerfacil/api main/java/rd/dalventa/api
rmdir main/java/rd/tallerfacil
mkdir -p test/java/rd/dalventa
mv test/java/rd/tallerfacil/api test/java/rd/dalventa/api
rmdir test/java/rd/tallerfacil
```

- [ ] **Step 3: Rewrite package references in every source file**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src"
grep -rl "rd.tallerfacil" . | xargs sed -i 's/rd\.tallerfacil/rd.dalventa/g'
```

- [ ] **Step 4: Update `pom.xml` identity**

Edit `apps/api/pom.xml`:
```xml
<groupId>rd.dalventa</groupId>
<artifactId>api</artifactId>
<version>0.0.1-SNAPSHOT</version>
<name>DaleVenta API</name>
<description>SaaS multi-tenant de punto de venta y gestion comercial - Backend</description>
```

- [ ] **Step 5: Rename config values (db name, app name, image names)**

Edit `apps/api/src/main/resources/application.yml`:
```yaml
spring:
  application:
    name: dalventa-api
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:dalventa}
    username: ${DB_USER:dalventa}
```

Edit `apps/api/src/main/resources/application-test.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:dalventa_test}
    username: ${DB_USER:dalventa}
```

Edit `infra/docker-compose.yml`: replace every `tallerfacil` with `dalventa` (container names, `POSTGRES_DB`/`POSTGRES_USER` defaults, `PGADMIN_DEFAULT_EMAIL`).

- [ ] **Step 6: Verify it compiles**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api"
./mvnw -q -DskipTests compile
```
Expected: `BUILD SUCCESS`. (Tests are red at this point — expected, fixed in Task 2.)

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta"
git add apps/api infra
git commit -m "chore: fork TallerFacilRD API skeleton into rd.dalventa.api namespace"
```

---

### Task 2: Prune taller-only modules and get the full test suite green

**Files:**
- Delete: `apps/api/src/main/java/rd/dalventa/api/{workorder,vehicle,reception,quote,invoice,payment,purchase,reminder,portal,employee,cash,announcement}/`
- Delete: matching test files under `apps/api/src/test/java/rd/dalventa/api/{workorder,vehicle,reception,quote,invoice,portal}/`
- Delete/rewrite: `apps/api/src/main/resources/db/migration/*` (renumber to a clean `V1`–`V6` set)
- Modify: `apps/api/src/main/java/rd/dalventa/api/auth/domain/RoleName.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/tenant/service/TenantService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/auth/service/AuthService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/superadmin/service/SuperAdminService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/superadmin/dto/GlobalStatsResponse.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/superadmin/dto/TenantSummaryResponse.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/superadmin/dto/TenantDetailResponse.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/dashboard/service/DashboardService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/dashboard/dto/DashboardSummaryResponse.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/TallerFacilApplicationTest.java` → rename to `DaleVentaApplicationTest.java`

**Interfaces:**
- Produces: `RoleName` enum values `SUPER_ADMIN`, `ADMIN`, `CASHIER`, `CLIENT` — every later task's role checks use these exact names.
- Produces: `DashboardSummaryResponse(long activeCustomers)` and `GlobalStatsResponse` / `TenantSummaryResponse` / `TenantDetailResponse` without vehicle/work-order fields — later tasks (product/POS plan) will add fields back, not rename these.

- [ ] **Step 1: Delete taller-domain module directories**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src/main/java/rd/dalventa/api"
rm -rf workorder vehicle reception quote invoice payment purchase reminder portal employee cash announcement
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src/test/java/rd/dalventa/api"
rm -rf workorder vehicle reception quote invoice portal
rm -f TallerFacilApplicationTest.java
```

- [ ] **Step 2: Replace the migration set with a clean, DaleVenta-only sequence**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src/main/resources/db/migration"
rm -f *.sql
```

Create `V1__init_schema.sql`:
```sql
-- Initial schema: roles and users

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID,
    customer_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
```

Create `V2__seed_roles.sql`:
```sql
-- Seed system roles: DaleVenta only has ADMIN and CASHIER staff roles,
-- plus SUPER_ADMIN (platform) and CLIENT (portal, phase 2).
INSERT INTO roles (id, name, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'SUPER_ADMIN', NOW(), NOW()),
    (gen_random_uuid(), 'ADMIN',       NOW(), NOW()),
    (gen_random_uuid(), 'CASHIER',     NOW(), NOW()),
    (gen_random_uuid(), 'CLIENT',      NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
```

Create `V3__customers.sql` (copy verbatim from `TallerFacilRD/apps/api/src/main/resources/db/migration/V3__customers.sql` — the reused `customer` module needs its table):
```bash
cp "C:/Users/wilki/Proyectos/TallerFacilRD/apps/api/src/main/resources/db/migration/V3__customers.sql" \
   "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src/main/resources/db/migration/V3__customers.sql"
```
Open the copied file and remove any `vehicle`/`work_order` foreign key columns if present (customers in TallerFacilRD are vehicle-owner focused; check for a `vehicles` FK block and delete it — DaleVenta customers have no vehicle relationship).

Create `V4__tenants.sql` (adapt from TallerFacilRD's `V15__tenants.sql`, dropping the `SUPER_ADMIN` role insert since V2 already seeds it, and renaming the demo tenant):
```sql
CREATE TABLE tenants (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    logo_url    TEXT,
    address     TEXT,
    city        VARCHAR(100),
    country     VARCHAR(100) NOT NULL DEFAULT 'DO',
    phone       VARCHAR(20),
    email       VARCHAR(255),
    website     VARCHAR(255),
    rnc         VARCHAR(20),
    plan        VARCHAR(20)  NOT NULL DEFAULT 'STARTER',
    status      VARCHAR(20)  NOT NULL DEFAULT 'TRIAL',
    trial_ends_at TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX idx_tenants_slug   ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
```

Create `V5__admin_audit_log.sql` (copy verbatim from TallerFacilRD's `V17__admin_audit_log.sql`):
```bash
cp "C:/Users/wilki/Proyectos/TallerFacilRD/apps/api/src/main/resources/db/migration/V17__admin_audit_log.sql" \
   "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src/main/resources/db/migration/V5__admin_audit_log.sql"
```

Run `ls` to confirm the directory now holds exactly `V1__init_schema.sql` through `V5__admin_audit_log.sql` — no gaps, no leftover taller-domain files.

- [ ] **Step 3: Update `RoleName`**

```java
package rd.dalventa.api.auth.domain;

public enum RoleName {
    SUPER_ADMIN,
    ADMIN,
    CASHIER,
    CLIENT
}
```

- [ ] **Step 4: Fix `AuthService` and `TenantService` role references**

In `auth/service/AuthService.java`, change the owner check:
```java
boolean isOwner = user.getRoles().stream()
        .anyMatch(r -> r.getName() == RoleName.ADMIN);
```
(rename the local variable `isOwner` → `isAdmin` and the message to reference "administradores" instead of "propietarios").

In `tenant/service/TenantService.java`, change:
```java
var ownerRole = roleRepository.findByName(RoleName.ADMIN)
        .orElseThrow(() -> new IllegalStateException("Rol ADMIN no encontrado"));
```
(rename local variable `ownerRole` → `adminRole`).

- [ ] **Step 5: Strip vehicle/work-order fields from superadmin DTOs**

`superadmin/dto/GlobalStatsResponse.java`:
```java
package rd.dalventa.api.superadmin.dto;

public record GlobalStatsResponse(
        long tenantsTotal,
        long tenantsPending,
        long tenantsTrial,
        long tenantsActive,
        long tenantsSuspended,
        long tenantsCancelled,
        long usersTotal,
        long customersTotal
) {}
```

`superadmin/dto/TenantSummaryResponse.java`:
```java
package rd.dalventa.api.superadmin.dto;

import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantPlan;
import rd.dalventa.api.tenant.domain.TenantStatus;

import java.time.Instant;
import java.util.UUID;

public record TenantSummaryResponse(
        UUID id,
        String name,
        String slug,
        TenantPlan plan,
        TenantStatus status,
        Instant trialEndsAt,
        Instant createdAt,
        long userCount,
        long customerCount
) {
    public static TenantSummaryResponse of(Tenant t, long users, long customers) {
        return new TenantSummaryResponse(
                t.getId(), t.getName(), t.getSlug(),
                t.getPlan(), t.getStatus(), t.getTrialEndsAt(), t.getCreatedAt(),
                users, customers
        );
    }
}
```

`superadmin/dto/TenantDetailResponse.java`:
```java
package rd.dalventa.api.superadmin.dto;

import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantPlan;
import rd.dalventa.api.tenant.domain.TenantStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TenantDetailResponse(
        UUID id,
        String name,
        String slug,
        String city,
        String country,
        String phone,
        String email,
        String rnc,
        TenantPlan plan,
        TenantStatus status,
        Instant trialEndsAt,
        Instant createdAt,
        long userCount,
        long customerCount,
        List<UserSummaryResponse> owners
) {
    public static TenantDetailResponse of(
            Tenant t,
            long users, long customers,
            List<UserSummaryResponse> owners
    ) {
        return new TenantDetailResponse(
                t.getId(), t.getName(), t.getSlug(),
                t.getCity(), t.getCountry(), t.getPhone(),
                t.getEmail(), t.getRnc(),
                t.getPlan(), t.getStatus(), t.getTrialEndsAt(), t.getCreatedAt(),
                users, customers, owners
        );
    }
}
```

- [ ] **Step 6: Fix `SuperAdminService` to drop `vehicleRepository`/`workOrderRepository`**

Edit `superadmin/service/SuperAdminService.java`:
- Remove the `VehicleRepository` and `WorkOrderRepository` imports and fields.
- `globalStats()` → `return new GlobalStatsResponse(tenantRepository.count(), tenantRepository.countByStatus(TenantStatus.PENDING), tenantRepository.countByStatus(TenantStatus.TRIAL), tenantRepository.countByStatus(TenantStatus.ACTIVE), tenantRepository.countByStatus(TenantStatus.SUSPENDED), tenantRepository.countByStatus(TenantStatus.CANCELLED), userRepository.countByTenantIdIsNotNull(), customerRepository.count());`
- Every call to `TenantSummaryResponse.of(t, users, customers, vehicles, orders)` → `TenantSummaryResponse.of(t, users, customers)`.
- `TenantDetailResponse.of(tenant, users, customers, vehicles, orders, owners)` → `TenantDetailResponse.of(tenant, users, customers, owners)`.
- Private `summary(Tenant t)` helper → `return TenantSummaryResponse.of(t, userRepository.countByTenantId(t.getId()), customerRepository.countByTenantIdAndActiveTrue(t.getId()));`

- [ ] **Step 7: Rewrite `DashboardService` to a minimal, honest stub**

```java
package rd.dalventa.api.dashboard.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.dashboard.dto.DashboardSummaryResponse;
import rd.dalventa.api.shared.domain.TenantContext;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        var tenantId = TenantContext.require();
        return new DashboardSummaryResponse(customerRepository.countByTenantIdAndActiveTrue(tenantId));
    }
}
```

Replace `dashboard/dto/DashboardSummaryResponse.java`:
```java
package rd.dalventa.api.dashboard.dto;

public record DashboardSummaryResponse(long activeCustomers) {}
```

Delete `dashboard/dto/ActivityEvent.java` and `dashboard/dto/AlertItem.java` if their only producers (`activity()`/`alerts()`) no longer exist; also remove the corresponding methods and endpoints from `dashboard/web/DashboardController.java` and `dashboard/service` (check the controller file — it will have `activity`/`alerts` mappings referencing the deleted service methods; delete those two `@GetMapping` methods and their imports).

- [ ] **Step 8: Trim `IntegrationTestBase`**

```java
package rd.dalventa.api.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.tenant.repository.TenantRepository;
import rd.dalventa.api.auth.repository.UserRepository;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected UserRepository userRepository;
    @Autowired protected TenantRepository tenantRepository;
    @Autowired protected CustomerRepository customerRepository;

    protected void cleanAll() {
        userRepository.deleteAll();
        customerRepository.deleteAll();
        tenantRepository.deleteAll();
    }

    protected String registerTenantAndGetToken(String email, String password) throws Exception {
        var body = Map.of(
                "tenant_name", "DaleVenta Test",
                "admin_name", "Admin Test",
                "admin_email", email,
                "admin_password", password
        );
        var res = mockMvc.perform(post("/api/tenants/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("token").asText();
    }
}
```

- [ ] **Step 9: Rename the application smoke test**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api/src/test/java/rd/dalventa/api"
```
Create `DaleVentaApplicationTest.java` (the old `TallerFacilApplicationTest.java` was already deleted in Step 1 — this is a fresh file):
```java
package rd.dalventa.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DaleVentaApplicationTest {

    @Test
    void contextLoads() {
    }
}
```

- [ ] **Step 10: Also rename the main `@SpringBootApplication` class if named after TallerFacil**

Check `apps/api/src/main/java/rd/dalventa/api/*Application.java` — rename the class and file from `TallerFacilApiApplication` (or similar) to `DaleVentaApiApplication`, updating the `@SpringBootApplication` class name to match the filename.

- [ ] **Step 11: Start a local test database and run the full suite**

```bash
docker run -d --name dalventa_test_db -p 5432:5432 \
  -e POSTGRES_DB=dalventa_test -e POSTGRES_USER=dalventa -e POSTGRES_PASSWORD=changeme \
  postgres:16-alpine
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api"
DB_HOST=localhost DB_PORT=5432 DB_NAME=dalventa_test DB_USER=dalventa DB_PASSWORD=changeme \
JWT_SECRET=ci-test-secret-256-bits-minimum-length-ok \
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`, all tests green (auth, tenant registration, customer, rate limiter, CORS, application context).

- [ ] **Step 12: Commit**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta"
git add apps/api
git commit -m "refactor: strip taller-only modules, rename roles, land clean migration set"
```

---

### Task 3: `Branch` entity — sucursales

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/branch/domain/Branch.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/branch/repository/BranchRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/branch/dto/CreateBranchRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/branch/dto/BranchResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/branch/service/BranchService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/branch/web/BranchController.java`
- Create: `apps/api/src/main/resources/db/migration/V6__branches.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/branch/BranchIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `BranchRepository`)

**Interfaces:**
- Produces: `Branch(String name, String address, UUID tenantId)` constructor, `Branch.isActive()`, `BranchRepository.findAllByTenantIdAndActiveTrue(UUID)`. Task 4 (`Register`) references `Branch` by `branchId : UUID` foreign key.
- Consumes: `TenantAwareEntity` (existing), `TenantContext.require()` (existing), `ApiResponse<T>` (existing, in `shared/web`).

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.branch;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.greaterThan;

class BranchIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void createBranch_asAdmin_persistsAndReturnsIt() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Sucursal Centro"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void listBranches_returnsOnlyCurrentTenantBranches() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/branches")
                .header("Authorization", "Bearer " + tokenA)
                .contentType("application/json")
                .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"));
        mockMvc.perform(post("/api/branches")
                .header("Authorization", "Bearer " + tokenB)
                .contentType("application/json")
                .content("{\"name\":\"Sucursal B\",\"address\":\"Dir B\"}"));

        mockMvc.perform(get("/api/branches").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Sucursal A"));
    }
}
```

- [ ] **Step 2: Run it to confirm it fails to compile (no production code yet)**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api"
./mvnw test -Dtest=BranchIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation failure — `/api/branches` and supporting classes don't exist.

- [ ] **Step 3: Create the migration**

```sql
CREATE TABLE branches (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID         NOT NULL REFERENCES tenants(id),
    name       VARCHAR(150) NOT NULL,
    address    TEXT,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
```
Save as `apps/api/src/main/resources/db/migration/V6__branches.sql`.

- [ ] **Step 4: Create the `Branch` entity**

```java
package rd.dalventa.api.branch.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "branches")
public class Branch extends TenantAwareEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column
    private String address;

    @Column(nullable = false)
    private boolean active = true;

    public Branch(String name, String address) {
        this.name = name;
        this.address = address;
    }

    public void deactivate() {
        this.active = false;
    }
}
```

- [ ] **Step 5: Create the repository**

```java
package rd.dalventa.api.branch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.branch.domain.Branch;

import java.util.List;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    List<Branch> findAllByTenantIdAndActiveTrue(UUID tenantId);
    long countByTenantIdAndActiveTrue(UUID tenantId);
}
```

- [ ] **Step 6: Create the DTOs**

```java
package rd.dalventa.api.branch.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateBranchRequest(
        @NotBlank String name,
        String address
) {}
```

```java
package rd.dalventa.api.branch.dto;

import rd.dalventa.api.branch.domain.Branch;

import java.time.Instant;
import java.util.UUID;

public record BranchResponse(
        UUID id,
        String name,
        String address,
        boolean active,
        Instant createdAt
) {
    public static BranchResponse from(Branch b) {
        return new BranchResponse(b.getId(), b.getName(), b.getAddress(), b.isActive(), b.getCreatedAt());
    }
}
```

- [ ] **Step 7: Create the service**

```java
package rd.dalventa.api.branch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.branch.domain.Branch;
import rd.dalventa.api.branch.dto.BranchResponse;
import rd.dalventa.api.branch.dto.CreateBranchRequest;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.shared.domain.TenantContext;

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
    public void deactivate(UUID id) {
        var branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sucursal no encontrada"));
        if (!branch.getTenantId().equals(TenantContext.require())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sucursal no encontrada");
        }
        branch.deactivate();
        branchRepository.save(branch);
    }
}
```

- [ ] **Step 8: Create the controller**

```java
package rd.dalventa.api.branch.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.branch.dto.BranchResponse;
import rd.dalventa.api.branch.dto.CreateBranchRequest;
import rd.dalventa.api.branch.service.BranchService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BranchResponse> create(@Valid @RequestBody CreateBranchRequest req) {
        return ApiResponse.ok(branchService.create(req));
    }

    @GetMapping
    public ApiResponse<List<BranchResponse>> list() {
        return ApiResponse.ok(branchService.list());
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deactivate(@PathVariable UUID id) {
        branchService.deactivate(id);
        return ApiResponse.ok(null);
    }
}
```

- [ ] **Step 9: Add `BranchRepository` to `IntegrationTestBase`**

```java
import rd.dalventa.api.branch.repository.BranchRepository;
// ...
@Autowired protected BranchRepository branchRepository;
```
And in `cleanAll()`, add `branchRepository.deleteAll();` before `tenantRepository.deleteAll();`.

- [ ] **Step 10: Run the test to confirm it passes**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api"
./mvnw test -Dtest=BranchIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "feat: add Branch entity with tenant-scoped CRUD"
```

---

### Task 4: `Register` entity — cajas

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/register/domain/Register.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/register/repository/RegisterRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/register/dto/CreateRegisterRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/register/dto/RegisterResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/register/service/RegisterService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/register/web/RegisterController.java`
- Create: `apps/api/src/main/resources/db/migration/V7__registers.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/register/RegisterIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `RegisterRepository`)

**Interfaces:**
- Consumes: `Branch` (Task 3) — `Register.branchId : UUID` FK, validated against `BranchRepository.findById`.
- Produces: `Register(String name, UUID branchId)`, `RegisterRepository.findAllByBranchIdAndActiveTrue(UUID)`. Later "cashshift" plan opens shifts against `registerId`.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.register;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RegisterIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void createRegister_forExistingBranch_persists() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Caja 1"));
    }

    @Test
    void createRegister_forBranchOfOtherTenant_returnsNotFound() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja X\",\"branchId\":\"" + branchId + "\"}"))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=RegisterIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error, classes missing.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE registers (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID         NOT NULL REFERENCES tenants(id),
    branch_id  UUID         NOT NULL REFERENCES branches(id),
    name       VARCHAR(150) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_registers_tenant_id ON registers(tenant_id);
CREATE INDEX idx_registers_branch_id ON registers(branch_id);
```
Save as `V7__registers.sql`.

- [ ] **Step 4: Entity**

```java
package rd.dalventa.api.register.domain;

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
@Table(name = "registers")
public class Register extends TenantAwareEntity {

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    public Register(String name, UUID branchId) {
        this.name = name;
        this.branchId = branchId;
    }

    public void deactivate() {
        this.active = false;
    }
}
```

- [ ] **Step 5: Repository**

```java
package rd.dalventa.api.register.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.register.domain.Register;

import java.util.List;
import java.util.UUID;

public interface RegisterRepository extends JpaRepository<Register, UUID> {
    List<Register> findAllByBranchIdAndActiveTrue(UUID branchId);
    List<Register> findAllByTenantIdAndActiveTrue(UUID tenantId);
}
```

- [ ] **Step 6: DTOs**

```java
package rd.dalventa.api.register.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateRegisterRequest(
        @NotBlank String name,
        @NotNull UUID branchId
) {}
```

```java
package rd.dalventa.api.register.dto;

import rd.dalventa.api.register.domain.Register;

import java.util.UUID;

public record RegisterResponse(
        UUID id,
        String name,
        UUID branchId,
        boolean active
) {
    public static RegisterResponse from(Register r) {
        return new RegisterResponse(r.getId(), r.getName(), r.getBranchId(), r.isActive());
    }
}
```

- [ ] **Step 7: Service**

```java
package rd.dalventa.api.register.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.register.domain.Register;
import rd.dalventa.api.register.dto.CreateRegisterRequest;
import rd.dalventa.api.register.dto.RegisterResponse;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegisterService {

    private final RegisterRepository registerRepository;
    private final BranchRepository branchRepository;

    @Transactional
    public RegisterResponse create(CreateRegisterRequest req) {
        var tenantId = TenantContext.require();
        var branch = branchRepository.findById(req.branchId())
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sucursal no encontrada"));

        var register = new Register(req.name(), branch.getId());
        register.setTenantId(tenantId);
        return RegisterResponse.from(registerRepository.save(register));
    }

    @Transactional(readOnly = true)
    public List<RegisterResponse> listByBranch(UUID branchId) {
        return registerRepository.findAllByBranchIdAndActiveTrue(branchId)
                .stream().map(RegisterResponse::from).toList();
    }
}
```

- [ ] **Step 8: Controller**

```java
package rd.dalventa.api.register.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.register.dto.CreateRegisterRequest;
import rd.dalventa.api.register.dto.RegisterResponse;
import rd.dalventa.api.register.service.RegisterService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/registers")
@RequiredArgsConstructor
public class RegisterController {

    private final RegisterService registerService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RegisterResponse> create(@Valid @RequestBody CreateRegisterRequest req) {
        return ApiResponse.ok(registerService.create(req));
    }

    @GetMapping
    public ApiResponse<List<RegisterResponse>> listByBranch(@RequestParam UUID branchId) {
        return ApiResponse.ok(registerService.listByBranch(branchId));
    }
}
```

- [ ] **Step 9: Add `RegisterRepository` to `IntegrationTestBase`**, `cleanAll()` deletes registers before branches.

- [ ] **Step 10: Run and confirm green**

```bash
./mvnw test -Dtest=RegisterIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "feat: add Register entity scoped to Branch"
```

---

### Task 5: Permission catalog + `RolePermission` + `UserPermission`

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/domain/PermissionCode.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/domain/RolePermission.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/domain/UserPermission.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/domain/PermissionEffect.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/repository/RolePermissionRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/repository/UserPermissionRepository.java`
- Create: `apps/api/src/main/resources/db/migration/V8__permissions.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/permission/RolePermissionRepositoryTest.java`

**Interfaces:**
- Produces: `PermissionCode` enum (the fixed catalog from the spec §6), `RolePermission(RoleName role, PermissionCode code)`, `UserPermission(UUID userId, PermissionCode code, PermissionEffect effect)`. Task 6's `PermissionResolutionService` consumes both repositories.

- [ ] **Step 1: Write the failing repository test**

```java
package rd.dalventa.api.permission;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.RolePermission;
import rd.dalventa.api.permission.repository.RolePermissionRepository;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class RolePermissionRepositoryTest {

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Test
    void findByRole_returnsOnlyThatRolesPermissions() {
        rolePermissionRepository.save(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE));
        rolePermissionRepository.save(new RolePermission(RoleName.ADMIN, PermissionCode.USERS_MANAGE));

        var cashierPerms = rolePermissionRepository.findByRole(RoleName.CASHIER);

        assertThat(cashierPerms).hasSize(1);
        assertThat(cashierPerms.get(0).getCode()).isEqualTo(PermissionCode.SALE_CREATE);
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=RolePermissionRepositoryTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Migration**

```sql
-- Fixed permission catalog lives in Java (PermissionCode enum); these tables
-- only store which role/user has which code, referenced by its string name.

CREATE TABLE role_permissions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    role       VARCHAR(50) NOT NULL,
    code       VARCHAR(60) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (role, code)
);

CREATE TABLE user_permissions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code       VARCHAR(60) NOT NULL,
    effect     VARCHAR(10) NOT NULL, -- GRANT or REVOKE
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (user_id, code)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- Default catalog: ADMIN gets everything, CASHIER gets the POS-floor subset.
INSERT INTO role_permissions (role, code, created_at, updated_at) VALUES
    ('ADMIN', 'INVENTORY_VIEW', NOW(), NOW()),
    ('ADMIN', 'INVENTORY_CREATE', NOW(), NOW()),
    ('ADMIN', 'INVENTORY_EDIT', NOW(), NOW()),
    ('ADMIN', 'INVENTORY_ADJUST', NOW(), NOW()),
    ('ADMIN', 'COST_VIEW', NOW(), NOW()),
    ('ADMIN', 'PRICE_VIEW', NOW(), NOW()),
    ('ADMIN', 'SALE_CREATE', NOW(), NOW()),
    ('ADMIN', 'SALE_DISCOUNT', NOW(), NOW()),
    ('ADMIN', 'SALE_PRICE_OVERRIDE', NOW(), NOW()),
    ('ADMIN', 'SALE_VOID', NOW(), NOW()),
    ('ADMIN', 'SALE_RETURN', NOW(), NOW()),
    ('ADMIN', 'CASHSHIFT_OPEN', NOW(), NOW()),
    ('ADMIN', 'CASHSHIFT_CLOSE', NOW(), NOW()),
    ('ADMIN', 'CASHSHIFT_VIEW_HISTORY', NOW(), NOW()),
    ('ADMIN', 'CUSTOMER_CREATE', NOW(), NOW()),
    ('ADMIN', 'CUSTOMER_EDIT', NOW(), NOW()),
    ('ADMIN', 'CREDIT_AUTHORIZE', NOW(), NOW()),
    ('ADMIN', 'CREDIT_RECEIVE_PAYMENT', NOW(), NOW()),
    ('ADMIN', 'REPORTS_VIEW', NOW(), NOW()),
    ('ADMIN', 'PROFIT_VIEW', NOW(), NOW()),
    ('ADMIN', 'USERS_MANAGE', NOW(), NOW()),
    ('ADMIN', 'SETTINGS_MANAGE', NOW(), NOW()),
    ('CASHIER', 'INVENTORY_VIEW', NOW(), NOW()),
    ('CASHIER', 'SALE_CREATE', NOW(), NOW()),
    ('CASHIER', 'CASHSHIFT_OPEN', NOW(), NOW()),
    ('CASHIER', 'CASHSHIFT_CLOSE', NOW(), NOW()),
    ('CASHIER', 'CUSTOMER_CREATE', NOW(), NOW()),
    ('CASHIER', 'CREDIT_RECEIVE_PAYMENT', NOW(), NOW())
ON CONFLICT (role, code) DO NOTHING;
```
Save as `V8__permissions.sql`.

- [ ] **Step 4: `PermissionCode` enum**

```java
package rd.dalventa.api.permission.domain;

public enum PermissionCode {
    INVENTORY_VIEW,
    INVENTORY_CREATE,
    INVENTORY_EDIT,
    INVENTORY_ADJUST,
    COST_VIEW,
    PRICE_VIEW,
    SALE_CREATE,
    SALE_DISCOUNT,
    SALE_PRICE_OVERRIDE,
    SALE_VOID,
    SALE_RETURN,
    CASHSHIFT_OPEN,
    CASHSHIFT_CLOSE,
    CASHSHIFT_VIEW_HISTORY,
    CUSTOMER_CREATE,
    CUSTOMER_EDIT,
    CREDIT_AUTHORIZE,
    CREDIT_RECEIVE_PAYMENT,
    REPORTS_VIEW,
    PROFIT_VIEW,
    USERS_MANAGE,
    SETTINGS_MANAGE
}
```

- [ ] **Step 5: `PermissionEffect` enum**

```java
package rd.dalventa.api.permission.domain;

public enum PermissionEffect {
    GRANT,
    REVOKE
}
```

- [ ] **Step 6: `RolePermission` entity**

```java
package rd.dalventa.api.permission.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.shared.domain.BaseEntity;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "role_permissions")
public class RolePermission extends BaseEntity {

    @Enumerated(EnumType.STRING)
    private RoleName role;

    @Enumerated(EnumType.STRING)
    private PermissionCode code;

    public RolePermission(RoleName role, PermissionCode code) {
        this.role = role;
        this.code = code;
    }
}
```

- [ ] **Step 7: `UserPermission` entity**

```java
package rd.dalventa.api.permission.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.BaseEntity;

import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "user_permissions")
public class UserPermission extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    private PermissionCode code;

    @Enumerated(EnumType.STRING)
    private PermissionEffect effect;

    public UserPermission(UUID userId, PermissionCode code, PermissionEffect effect) {
        this.userId = userId;
        this.code = code;
        this.effect = effect;
    }
}
```

- [ ] **Step 8: Repositories**

```java
package rd.dalventa.api.permission.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.permission.domain.RolePermission;

import java.util.List;
import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {
    List<RolePermission> findByRole(RoleName role);
}
```

```java
package rd.dalventa.api.permission.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.permission.domain.UserPermission;

import java.util.List;
import java.util.UUID;

public interface UserPermissionRepository extends JpaRepository<UserPermission, UUID> {
    List<UserPermission> findByUserId(UUID userId);
}
```

- [ ] **Step 9: Run and confirm green**

```bash
./mvnw test -Dtest=RolePermissionRepositoryTest -Dspring.profiles.active=test
```
Expected: `Tests run: 1, Failures: 0, Errors: 0`.

- [ ] **Step 10: Commit**

```bash
git add apps/api
git commit -m "feat: add permission catalog with role and per-user overrides"
```

---

### Task 6: `PermissionResolutionService` — the effective-permission algorithm

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/service/PermissionResolutionService.java`
- Test: `apps/api/src/test/java/rd/dalventa/api/permission/service/PermissionResolutionServiceTest.java`

**Interfaces:**
- Consumes: `RolePermissionRepository.findByRole(RoleName)`, `UserPermissionRepository.findByUserId(UUID)`, `User.getRoles()` (existing).
- Produces: `PermissionResolutionService.has(User user, PermissionCode code) : boolean` and `resolveAll(User user) : Set<PermissionCode>` — Task 7's `@PreAuthorize` bean consumes `has(...)`.

This is pure business logic — unit test with Mockito, no Spring context needed.

- [ ] **Step 1: Write the failing unit test**

```java
package rd.dalventa.api.permission.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import rd.dalventa.api.auth.domain.Role;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.PermissionEffect;
import rd.dalventa.api.permission.domain.RolePermission;
import rd.dalventa.api.permission.domain.UserPermission;
import rd.dalventa.api.permission.repository.RolePermissionRepository;
import rd.dalventa.api.permission.repository.UserPermissionRepository;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionResolutionServiceTest {

    @Mock private RolePermissionRepository rolePermissionRepository;
    @Mock private UserPermissionRepository userPermissionRepository;

    private PermissionResolutionService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new PermissionResolutionService(rolePermissionRepository, userPermissionRepository);
    }

    private User cashierUser(UUID userId) {
        var user = new User("Cajero Test", "cajero@test.com", "hash");
        var role = new Role(RoleName.CASHIER);
        user.addRole(role);
        // BaseEntity id is auto-generated; override via reflection-free path: rely on
        // JPA-assigned UUID being present since BaseEntity sets it at construction time.
        return user;
    }

    @Test
    void has_permissionGrantedByRole_returnsTrue() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId())).thenReturn(List.of());

        assertThat(service.has(user, PermissionCode.SALE_CREATE)).isTrue();
    }

    @Test
    void has_permissionNotInRoleOrOverrides_returnsFalse() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId())).thenReturn(List.of());

        assertThat(service.has(user, PermissionCode.SALE_VOID)).isFalse();
    }

    @Test
    void has_individualGrantOverride_addsPermissionNotOnRole() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId()))
                .thenReturn(List.of(new UserPermission(user.getId(), PermissionCode.SALE_VOID, PermissionEffect.GRANT)));

        assertThat(service.has(user, PermissionCode.SALE_VOID)).isTrue();
    }

    @Test
    void has_individualRevokeOverride_removesPermissionFromRole() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId()))
                .thenReturn(List.of(new UserPermission(user.getId(), PermissionCode.SALE_CREATE, PermissionEffect.REVOKE)));

        assertThat(service.has(user, PermissionCode.SALE_CREATE)).isFalse();
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=PermissionResolutionServiceTest -Dspring.profiles.active=test
```
Expected: compilation error — `PermissionResolutionService` doesn't exist.

- [ ] **Step 3: Implement the service**

```java
package rd.dalventa.api.permission.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.PermissionEffect;
import rd.dalventa.api.permission.domain.UserPermission;
import rd.dalventa.api.permission.repository.RolePermissionRepository;
import rd.dalventa.api.permission.repository.UserPermissionRepository;

import java.util.EnumSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PermissionResolutionService {

    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;

    public Set<PermissionCode> resolveAll(User user) {
        Set<PermissionCode> effective = EnumSet.noneOf(PermissionCode.class);
        user.getRoles().forEach(role ->
                rolePermissionRepository.findByRole(role.getName())
                        .forEach(rp -> effective.add(rp.getCode())));

        for (UserPermission override : userPermissionRepository.findByUserId(user.getId())) {
            if (override.getEffect() == PermissionEffect.GRANT) {
                effective.add(override.getCode());
            } else {
                effective.remove(override.getCode());
            }
        }
        return effective;
    }

    public boolean has(User user, PermissionCode code) {
        return resolveAll(user).contains(code);
    }
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
./mvnw test -Dtest=PermissionResolutionServiceTest -Dspring.profiles.active=test
```
Expected: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add PermissionResolutionService resolving role + override permissions"
```

---

### Task 7: Wire permission checks into endpoints via `@PreAuthorize`

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/permission/web/PermissionExpressionService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/branch/web/BranchController.java` (add `@PreAuthorize` to `create`/`deactivate`)
- Test: `apps/api/src/test/java/rd/dalventa/api/branch/BranchIntegrationTest.java` (add permission-denied cases)

**Interfaces:**
- Produces: Spring bean named `permissionService` exposing `has(String code) : boolean`, resolved via SpEL as `@permissionService.has('SETTINGS_MANAGE')`. Every future controller in later plans (product, POS, credit) uses this same bean and pattern — do not introduce a second permission-check mechanism.
- Consumes: `PermissionResolutionService` (Task 6), `PermissionCode` (Task 5), Spring Security's `SecurityContextHolder` (existing — `JwtAuthFilter` already populates the authenticated `User` as the principal via `UserDetailsServiceImpl`).

- [ ] **Step 1: Write the failing test — creating a Branch without `SETTINGS_MANAGE` is forbidden**

Add to `BranchIntegrationTest.java`:
```java
    @Test
    void createBranch_asCashierWithoutSettingsManage_returnsForbidden() throws Exception {
        String adminToken = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        // Register a second user under the same tenant as CASHIER via the admin-only
        // user creation endpoint is out of scope for this plan (Task 8 of the next
        // plan adds branch/register assignment); for this test, directly flip the
        // registered admin's role to CASHIER to exercise the permission check.
        var admin = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin@dalventa.test"))
                .findFirst().orElseThrow();
        admin.getRoles().clear();
        admin.addRole(roleRepository.findByName(rd.dalventa.api.auth.domain.RoleName.CASHIER).orElseThrow());
        userRepository.save(admin);

        mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal No Permitida\",\"address\":\"X\"}"))
                .andExpect(status().isForbidden());
    }
```

Add `RoleRepository` to `IntegrationTestBase`:
```java
import rd.dalventa.api.auth.repository.RoleRepository;
// ...
@Autowired protected RoleRepository roleRepository;
```

- [ ] **Step 2: Run to confirm the test fails (403 expected but not yet enforced — currently any authenticated user can create a branch)**

```bash
./mvnw test -Dtest=BranchIntegrationTest -Dspring.profiles.active=test
```
Expected: `createBranch_asCashierWithoutSettingsManage_returnsForbidden` FAILS with status 201 instead of 403.

- [ ] **Step 3: Create the SpEL-exposed permission bean**

```java
package rd.dalventa.api.permission.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;

@Component("permissionService")
@RequiredArgsConstructor
public class PermissionExpressionService {

    private final PermissionResolutionService permissionResolutionService;

    public boolean has(String code) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return false;
        }
        return permissionResolutionService.has(user, PermissionCode.valueOf(code));
    }
}
```

- [ ] **Step 4: Apply `@PreAuthorize` to `BranchController`**

```java
import org.springframework.security.access.prepost.PreAuthorize;
// ...
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<BranchResponse> create(@Valid @RequestBody CreateBranchRequest req) {
        return ApiResponse.ok(branchService.create(req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<Void> deactivate(@PathVariable UUID id) {
        branchService.deactivate(id);
        return ApiResponse.ok(null);
    }
```
(`list()` stays open to any authenticated user — reading branches doesn't need a settings permission.)

- [ ] **Step 5: Run full `BranchIntegrationTest` to confirm all pass**

```bash
./mvnw test -Dtest=BranchIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 6: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat: enforce SETTINGS_MANAGE permission on branch mutation endpoints"
```

---

### Task 8: Wrap-up — infra, docs, final verification

**Files:**
- Modify: `DaleVenta/.env.example`
- Modify: `DaleVenta/README.md`
- Modify: `DaleVenta/.github/workflows/ci.yml` (copy from TallerFacilRD, rename `tallerfacil_test` → `dalventa_test`, adjust JDBC env vars)

- [ ] **Step 1: Copy and adapt the CI workflow**

```bash
mkdir -p "C:/Users/wilki/Proyectos/DaleVenta/.github/workflows"
cp "C:/Users/wilki/Proyectos/TallerFacilRD/.github/workflows/ci.yml" \
   "C:/Users/wilki/Proyectos/DaleVenta/.github/workflows/ci.yml"
sed -i 's/tallerfacil/dalventa/g' "C:/Users/wilki/Proyectos/DaleVenta/.github/workflows/ci.yml"
```
Open the file and confirm the `web` (frontend) job, if present, is either removed or commented out — `apps/web` doesn't exist yet in this repo (added in the follow-up frontend plan). Keep only the `api-test` job for now.

- [ ] **Step 2: Write `.env.example`**

```bash
DB_NAME=dalventa
DB_USER=dalventa
DB_PASSWORD=changeme
JWT_SECRET=change-this-to-a-256-bit-secret-in-production
JWT_EXPIRATION_HOURS=24
CORS_ALLOWED_ORIGINS=http://localhost:3000
PROXY_PORT=80
```
Save as `DaleVenta/.env.example`.

- [ ] **Step 3: Update README**

Replace `DaleVenta/README.md` content with a short summary: what the project is (SaaS POS multi-tenant, repostería-first), stack table (same as TallerFacilRD's, see `docs/superpowers/specs/2026-07-04-dalventa-design.md` §16), current module list (auth, tenant, superadmin, shared, dashboard, customer, branch, register, permission), and a pointer to the design spec and this plan.

- [ ] **Step 4: Run the full backend test suite one more time**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta/apps/api"
DB_HOST=localhost DB_PORT=5432 DB_NAME=dalventa_test DB_USER=dalventa DB_PASSWORD=changeme \
JWT_SECRET=ci-test-secret-256-bits-minimum-length-ok \
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`, all tests green.

- [ ] **Step 5: Stop the local test Postgres container**

```bash
docker rm -f dalventa_test_db
```

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/wilki/Proyectos/DaleVenta"
git add .env.example README.md .github
git commit -m "chore: add CI workflow, env example, and README for DaleVenta bootstrap"
```

---

## What comes after this plan

This plan ends with: a compiling, fully-tested DaleVenta API with auth/tenant/superadmin reused, roles renamed to the DaleVenta actor set, and a working Branch → Register → granular-permission foundation that every later module depends on. It does **not** yet include: Product/Category/BranchInventory, POS/Sale, CashShift/Denomination/change algorithm, or Credit/CreditAccount — each becomes its own `docs/superpowers/plans/` document, brainstormed and planned the same way, building on the entities and `@PreAuthorize` pattern landed here. The frontend (`apps/web`) fork is also a separate plan, once the module list above gives it stable API contracts to point at.
