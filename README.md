# DaleVenta

[![CI](https://github.com/Gameoversv/DaleVenta/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Gameoversv/DaleVenta/actions/workflows/ci.yml)
[![Security](https://github.com/Gameoversv/DaleVenta/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/Gameoversv/DaleVenta/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/github/license/Gameoversv/DaleVenta)](LICENSE)
[![Java 21](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A **multi-tenant SaaS POS (Point of Sale) system** for small retail businesses, with specialized support for bakeries and pastry shops (repostería). Built for rapid deployment and granular role-based access control (RBAC) with per-user permission overrides.

## Overview

DaleVenta handles:
- **Multi-tenant architecture** with isolated data per business
- **Complex RBAC**: roles + individual permission grants/revokes per user
- **Inventory management** by branch with movement tracking
- **Cash shift operations** with denomination-based change suggestion
- **Sales** in cash, transfer, credit, or mixed methods
- **Customer credit accounts** with payment tracking
- **Audit logging** for sensitive operations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Spring Boot 3 · Java 21 · Maven |
| **Database** | PostgreSQL 16 · Flyway migrations · JDBC |
| **Security** | Spring Security · JWT bearer tokens |
| **Testing** | JUnit 5 · Mockito · Testcontainers |
| **Containerization** | Docker · Docker Compose |
| **Web Server** | Nginx (reverse proxy) |
| **Frontend** | Next.js 16 · React 19 · TypeScript (`apps/web`) |

## Current Modules

- **auth** — JWT-based authentication, login, token validation, user management
- **tenant** — Multi-tenant isolation, subscription plans
- **superadmin** — SaaS admin panel for tenant management and support
- **shared** — Common utilities, configuration, storage, rate limiting
- **dashboard** — Business analytics and KPI views
- **customer** — Customer management with credit profile support
- **branch** — Multi-branch organization
- **register** — Cash register/point-of-sale station management
- **permission** — RBAC with granular permission catalog, resolution engine, and per-user permission overrides (grant/revoke)
- **product / inventory** — Products, categories, branch-level stock and movements
- **cashshift / denomination** — Shift open/close, denomination counting, change suggestion
- **sale** — POS checkout (cash/transfer/credit/mixed), void
- **credit** — Customer credit accounts, accounts receivable, payments
- **report** — Sales and payment-method reporting
- **audit** — Centralized audit log for sensitive operations (sale void, inventory adjustment, permission overrides)
- **quotation** — Quotes with printable customer proposals
- **purchase** — Suppliers, purchase orders, inventory receiving, accounts payable and supplier payments
- **rental** — Rental reservations, returns, deposits and billing
- **fiscal** — RNC, NCF sequences and fiscal receipts

## Frontend (`apps/web`)

Next.js 16 dashboard covering login, registration, POS, sales, quotations, purchases, rentals, branches, cash-shift, customers, products, inventory, fiscal configuration, reports, audit, tenant settings, and the super-admin panel.

## Getting Started

### Prerequisites

- Java 21
- Maven 3.9+
- PostgreSQL 16
- Docker + Docker Compose (for local development)

### Setup

1. **Clone and navigate:**
   ```bash
   cd apps/api
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database and secret values
   ```

3. **Build:**
   ```bash
   ./mvnw clean package
   ```

4. **Run tests:**
   ```bash
   DB_NAME=dalventa_test DB_USER=dalventa DB_PASSWORD=changeme \
   JWT_SECRET=ci-test-secret-256-bits-minimum-length-ok \
   ./mvnw test -Dspring.profiles.active=test
   ```

5. **Start the application:**
   ```bash
   ./mvnw spring-boot:run
   ```

   The API will be available at `http://localhost:8080/api/v1/`

### Docker Compose (Local Development)

`infra/docker-compose.yml` sets up PostgreSQL and Nginx:

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Spring Boot API on `localhost:8080` (via Nginx proxy)

## Design & Architecture

See the **[System Design Specification](docs/superpowers/specs/2026-07-04-dalventa-design.md)** for:
- Complete ERD and data model
- Business rules and policies
- Change algorithm with denomination optimization
- Audit and security approach
- Roadmap and future phases

## Implementation Plan

See the **[Bootstrap RBAC Plan](docs/superpowers/plans/2026-07-04-bootstrap-rbac-branch-register.md)** for:
- Step-by-step task breakdown
- Critical dependencies and risks
- Test coverage strategy
- Review checkpoints

## Testing

**Backend:** 43 test classes (JUnit 5 + MockMvc over a real PostgreSQL)
**Frontend unit:** 35 Vitest + Testing Library suites (`npm test` in `apps/web`)
**Frontend E2E:** 16 Playwright specs (`apps/web/e2e`)

Coverage is enforced by JaCoCo: the build fails if line coverage drops below the
`jacoco.line.coverage` threshold in `apps/api/pom.xml` (currently 0.65, target 0.80).

Run the tests only:
```bash
./mvnw test -Dspring.profiles.active=test
```

Run the tests plus the coverage gate (what CI does):
```bash
./mvnw verify -Dspring.profiles.active=test
```
The HTML report lands in `apps/api/target/site/jacoco/index.html`.

Run a specific test class:
```bash
./mvnw test -Dtest=AuthServiceTest -Dspring.profiles.active=test
```

### Cross-cutting test suites

| Suite | What it protects |
|-------|------------------|
| `security/TenantIsolationIntegrationTest` | No endpoint may read or mutate another tenant's data |
| `security/ApiSecurityIntegrationTest` | Auth (401), permissions (403), JWT tampering, CORS, injection, error leakage |
| `support/IntegrationTestBase#provisionTenant` | One call builds a ready-to-use tenant for any module test |

### Local database

The integration tests need PostgreSQL on `localhost:5432`:
```bash
docker run -d --name dalventa_test_db \
  -e POSTGRES_DB=dalventa_test -e POSTGRES_USER=dalventa -e POSTGRES_PASSWORD=changeme \
  -p 5432:5432 postgres:16-alpine
```

## Roadmap

### Fase 0 — Preparación del piloto

El núcleo operativo está disponible. Cada tenant debe activar sus módulos desde el panel de
superadministración: compras/proveedores y denominaciones de caja para comercios con inventario y
efectivo; fiscal/NCF cuando corresponda; multisucursal, multicaja y alquileres solo si el negocio
los necesita.

### Fase 1 — Operación segura por sucursal y caja ✅

Los cajeros se asignan desde **Ajustes → Usuarios** a sucursales y cajas concretas. La API aplica
ese alcance en POS, turnos de caja e inventario; los administradores conservan la vista completa de
su negocio. Las cajas siempre deben pertenecer a una sucursal asignada.

### Fase 2 — Correcciones de venta auditables

Devoluciones parciales, anulaciones después del cierre, reapertura de turno, umbrales de descuento
y autorización de segundo usuario.

### Fase 3 — Inventario y productividad

Transferencias entre sucursales, ventas suspendidas, conteos cíclicos, etiquetas de código de barras
e importación masiva.

### Fase 4 — Gestión y relación con clientes

Reportes PDF/Excel/CSV, dashboard comparativo, notificaciones y portal de cliente.

### Fase 5 — Repostería y panadería

Materias primas, recetas, producción/BOM, mermas, rentabilidad y pronóstico de demanda.

## Security

### Bootstrap accounts

`DataSeeder` creates `admin@dalventa.rd` and `superadmin@dalventa.rd` on an empty database. The
super admin manages **every tenant**, so treat its credentials accordingly:

- Set `APP_SEED_ADMIN_PASSWORD` and `APP_SEED_SUPER_ADMIN_PASSWORD` before the first boot. If you
  leave them blank, the API generates a random password and prints it **once** in the startup log.
- `APP_SEED_RESET_PASSWORDS` must stay `false`. While it is `true`, every restart rewrites both
  passwords, which also silently undoes a password changed from the UI.
- Existing deployments seeded before this behaviour existed used a password committed to this
  repository. Rotate both accounts.

### Automated scanning

| Workflow | Runs | Checks |
|----------|------|--------|
| `security.yml` | push, PR, weekly | Trivy dependency CVEs (Maven + npm), Gitleaks over full git history, Semgrep (OWASP Top Ten, Java, TypeScript, secrets), Trivy IaC/Dockerfile misconfiguration |
| `codeql.yml` | push, PR, weekly | CodeQL `security-extended` for Java and TypeScript. Skips itself while the repository is private, since code scanning then requires GitHub Advanced Security |
| `dast.yml` | weekly, manual | ZAP baseline against a throwaway API container |
| `sonarcloud.yml` | push, PR | SonarQube Cloud code quality and coverage. Runs only while the `SONAR_ENABLED` repository variable is `true` |

#### Enabling SonarQube Cloud

The organization (`gameoversv`) and project key (`Gameoversv_DaleVenta`) are already set in
`apps/api/pom.xml`. Two steps remain, both outside this repository:

1. Import the repository at [sonarcloud.io](https://sonarcloud.io) into the `gameoversv`
   organization, choosing **GitHub Actions** as the analysis method so SonarCloud does not also try
   to run its own automatic analysis.
2. Generate a token (*My Account > Security*) and register it, then turn the workflow on:

   ```bash
   gh secret set SONAR_TOKEN --body '<token>'
   gh variable set SONAR_ENABLED --body true
   ```

The scanner consumes the coverage the build already writes — `target/site/jacoco/jacoco.xml` for
the API and `apps/web/coverage/lcov.info` for the web app — so both suites run before it.

Reproduce any of them locally with Docker:

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest \
  detect --source /repo --config /repo/.gitleaks.toml --redact
docker run --rm -v "$PWD:/src" -w /src semgrep/semgrep:1.97.0 \
  semgrep scan --config p/owasp-top-ten --config p/java --config p/typescript --metrics off
docker run --rm -v "$PWD:/repo" aquasec/trivy:latest \
  fs /repo --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed
```

Accepted findings and the reasoning behind each exclusion are documented inline in
`.github/workflows/security.yml`.

## Support

For issues, questions, or feedback:
- Check the [System Design](docs/superpowers/specs/) for business rules
- Review the [Plan](docs/superpowers/plans/) for technical context
- Open an issue with a clear title and reproduction steps
