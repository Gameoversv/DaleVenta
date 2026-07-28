import { describe, expect, it } from "vitest";
import {
  auditActionLabel,
  cashMovementTypeLabel,
  purchaseStatusLabel,
  quotationStatusLabel,
  rentalStatusLabel,
} from "./status-labels";

describe("purchaseStatusLabel", () => {
  it("names every purchase status", () => {
    expect(purchaseStatusLabel("DRAFT")).toBe("Borrador");
    expect(purchaseStatusLabel("RECEIVED")).toBe("Recibida");
    expect(purchaseStatusLabel("VOID")).toBe("Anulada");
  });
});

describe("quotationStatusLabel", () => {
  it("names every quotation status", () => {
    expect(quotationStatusLabel("DRAFT")).toBe("Borrador");
    expect(quotationStatusLabel("SENT")).toBe("Enviada");
    expect(quotationStatusLabel("ACCEPTED")).toBe("Aceptada");
    expect(quotationStatusLabel("EXPIRED")).toBe("Vencida");
    expect(quotationStatusLabel("CANCELLED")).toBe("Cancelada");
  });
});

describe("rentalStatusLabel", () => {
  it("names every rental status", () => {
    expect(rentalStatusLabel("RESERVED")).toBe("Reservado");
    expect(rentalStatusLabel("ACTIVE")).toBe("Alquilado");
    expect(rentalStatusLabel("RETURNED")).toBe("Recibido");
    expect(rentalStatusLabel("CANCELLED")).toBe("Anulado");
  });

  it("distinguishes an active rental from a returned one, which drive different actions", () => {
    expect(rentalStatusLabel("ACTIVE")).not.toBe(rentalStatusLabel("RETURNED"));
  });
});

describe("cashMovementTypeLabel", () => {
  it("names every movement kind", () => {
    expect(cashMovementTypeLabel("ENTRY")).toBe("Entrada");
    expect(cashMovementTypeLabel("WITHDRAWAL")).toBe("Retiro");
    expect(cashMovementTypeLabel("EXPENSE")).toBe("Gasto");
  });

  it("keeps money leaving the drawer distinct from money entering it", () => {
    expect(cashMovementTypeLabel("ENTRY")).not.toBe(cashMovementTypeLabel("WITHDRAWAL"));
  });
});

describe("auditActionLabel", () => {
  it("translates the known actions", () => {
    expect(auditActionLabel("SALE_VOID")).toBe("Venta anulada");
    expect(auditActionLabel("CASH_SHIFT_CLOSE")).toBe("Turno de caja cerrado");
    expect(auditActionLabel("USER_PERMISSION_OVERRIDE")).toBe("Permiso modificado");
  });

  it("shows an unmapped action verbatim rather than leaving the row blank", () => {
    // A new audit action added on the backend must still be visible in the log.
    expect(auditActionLabel("FISCAL_SEQUENCE_UPDATE")).toBe("FISCAL_SEQUENCE_UPDATE");
    expect(auditActionLabel("")).toBe("");
  });
});
