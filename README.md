# DaleVenta

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
| **Security** | Spring Security · JWT (access + refresh tokens) |
| **Testing** | JUnit 5 · Mockito · Testcontainers |
| **Containerization** | Docker · Docker Compose |
| **Web Server** | Nginx (reverse proxy) |
| **Frontend** | Next.js 15 · React 19 · TypeScript *(separate repo, later phase)* |

## Current Modules

- **auth** — JWT-based authentication, login/refresh, token validation
- **tenant** — Multi-tenant isolation, subscription plans
- **superadmin** — SaaS admin panel for tenant management and support
- **shared** — Common utilities, configuration, storage, rate limiting
- **dashboard** — Business analytics and KPI views
- **customer** — Customer management with credit profile support
- **branch** — Multi-branch organization and assignment
- **register** — Cash register/point-of-sale station management
- **permission** — RBAC with granular permission catalog and resolution engine

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

**Current test suite:** 35 tests (all green)

Run all tests:
```bash
./mvnw test -Dspring.profiles.active=test
```

Run a specific test class:
```bash
./mvnw test -Dtest=AuthServiceTest -Dspring.profiles.active=test
```

## What Comes Next

After this phase, each of these becomes its own plan:

- **Products & Inventory** — Category/product management, branch-level stock
- **POS & Sales** — Carriage and checkout flow with dynamic pricing
- **Cash Shifts & Change** — Opening/closing with denomination algorithm
- **Credit & Accounts Payable** — Customer credit accounts and payment tracking
- **Frontend (apps/web)** — Next.js dashboard and POS interface
- **Phase 2+ features** — Advanced reporting, returns, notifications, etc.

## Support

For issues, questions, or feedback:
- Check the [System Design](docs/superpowers/specs/) for business rules
- Review the [Plan](docs/superpowers/plans/) for technical context
- Open an issue with a clear title and reproduction steps
