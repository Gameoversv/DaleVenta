import type { CashMovementResponse } from "@/types/cash-shift";
import type { PurchaseResponse } from "@/types/purchase";
import type { QuotationResponse } from "@/types/quotation";
import type { RentalContractStatus } from "@/types/rental";

/**
 * Spanish wording for the statuses the API returns.
 *
 * These lived one per page under the same name, so the vocabulary a cashier sees drifted with
 * whichever screen they were on. Collected here so a status is named once.
 */

export function purchaseStatusLabel(status: PurchaseResponse["status"]): string {
  if (status === "RECEIVED") return "Recibida";
  if (status === "VOID") return "Anulada";
  return "Borrador";
}

export function quotationStatusLabel(status: QuotationResponse["status"]): string {
  const labels: Record<QuotationResponse["status"], string> = {
    DRAFT: "Borrador",
    SENT: "Enviada",
    ACCEPTED: "Aceptada",
    EXPIRED: "Vencida",
    CANCELLED: "Cancelada",
  };
  return labels[status];
}

export function rentalStatusLabel(status: RentalContractStatus): string {
  if (status === "RESERVED") return "Reservado";
  if (status === "ACTIVE") return "Alquilado";
  if (status === "RETURNED") return "Recibido";
  return "Anulado";
}

export function cashMovementTypeLabel(type: CashMovementResponse["type"]): string {
  if (type === "ENTRY") return "Entrada";
  if (type === "WITHDRAWAL") return "Retiro";
  return "Gasto";
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  SALE_VOID: "Venta anulada",
  INVENTORY_ADJUSTMENT: "Inventario ajustado",
  USER_PERMISSION_OVERRIDE: "Permiso modificado",
  USER_PASSWORD_SET: "Clave reiniciada",
  PRODUCT_STATUS_CHANGE: "Producto activado/desactivado",
  PRODUCT_PRICE_CHANGE: "Precio de producto cambiado",
  CASH_SHIFT_CLOSE: "Turno de caja cerrado",
  INVOICE_SETTINGS_UPDATE: "Configuracion de factura",
  DAILY_CLOSE_CREATE: "Cierre diario guardado",
};

/**
 * Falls back to the raw action so a newly added audit action still appears in the log,
 * rather than rendering as a blank row.
 */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
