# Product / BranchInventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product catalog (`Category`, `Product`) and per-branch inventory control (`BranchInventory`, audited `InventoryMovement`) to DaleVenta, with permission-gated cost/price visibility and low-stock alerting.

**Architecture:** Two new package-by-feature modules on the existing Spring Boot monolith — `product` (Category, Product) and `inventory` (BranchInventory, InventoryMovement) — following the exact CRUD/tenant-scoping/`@PreAuthorize` pattern already established by `branch`/`register` (see `apps/api/src/main/java/rd/dalventa/api/branch/` for the reference shape). All permission codes needed already exist in `PermissionCode` (seeded in `V9__permissions.sql`) — no new codes are added.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Data JPA, PostgreSQL, Flyway, JUnit 5, MockMvc, Testcontainers-style integration tests (real Postgres via `docker run`, per this project's existing convention — see `IntegrationTestBase`).

## Global Constraints

- Money fields: `NUMERIC(12,2)` in Postgres / `BigDecimal` in Java — never `float`/`double`. Tax rate: `NUMERIC(5,2)`.
- Every new table is `tenant_id UUID NOT NULL REFERENCES tenants(id)` with an index on `tenant_id` (and on any other column used in a `WHERE` — see each migration).
- Every entity extends `rd.dalventa.api.shared.domain.TenantAwareEntity`. Every service method reads the tenant via `TenantContext.require()` — never trust a `tenantId` passed from the client.
- Soft delete only (`active = false`) — never `DELETE` a row that could have referencing history (`Product`, once it has any `InventoryMovement`, is a case of this).
- Permission checks use the existing `@PreAuthorize("@permissionService.has('CODE')")` pattern exclusively — do not introduce a second authorization mechanism. Permission codes used here (`INVENTORY_VIEW`, `INVENTORY_CREATE`, `INVENTORY_EDIT`, `INVENTORY_ADJUST`, `COST_VIEW`, `PRICE_VIEW`) already exist in `PermissionCode` and are already seeded per-role in `V9__permissions.sql` — do not re-seed them.
- 404 for any resource belonging to another tenant uses `rd.dalventa.api.shared.web.ResourceNotFoundException` (mapped to 404 by the existing `GlobalExceptionHandler`) — this is the pattern `RegisterService` uses; follow it, not the older `ResponseStatusException` pattern `BranchService` predates it with.
- The Flyway migration directory currently ends at `V9__permissions.sql` with a pre-existing gap at `V7` (intentionally left after removing a deleted module) — new migrations start at `V10` and increment sequentially task by task. Do not fill the `V7` gap.
- A throwaway Postgres container (`dalventa_test_db`, port 5432, db `dalventa_test`/user `dalventa`/password `changeme`) is this project's standing convention for running the `test` profile — start one with `docker run -d --name dalventa_test_db -p 5432:5432 -e POSTGRES_DB=dalventa_test -e POSTGRES_USER=dalventa -e POSTGRES_PASSWORD=changeme postgres:16-alpine` if not already running (`docker ps` to check).
- Jackson gotcha (discovered in the previous plan): `application.yml` sets `spring.jackson.property-naming-strategy: SNAKE_CASE`. Any JSON request-body DTO field with a multi-word camelCase name (e.g. `categoryId`, `internalCode`, `tracksInventory`) needs an explicit `@JsonProperty("theExactCamelCaseName")` to deserialize from a JSON body that uses the camelCase key literally, as this project's tests do. Apply this to every multi-word field in every request DTO below — it is not optional.
- Concurrency: `InventoryMovement` creation must lock the target `BranchInventory` row (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) before reading/writing `currentStock`, per this project's design spec §7 (risk: two simultaneous movements on the same branch+product). A dedicated concurrent-race integration test is out of scope for this plan (flaky/hard to write reliably in MockMvc); the lock's presence and the sequential-correctness tests (previousStock/newStock arithmetic, insufficient-stock rejection) are the required test coverage.

---

### Task 1: `Category`

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/product/domain/Category.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/repository/CategoryRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/dto/CreateCategoryRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/dto/CategoryResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/service/CategoryService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/web/CategoryController.java`
- Create: `apps/api/src/main/resources/db/migration/V10__categories.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/product/CategoryIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `CategoryRepository`, delete before `tenantRepository` in `cleanAll()`)

**Interfaces:**
- Produces: `Category(String name)` constructor, `CategoryRepository.findAllByTenantIdAndActiveTrue(UUID) : List<Category>`. Task 2's `Product.categoryId` references `Category.getId()` by convention only (no FK enforcement needed beyond the migration's `REFERENCES categories(id)`).

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.product;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoryIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void createCategory_persistsAndReturnsIt() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Bizcochos"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void listCategories_returnsOnlyCurrentTenantCategories() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/categories")
                .header("Authorization", "Bearer " + tokenA)
                .contentType("application/json")
                .content("{\"name\":\"Categoria A\"}"));
        mockMvc.perform(post("/api/categories")
                .header("Authorization", "Bearer " + tokenB)
                .contentType("application/json")
                .content("{\"name\":\"Categoria B\"}"));

        mockMvc.perform(get("/api/categories").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Categoria A"));
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
cd apps/api
./mvnw test -Dtest=CategoryIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error — `/api/categories` and supporting classes don't exist.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE categories (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID         NOT NULL REFERENCES tenants(id),
    name       VARCHAR(100) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);
```
Save as `apps/api/src/main/resources/db/migration/V10__categories.sql`.

- [ ] **Step 4: Entity**

```java
package rd.dalventa.api.product.domain;

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
@Table(name = "categories")
public class Category extends TenantAwareEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    public Category(String name) {
        this.name = name;
    }
}
```

- [ ] **Step 5: Repository**

```java
package rd.dalventa.api.product.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.product.domain.Category;

import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findAllByTenantIdAndActiveTrue(UUID tenantId);
}
```

- [ ] **Step 6: DTOs**

```java
package rd.dalventa.api.product.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCategoryRequest(@NotBlank String name) {}
```

```java
package rd.dalventa.api.product.dto;

import rd.dalventa.api.product.domain.Category;

import java.util.UUID;

public record CategoryResponse(UUID id, String name, boolean active) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.isActive());
    }
}
```

- [ ] **Step 7: Service**

```java
package rd.dalventa.api.product.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.product.domain.Category;
import rd.dalventa.api.product.dto.CategoryResponse;
import rd.dalventa.api.product.dto.CreateCategoryRequest;
import rd.dalventa.api.product.repository.CategoryRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional
    public CategoryResponse create(CreateCategoryRequest req) {
        var category = new Category(req.name());
        category.setTenantId(TenantContext.require());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categoryRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(CategoryResponse::from).toList();
    }
}
```

- [ ] **Step 8: Controller**

```java
package rd.dalventa.api.product.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.product.dto.CategoryResponse;
import rd.dalventa.api.product.dto.CreateCategoryRequest;
import rd.dalventa.api.product.service.CategoryService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('INVENTORY_CREATE')")
    public ApiResponse<CategoryResponse> create(@Valid @RequestBody CreateCategoryRequest req) {
        return ApiResponse.ok(categoryService.create(req));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('INVENTORY_VIEW')")
    public ApiResponse<List<CategoryResponse>> list() {
        return ApiResponse.ok(categoryService.list());
    }
}
```

- [ ] **Step 9: Add `CategoryRepository` to `IntegrationTestBase`**

Add `@Autowired protected CategoryRepository categoryRepository;` and, in `cleanAll()`, `categoryRepository.deleteAll();` before `branchRepository.deleteAll();`.

- [ ] **Step 10: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=CategoryIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "feat: add Category entity with tenant-scoped CRUD"
```

---

### Task 2: `Product` with permission-gated cost/price visibility

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/shared/security/CurrentUserProvider.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/permission/web/PermissionExpressionService.java` (use `CurrentUserProvider` instead of its own `SecurityContextHolder` lookup)
- Create: `apps/api/src/main/java/rd/dalventa/api/shared/web/DuplicateResourceException.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/shared/web/GlobalExceptionHandler.java` (add handler for `DuplicateResourceException` → 409)
- Create: `apps/api/src/main/java/rd/dalventa/api/product/domain/Product.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/repository/ProductRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/dto/CreateProductRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/dto/UpdateProductRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/dto/ProductResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/service/ProductService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/product/web/ProductController.java`
- Create: `apps/api/src/main/resources/db/migration/V11__products.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/product/ProductIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `ProductRepository`)

**Interfaces:**
- Consumes: `Category` (Task 1) — `Product.categoryId : UUID`, no runtime FK check required (categories aren't deleted in this module, so a dangling reference isn't reachable through the API surface built here).
- Produces: `Product` entity with getters `getCost()/getSalePrice()/getWholesalePrice() : BigDecimal`, `isTracksInventory() : boolean`. `ProductRepository.findAllByTenantIdAndActiveTrue(UUID) : List<Product>`, `.existsByTenantIdAndInternalCode(UUID, String) : boolean`, `.existsByTenantIdAndBarcode(UUID, String) : boolean`. `ProductResponse` — Task 3/4/5 reference `Product.getId()` as `productId` in `BranchInventory`/`InventoryMovement`; no other module depends on `ProductResponse`'s shape.
- Produces: `CurrentUserProvider.current() : Optional<User>` — reusable helper for resolving the authenticated principal, used by `ProductService` here and available for any later module needing the current user (e.g. `InventoryMovement.userId` in Task 4).

- [ ] **Step 1: Extract `CurrentUserProvider` (small refactor, not new behavior)**

Read `apps/api/src/main/java/rd/dalventa/api/permission/web/PermissionExpressionService.java` first — it currently reads `SecurityContextHolder.getContext().getAuthentication()` and casts the principal to `User` inline. Extract that into:

```java
package rd.dalventa.api.shared.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import rd.dalventa.api.auth.domain.User;

import java.util.Optional;

@Component
public class CurrentUserProvider {

    public Optional<User> current() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return Optional.empty();
        }
        return Optional.of(user);
    }
}
```

Then update `PermissionExpressionService` to inject and use it:

```java
package rd.dalventa.api.permission.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;
import rd.dalventa.api.shared.security.CurrentUserProvider;

@Slf4j
@Component("permissionService")
@RequiredArgsConstructor
public class PermissionExpressionService {

    private final PermissionResolutionService permissionResolutionService;
    private final CurrentUserProvider currentUserProvider;

    public boolean has(String code) {
        var user = currentUserProvider.current();
        if (user.isEmpty()) {
            return false;
        }
        try {
            return permissionResolutionService.has(user.get(), PermissionCode.valueOf(code));
        } catch (IllegalArgumentException ex) {
            log.error("Unknown PermissionCode '{}' referenced in an @PreAuthorize expression", code);
            return false;
        }
    }
}
```

Run the full suite to confirm this refactor didn't break anything before moving on:

```bash
cd apps/api
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`, same pass count as before this task (36).

Commit this refactor on its own:

```bash
git add apps/api/src/main/java/rd/dalventa/api/shared/security/CurrentUserProvider.java apps/api/src/main/java/rd/dalventa/api/permission/web/PermissionExpressionService.java
git commit -m "refactor: extract CurrentUserProvider from PermissionExpressionService"
```

- [ ] **Step 2: Write the failing integration test**

```java
package rd.dalventa.api.product;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private String createCategoryAndGetId(String token) throws Exception {
        var res = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("id").asText();
    }

    @Test
    void createProduct_asAdmin_seesFullCostAndPrice() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        String categoryId = createCategoryAndGetId(token);

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho de chocolate\",\"unit\":\"unidad\","
                                + "\"cost\":\"150.00\",\"salePrice\":\"350.00\",\"wholesalePrice\":\"300.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.internalCode").value("BIZ-001"))
                .andExpect(jsonPath("$.data.cost").value("150.00"))
                .andExpect(jsonPath("$.data.salePrice").value("350.00"));
    }

    @Test
    void createProduct_duplicateInternalCode_returnsConflict() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        String categoryId = createCategoryAndGetId(token);
        String body = "{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                + "\"cost\":\"150.00\",\"salePrice\":\"350.00\",\"wholesalePrice\":\"300.00\","
                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}";

        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(body));

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void listProducts_asCashierWithoutCostView_hidesCostAndPrice() throws Exception {
        String adminToken = registerTenantAndGetToken("admin2@dalventa.test", "Secret123!");
        String categoryId = createCategoryAndGetId(adminToken);
        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-002\","
                        + "\"barcode\":null,\"description\":\"Bizcocho de vainilla\",\"unit\":\"unidad\","
                        + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                        + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"));

        var admin = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin2@dalventa.test"))
                .findFirst().orElseThrow();
        admin.getRoles().clear();
        admin.addRole(roleRepository.findByName(rd.dalventa.api.auth.domain.RoleName.CASHIER).orElseThrow());
        userRepository.save(admin);

        mockMvc.perform(get("/api/products").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].internalCode").value("BIZ-002"))
                .andExpect(jsonPath("$.data[0].cost").doesNotExist())
                .andExpect(jsonPath("$.data[0].salePrice").doesNotExist());
    }
}
```

- [ ] **Step 3: Run to confirm compile failure**

```bash
./mvnw test -Dtest=ProductIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error, classes don't exist.

- [ ] **Step 4: `DuplicateResourceException` + handler**

```java
package rd.dalventa.api.shared.web;

public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
```

Add to `GlobalExceptionHandler` (alongside the existing `ResourceNotFoundException` handler):

```java
    @ExceptionHandler(DuplicateResourceException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleDuplicate(DuplicateResourceException ex) {
        return ApiResponse.error(ex.getMessage());
    }
```

- [ ] **Step 5: Migration**

```sql
CREATE TABLE products (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID           NOT NULL REFERENCES tenants(id),
    category_id       UUID           NOT NULL REFERENCES categories(id),
    internal_code     VARCHAR(50)    NOT NULL,
    barcode           VARCHAR(50),
    description       TEXT           NOT NULL,
    unit              VARCHAR(30)    NOT NULL,
    cost              NUMERIC(12,2)  NOT NULL,
    sale_price        NUMERIC(12,2)  NOT NULL,
    wholesale_price   NUMERIC(12,2)  NOT NULL,
    tax_rate          NUMERIC(5,2)   NOT NULL DEFAULT 0,
    tracks_inventory  BOOLEAN        NOT NULL DEFAULT TRUE,
    active            BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP      NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE UNIQUE INDEX idx_products_internal_code ON products(tenant_id, internal_code);
CREATE UNIQUE INDEX idx_products_barcode ON products(tenant_id, barcode) WHERE barcode IS NOT NULL;
```
Save as `apps/api/src/main/resources/db/migration/V11__products.sql`.

- [ ] **Step 6: Entity**

```java
package rd.dalventa.api.product.domain;

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
@Table(name = "products")
public class Product extends TenantAwareEntity {

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "internal_code", nullable = false, length = 50)
    private String internalCode;

    @Column(length = 50)
    private String barcode;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(nullable = false)
    private BigDecimal cost;

    @Column(name = "sale_price", nullable = false)
    private BigDecimal salePrice;

    @Column(name = "wholesale_price", nullable = false)
    private BigDecimal wholesalePrice;

    @Column(name = "tax_rate", nullable = false)
    private BigDecimal taxRate;

    @Column(name = "tracks_inventory", nullable = false)
    private boolean tracksInventory = true;

    @Column(nullable = false)
    private boolean active = true;

    public Product(UUID categoryId, String internalCode, String barcode, String description, String unit,
                   BigDecimal cost, BigDecimal salePrice, BigDecimal wholesalePrice, BigDecimal taxRate,
                   boolean tracksInventory) {
        this.categoryId = categoryId;
        this.internalCode = internalCode;
        this.barcode = barcode;
        this.description = description;
        this.unit = unit;
        this.cost = cost;
        this.salePrice = salePrice;
        this.wholesalePrice = wholesalePrice;
        this.taxRate = taxRate;
        this.tracksInventory = tracksInventory;
    }
}
```

- [ ] **Step 7: Repository**

```java
package rd.dalventa.api.product.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.product.domain.Product;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findAllByTenantIdAndActiveTrue(UUID tenantId);
    Optional<Product> findByIdAndTenantId(UUID id, UUID tenantId);
    boolean existsByTenantIdAndInternalCode(UUID tenantId, String internalCode);
    boolean existsByTenantIdAndBarcode(UUID tenantId, String barcode);
}
```

- [ ] **Step 8: DTOs**

```java
package rd.dalventa.api.product.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateProductRequest(
        @JsonProperty("categoryId") @NotNull UUID categoryId,
        @JsonProperty("internalCode") @NotBlank String internalCode,
        String barcode,
        @NotBlank String description,
        @NotBlank String unit,
        @NotNull BigDecimal cost,
        @JsonProperty("salePrice") @NotNull BigDecimal salePrice,
        @JsonProperty("wholesalePrice") @NotNull BigDecimal wholesalePrice,
        @JsonProperty("taxRate") @NotNull BigDecimal taxRate,
        @JsonProperty("tracksInventory") boolean tracksInventory
) {}
```

```java
package rd.dalventa.api.product.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateProductRequest(
        @JsonProperty("categoryId") @NotNull UUID categoryId,
        @NotBlank String description,
        @NotBlank String unit,
        @NotNull BigDecimal cost,
        @JsonProperty("salePrice") @NotNull BigDecimal salePrice,
        @JsonProperty("wholesalePrice") @NotNull BigDecimal wholesalePrice,
        @JsonProperty("taxRate") @NotNull BigDecimal taxRate,
        @JsonProperty("tracksInventory") boolean tracksInventory,
        boolean active
) {}
```

```java
package rd.dalventa.api.product.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import rd.dalventa.api.product.domain.Product;

import java.math.BigDecimal;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductResponse(
        UUID id,
        UUID categoryId,
        String internalCode,
        String barcode,
        String description,
        String unit,
        BigDecimal cost,
        BigDecimal salePrice,
        BigDecimal wholesalePrice,
        BigDecimal taxRate,
        boolean tracksInventory,
        boolean active
) {
    public static ProductResponse from(Product p, boolean showCost, boolean showPrice) {
        return new ProductResponse(
                p.getId(), p.getCategoryId(), p.getInternalCode(), p.getBarcode(), p.getDescription(),
                p.getUnit(),
                showCost ? p.getCost() : null,
                showPrice ? p.getSalePrice() : null,
                showPrice ? p.getWholesalePrice() : null,
                p.getTaxRate(), p.isTracksInventory(), p.isActive()
        );
    }
}
```

- [ ] **Step 9: Service**

```java
package rd.dalventa.api.product.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;
import rd.dalventa.api.product.domain.Product;
import rd.dalventa.api.product.dto.CreateProductRequest;
import rd.dalventa.api.product.dto.ProductResponse;
import rd.dalventa.api.product.dto.UpdateProductRequest;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final PermissionResolutionService permissionResolutionService;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public ProductResponse create(CreateProductRequest req) {
        var tenantId = TenantContext.require();
        if (productRepository.existsByTenantIdAndInternalCode(tenantId, req.internalCode())) {
            throw new DuplicateResourceException("Ya existe un producto con ese codigo interno");
        }
        if (req.barcode() != null && productRepository.existsByTenantIdAndBarcode(tenantId, req.barcode())) {
            throw new DuplicateResourceException("Ya existe un producto con ese codigo de barras");
        }

        var product = new Product(req.categoryId(), req.internalCode(), req.barcode(), req.description(),
                req.unit(), req.cost(), req.salePrice(), req.wholesalePrice(), req.taxRate(), req.tracksInventory());
        product.setTenantId(tenantId);
        return toResponse(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> list() {
        return productRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ProductResponse update(UUID id, UpdateProductRequest req) {
        var tenantId = TenantContext.require();
        var product = productRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));

        product.setCategoryId(req.categoryId());
        product.setDescription(req.description());
        product.setUnit(req.unit());
        product.setCost(req.cost());
        product.setSalePrice(req.salePrice());
        product.setWholesalePrice(req.wholesalePrice());
        product.setTaxRate(req.taxRate());
        product.setTracksInventory(req.tracksInventory());
        product.setActive(req.active());
        return toResponse(productRepository.save(product));
    }

    private ProductResponse toResponse(Product product) {
        var user = currentUserProvider.current();
        boolean showCost = user.isPresent() && permissionResolutionService.has(user.get(), PermissionCode.COST_VIEW);
        boolean showPrice = user.isPresent() && permissionResolutionService.has(user.get(), PermissionCode.PRICE_VIEW);
        return ProductResponse.from(product, showCost, showPrice);
    }
}
```

- [ ] **Step 10: Controller**

```java
package rd.dalventa.api.product.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.product.dto.CreateProductRequest;
import rd.dalventa.api.product.dto.ProductResponse;
import rd.dalventa.api.product.dto.UpdateProductRequest;
import rd.dalventa.api.product.service.ProductService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('INVENTORY_CREATE')")
    public ApiResponse<ProductResponse> create(@Valid @RequestBody CreateProductRequest req) {
        return ApiResponse.ok(productService.create(req));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('INVENTORY_VIEW')")
    public ApiResponse<List<ProductResponse>> list() {
        return ApiResponse.ok(productService.list());
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('INVENTORY_EDIT')")
    public ApiResponse<ProductResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateProductRequest req) {
        return ApiResponse.ok(productService.update(id, req));
    }
}
```

- [ ] **Step 11: Add `ProductRepository` to `IntegrationTestBase`**

Add the field, and in `cleanAll()`, `productRepository.deleteAll();` before `categoryRepository.deleteAll();`.

- [ ] **Step 12: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=ProductIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 13: Commit**

```bash
git add apps/api
git commit -m "feat: add Product entity with permission-gated cost/price visibility"
```

---

### Task 3: `BranchInventory` and stock-by-branch query

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/domain/BranchInventory.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/repository/BranchInventoryRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/dto/BranchInventoryResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/service/InventoryQueryService.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/web/InventoryController.java`
- Create: `apps/api/src/main/resources/db/migration/V12__branch_inventory.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/inventory/InventoryQueryIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `BranchInventoryRepository`)

**Interfaces:**
- Consumes: `Branch` (existing) — `BranchInventory.branchId`. `Product` (Task 2) — `BranchInventory.productId`.
- Produces: `BranchInventory(UUID branchId, UUID productId)` constructor (currentStock/minStock default 0, maxStock null), getters/setters for `currentStock`, `minStock`, `maxStock`. `BranchInventoryRepository.findByTenantIdAndBranchIdAndProductId(UUID, UUID, UUID) : Optional<BranchInventory>` and `.findAllByTenantIdAndBranchId(UUID, UUID) : List<BranchInventory>` — Task 4's movement service and Task 5's low-stock query both call these exact methods. `InventoryController` is the shared controller class Task 4 and Task 5 add endpoints to (do not create a second controller for movements or low-stock).

Note: this task creates the `BranchInventory` row lazily — there is no "create a branch-inventory row" endpoint. A row is created the first time a movement targets a `(branchId, productId)` pair that doesn't have one yet (Task 4's job). This task only builds the entity/repository/read-side (`GET /api/inventory/branch/{branchId}`) plus a test that seeds a row directly via the repository (not through the API, since no create-row endpoint exists yet) to prove the read path works.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.inventory;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.inventory.domain.BranchInventory;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InventoryQueryIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void getBranchInventory_returnsSeededStock() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = java.util.UUID.fromString(objectMapper.readTree(branchRes).path("data").path("id").asText());

        var categoryRes = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        var categoryId = java.util.UUID.fromString(objectMapper.readTree(categoryRes).path("data").path("id").asText());

        var productRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = java.util.UUID.fromString(objectMapper.readTree(productRes).path("data").path("id").asText());

        var tenantId = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin@dalventa.test"))
                .findFirst().orElseThrow().getTenantId();

        var inventory = new BranchInventory(branchId, productId);
        inventory.setTenantId(tenantId);
        inventory.setCurrentStock(20);
        inventory.setMinStock(5);
        branchInventoryRepository.save(inventory);

        mockMvc.perform(get("/api/inventory/branch/" + branchId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].currentStock").value(20))
                .andExpect(jsonPath("$.data[0].minStock").value(5));
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=InventoryQueryIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE branch_inventory (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID    NOT NULL REFERENCES tenants(id),
    branch_id     UUID    NOT NULL REFERENCES branches(id),
    product_id    UUID    NOT NULL REFERENCES products(id),
    current_stock INT     NOT NULL DEFAULT 0,
    min_stock     INT     NOT NULL DEFAULT 0,
    max_stock     INT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255)
);

CREATE UNIQUE INDEX idx_branch_inventory_branch_product ON branch_inventory(branch_id, product_id);
CREATE INDEX idx_branch_inventory_tenant_id ON branch_inventory(tenant_id);
```
Save as `apps/api/src/main/resources/db/migration/V12__branch_inventory.sql`.

- [ ] **Step 4: Entity**

```java
package rd.dalventa.api.inventory.domain;

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
@Table(name = "branch_inventory")
public class BranchInventory extends TenantAwareEntity {

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "current_stock", nullable = false)
    private int currentStock = 0;

    @Column(name = "min_stock", nullable = false)
    private int minStock = 0;

    @Column(name = "max_stock")
    private Integer maxStock;

    public BranchInventory(UUID branchId, UUID productId) {
        this.branchId = branchId;
        this.productId = productId;
    }
}
```

- [ ] **Step 5: Repository**

```java
package rd.dalventa.api.inventory.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.inventory.domain.BranchInventory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BranchInventoryRepository extends JpaRepository<BranchInventory, UUID> {
    Optional<BranchInventory> findByTenantIdAndBranchIdAndProductId(UUID tenantId, UUID branchId, UUID productId);
    List<BranchInventory> findAllByTenantIdAndBranchId(UUID tenantId, UUID branchId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select bi from BranchInventory bi where bi.tenantId = :tenantId and bi.branchId = :branchId and bi.productId = :productId")
    Optional<BranchInventory> lockByTenantIdAndBranchIdAndProductId(UUID tenantId, UUID branchId, UUID productId);

    @Query("select bi from BranchInventory bi where bi.tenantId = :tenantId and bi.branchId = :branchId and bi.currentStock < bi.minStock")
    List<BranchInventory> findLowStock(UUID tenantId, UUID branchId);
}
```

- [ ] **Step 6: DTO**

```java
package rd.dalventa.api.inventory.dto;

import rd.dalventa.api.inventory.domain.BranchInventory;

import java.util.UUID;

public record BranchInventoryResponse(
        UUID productId,
        int currentStock,
        int minStock,
        Integer maxStock
) {
    public static BranchInventoryResponse from(BranchInventory bi) {
        return new BranchInventoryResponse(bi.getProductId(), bi.getCurrentStock(), bi.getMinStock(), bi.getMaxStock());
    }
}
```

- [ ] **Step 7: Query service**

```java
package rd.dalventa.api.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.inventory.dto.BranchInventoryResponse;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryQueryService {

    private final BranchInventoryRepository branchInventoryRepository;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public List<BranchInventoryResponse> byBranch(UUID branchId) {
        var tenantId = requireBranchInTenant(branchId);
        return branchInventoryRepository.findAllByTenantIdAndBranchId(tenantId, branchId)
                .stream().map(BranchInventoryResponse::from).toList();
    }

    private UUID requireBranchInTenant(UUID branchId) {
        var tenantId = TenantContext.require();
        branchRepository.findById(branchId)
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sucursal no encontrada"));
        return tenantId;
    }
}
```

- [ ] **Step 8: Controller**

```java
package rd.dalventa.api.inventory.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.inventory.dto.BranchInventoryResponse;
import rd.dalventa.api.inventory.service.InventoryQueryService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryQueryService inventoryQueryService;

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("@permissionService.has('INVENTORY_VIEW')")
    public ApiResponse<List<BranchInventoryResponse>> byBranch(@PathVariable UUID branchId) {
        return ApiResponse.ok(inventoryQueryService.byBranch(branchId));
    }
}
```

- [ ] **Step 9: Add `BranchInventoryRepository` to `IntegrationTestBase`**

Add the field, and in `cleanAll()`, `branchInventoryRepository.deleteAll();` before `productRepository.deleteAll();`.

- [ ] **Step 10: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=InventoryQueryIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 1, Failures: 0, Errors: 0`.

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "feat: add BranchInventory entity and stock-by-branch query"
```

---

### Task 4: `InventoryMovement` — audited entry/exit/adjustment

**Files:**
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/domain/InventoryMovementType.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/domain/InventoryMovement.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/repository/InventoryMovementRepository.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/dto/CreateInventoryMovementRequest.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/dto/InventoryMovementResponse.java`
- Create: `apps/api/src/main/java/rd/dalventa/api/inventory/service/InventoryMovementService.java`
- Modify: `apps/api/src/main/java/rd/dalventa/api/inventory/web/InventoryController.java` (add movement endpoints)
- Create: `apps/api/src/main/resources/db/migration/V13__inventory_movements.sql`
- Test: `apps/api/src/test/java/rd/dalventa/api/inventory/InventoryMovementIntegrationTest.java`
- Modify: `apps/api/src/test/java/rd/dalventa/api/support/IntegrationTestBase.java` (add `InventoryMovementRepository`)

**Interfaces:**
- Consumes: `BranchInventoryRepository.lockByTenantIdAndBranchIdAndProductId` (Task 3, exact method used here to satisfy the pessimistic-lock global constraint). `Product` (Task 2) — validated to exist and belong to the tenant before creating a movement. `Branch` (existing) — same validation. `CurrentUserProvider.current()` (Task 2) — resolves `userId` for the movement record.
- Produces: `InventoryMovementService.recordMovement(CreateInventoryMovementRequest) : InventoryMovementResponse` — this is the single entry point later modules (POS/Sale) will call to decrement stock on a sale; do not add a second stock-mutation path.

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.inventory;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InventoryMovementIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, UUID branchId, UUID productId) {}

    private Setup setup(String email) throws Exception {
        String token = registerTenantAndGetToken(email, "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = UUID.fromString(objectMapper.readTree(branchRes).path("data").path("id").asText());

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
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = UUID.fromString(objectMapper.readTree(productRes).path("data").path("id").asText());

        return new Setup(token, branchId, productId);
    }

    @Test
    void entryMovement_onFirstTimeProduct_createsBranchInventoryAndIncreasesStock() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/inventory/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                                + "\",\"type\":\"ENTRY\",\"quantity\":20,\"reason\":\"Compra inicial\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.previousStock").value(0))
                .andExpect(jsonPath("$.data.newStock").value(20));

        mockMvc.perform(get("/api/inventory/branch/" + s.branchId()).header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data[0].currentStock").value(20));
    }

    @Test
    void exitMovement_exceedingStock_returnsBadRequest() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                        + "\",\"type\":\"ENTRY\",\"quantity\":5,\"reason\":\"Compra inicial\"}"));

        mockMvc.perform(post("/api/inventory/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                                + "\",\"type\":\"EXIT\",\"quantity\":10,\"reason\":\"Venta\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adjustmentMovement_withoutReason_returnsBadRequest() throws Exception {
        var s = setup("admin3@dalventa.test");

        mockMvc.perform(post("/api/inventory/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                                + "\",\"type\":\"ADJUSTMENT\",\"quantity\":3,\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());
    }
}
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
./mvnw test -Dtest=InventoryMovementIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error.

- [ ] **Step 3: Migration**

```sql
CREATE TABLE inventory_movements (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id),
    branch_inventory_id UUID        NOT NULL REFERENCES branch_inventory(id),
    type                VARCHAR(20) NOT NULL,
    quantity            INT         NOT NULL,
    previous_stock      INT         NOT NULL,
    new_stock           INT         NOT NULL,
    reason              TEXT        NOT NULL,
    user_id             UUID        NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255)
);

CREATE INDEX idx_inventory_movements_tenant_id ON inventory_movements(tenant_id);
CREATE INDEX idx_inventory_movements_branch_inventory_id ON inventory_movements(branch_inventory_id);
```
Save as `apps/api/src/main/resources/db/migration/V13__inventory_movements.sql`.

- [ ] **Step 4: Type enum**

```java
package rd.dalventa.api.inventory.domain;

public enum InventoryMovementType {
    ENTRY,
    EXIT,
    ADJUSTMENT
}
```

- [ ] **Step 5: Entity**

```java
package rd.dalventa.api.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "inventory_movements")
public class InventoryMovement extends TenantAwareEntity {

    @Column(name = "branch_inventory_id", nullable = false)
    private UUID branchInventoryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InventoryMovementType type;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "previous_stock", nullable = false)
    private int previousStock;

    @Column(name = "new_stock", nullable = false)
    private int newStock;

    @Column(nullable = false)
    private String reason;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    public InventoryMovement(UUID branchInventoryId, InventoryMovementType type, int quantity,
                              int previousStock, int newStock, String reason, UUID userId) {
        this.branchInventoryId = branchInventoryId;
        this.type = type;
        this.quantity = quantity;
        this.previousStock = previousStock;
        this.newStock = newStock;
        this.reason = reason;
        this.userId = userId;
    }
}
```

- [ ] **Step 6: Repository**

```java
package rd.dalventa.api.inventory.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.inventory.domain.InventoryMovement;

import java.util.List;
import java.util.UUID;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {
    List<InventoryMovement> findAllByTenantIdAndBranchInventoryId(UUID tenantId, UUID branchInventoryId);
}
```

- [ ] **Step 7: DTOs**

```java
package rd.dalventa.api.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import rd.dalventa.api.inventory.domain.InventoryMovementType;

import java.util.UUID;

public record CreateInventoryMovementRequest(
        @JsonProperty("branchId") @NotNull UUID branchId,
        @JsonProperty("productId") @NotNull UUID productId,
        @NotNull InventoryMovementType type,
        @Positive int quantity,
        @NotBlank String reason
) {}
```

```java
package rd.dalventa.api.inventory.dto;

import rd.dalventa.api.inventory.domain.InventoryMovement;
import rd.dalventa.api.inventory.domain.InventoryMovementType;

import java.util.UUID;

public record InventoryMovementResponse(
        UUID id,
        InventoryMovementType type,
        int quantity,
        int previousStock,
        int newStock,
        String reason
) {
    public static InventoryMovementResponse from(InventoryMovement m) {
        return new InventoryMovementResponse(m.getId(), m.getType(), m.getQuantity(),
                m.getPreviousStock(), m.getNewStock(), m.getReason());
    }
}
```

- [ ] **Step 8: Service**

`ADJUSTMENT` always requires a non-blank `reason` (enforced by `@NotBlank` on the DTO already — no extra check needed here beyond that). `EXIT` must not drop `currentStock` below zero. `ENTRY`/`ADJUSTMENT` increase or set stock without that floor (an `ADJUSTMENT` can be a negative correction too — see note below on `quantity` sign).

Note on sign: the DTO's `quantity` is `@Positive` (always a positive magnitude, per the design spec §3.1: "siempre positivo; el signo lo da `type`"). For `ADJUSTMENT`, this plan treats the request's `quantity` as an *increase* (a downward correction is expressed as an `EXIT` with the correction amount and a `reason` explaining it's a physical-count correction, not a sale) — this keeps `ADJUSTMENT` and `ENTRY` symmetric and avoids needing a signed-quantity field. If a future module needs signed adjustments, that's a schema change for that module, not this one.

```java
package rd.dalventa.api.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.inventory.domain.BranchInventory;
import rd.dalventa.api.inventory.domain.InventoryMovement;
import rd.dalventa.api.inventory.dto.CreateInventoryMovementRequest;
import rd.dalventa.api.inventory.dto.InventoryMovementResponse;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.inventory.repository.InventoryMovementRepository;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;

@Service
@RequiredArgsConstructor
public class InventoryMovementService {

    private final BranchInventoryRepository branchInventoryRepository;
    private final InventoryMovementRepository inventoryMovementRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public InventoryMovementResponse recordMovement(CreateInventoryMovementRequest req) {
        var tenantId = TenantContext.require();

        branchRepository.findById(req.branchId())
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sucursal no encontrada"));
        productRepository.findByIdAndTenantId(req.productId(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));

        var branchInventory = branchInventoryRepository
                .lockByTenantIdAndBranchIdAndProductId(tenantId, req.branchId(), req.productId())
                .orElseGet(() -> createBranchInventory(tenantId, req.branchId(), req.productId()));

        int previousStock = branchInventory.getCurrentStock();
        int newStock = switch (req.type()) {
            case ENTRY, ADJUSTMENT -> previousStock + req.quantity();
            case EXIT -> previousStock - req.quantity();
        };

        if (newStock < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Existencia insuficiente para esta salida");
        }

        branchInventory.setCurrentStock(newStock);
        branchInventoryRepository.save(branchInventory);

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado"))
                .getId();

        var movement = new InventoryMovement(branchInventory.getId(), req.type(), req.quantity(),
                previousStock, newStock, req.reason(), userId);
        movement.setTenantId(tenantId);
        return InventoryMovementResponse.from(inventoryMovementRepository.save(movement));
    }

    private BranchInventory createBranchInventory(java.util.UUID tenantId, java.util.UUID branchId, java.util.UUID productId) {
        var branchInventory = new BranchInventory(branchId, productId);
        branchInventory.setTenantId(tenantId);
        return branchInventoryRepository.save(branchInventory);
    }
}
```

- [ ] **Step 9: Add movement endpoints to `InventoryController`**

```java
    private final InventoryMovementService inventoryMovementService;

    @PostMapping("/movements")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('INVENTORY_ADJUST')")
    public ApiResponse<rd.dalventa.api.inventory.dto.InventoryMovementResponse> recordMovement(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
            rd.dalventa.api.inventory.dto.CreateInventoryMovementRequest req) {
        return ApiResponse.ok(inventoryMovementService.recordMovement(req));
    }
```

(Add the constructor parameter `InventoryMovementService inventoryMovementService` — `@RequiredArgsConstructor` picks it up automatically since it's a `final` field. Add the necessary imports at the top of the file rather than using fully-qualified names inline; the fully-qualified names above are shown only so this step is copy-pasteable without ambiguity — clean them up to normal `import` statements when applying this step.)

- [ ] **Step 10: Add `InventoryMovementRepository` to `IntegrationTestBase`**

Add the field, and in `cleanAll()`, `inventoryMovementRepository.deleteAll();` before `branchInventoryRepository.deleteAll();`.

- [ ] **Step 11: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=InventoryMovementIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 3, Failures: 0, Errors: 0`.

- [ ] **Step 12: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`.

- [ ] **Step 13: Commit**

```bash
git add apps/api
git commit -m "feat: add InventoryMovement with audited entry/exit/adjustment and pessimistic locking"
```

---

### Task 5: Low-stock query

**Files:**
- Modify: `apps/api/src/main/java/rd/dalventa/api/inventory/service/InventoryQueryService.java` (add `lowStock` method)
- Modify: `apps/api/src/main/java/rd/dalventa/api/inventory/web/InventoryController.java` (add `GET /api/inventory/low-stock`)
- Test: `apps/api/src/test/java/rd/dalventa/api/inventory/InventoryMovementIntegrationTest.java` (add one test) — or a new small test file `LowStockIntegrationTest.java`; this plan adds it to a new file to keep `InventoryMovementIntegrationTest` focused on movements only.
- Test: `apps/api/src/test/java/rd/dalventa/api/inventory/LowStockIntegrationTest.java`

**Interfaces:**
- Consumes: `BranchInventoryRepository.findLowStock(UUID, UUID)` (Task 3, already defined — this task is the first consumer).

- [ ] **Step 1: Write the failing integration test**

```java
package rd.dalventa.api.inventory;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LowStockIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void lowStock_returnsOnlyProductsBelowMinimum() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = UUID.fromString(objectMapper.readTree(branchRes).path("data").path("id").asText());

        var categoryRes = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        var categoryId = objectMapper.readTree(categoryRes).path("data").path("id").asText();

        var lowProductRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-LOW\","
                                + "\"barcode\":null,\"description\":\"Bajo stock\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var lowProductId = objectMapper.readTree(lowProductRes).path("data").path("id").asText();

        var okProductRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-OK\","
                                + "\"barcode\":null,\"description\":\"Stock normal\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var okProductId = objectMapper.readTree(okProductRes).path("data").path("id").asText();

        // low product: 4 units, min 5 -> below minimum
        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + lowProductId
                        + "\",\"type\":\"ENTRY\",\"quantity\":4,\"reason\":\"Compra inicial\"}"));

        // ok product: 20 units, default min 0 -> not below minimum
        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + okProductId
                        + "\",\"type\":\"ENTRY\",\"quantity\":20,\"reason\":\"Compra inicial\"}"));

        // Directly set min_stock=5 for the low product's BranchInventory row (no endpoint
        // to configure min/max exists yet in this plan's scope; that's a product-edit
        // concern for a later iteration, so we reach into the repository for the test).
        var tenantId = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin@dalventa.test"))
                .findFirst().orElseThrow().getTenantId();
        var lowInventory = branchInventoryRepository
                .findByTenantIdAndBranchIdAndProductId(tenantId, branchId, UUID.fromString(lowProductId))
                .orElseThrow();
        lowInventory.setMinStock(5);
        branchInventoryRepository.save(lowInventory);

        mockMvc.perform(get("/api/inventory/low-stock?branchId=" + branchId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].productId").value(lowProductId));
    }
}
```

- [ ] **Step 2: Run to confirm it fails**

```bash
./mvnw test -Dtest=LowStockIntegrationTest -Dspring.profiles.active=test
```
Expected: compilation error or 404 (endpoint doesn't exist yet).

- [ ] **Step 3: Add `lowStock` to `InventoryQueryService`**

```java
    public List<BranchInventoryResponse> lowStock(UUID branchId) {
        var tenantId = requireBranchInTenant(branchId);
        return branchInventoryRepository.findLowStock(tenantId, branchId)
                .stream().map(BranchInventoryResponse::from).toList();
    }
```

(Add this method to the existing `InventoryQueryService` class from Task 3 — same class, no `@Transactional(readOnly = true)` needed twice if you annotate the class-level, but this codebase annotates per-method per the `byBranch` example; add `@Transactional(readOnly = true)` on this method too, consistent with `byBranch`.)

- [ ] **Step 4: Add the endpoint to `InventoryController`**

```java
    @GetMapping("/low-stock")
    @PreAuthorize("@permissionService.has('INVENTORY_VIEW')")
    public ApiResponse<List<BranchInventoryResponse>> lowStock(@RequestParam UUID branchId) {
        return ApiResponse.ok(inventoryQueryService.lowStock(branchId));
    }
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
./mvnw test -Dtest=LowStockIntegrationTest -Dspring.profiles.active=test
```
Expected: `Tests run: 1, Failures: 0, Errors: 0`.

- [ ] **Step 6: Run the full suite to confirm no regressions**

```bash
./mvnw test -Dspring.profiles.active=test
```
Expected: `BUILD SUCCESS`. Total test count should be 36 (baseline) + 2 (Category) + 3 (Product) + 1 (InventoryQuery) + 3 (InventoryMovement) + 1 (LowStock) = 46.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat: add low-stock query endpoint"
```

---

## What comes after this plan

This plan delivers Product + BranchInventory as a standalone, testable slice. It does **not** yet include: `InventoryCount` (turn-based physical-count reconciliation — depends on `CashShift`, not yet built), branch-to-branch transfers, or product images. The next plan in the roadmap is CashShift/Denominaciones/Algoritmo de cambio, followed by POS/Sale (which will call `InventoryMovementService.recordMovement` directly to decrement stock on a sale — do not build a second stock-mutation path when that plan lands), then Credit/CuentasPorCobrar.
