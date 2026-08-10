import type { InvoiceResponse } from "@/types/sale";
import type { InvoiceSettingsResponse } from "@/types/settings";

/**
 * Venta inventada para dibujar el preview de la factura.
 *
 * Los datos del negocio salen del formulario tal cual se esta editando, asi
 * que el preview responde en vivo a cada interruptor. El resto es una venta
 * plausible: sin ella el diseno se veria vacio y no diria nada.
 */
export function buildSampleInvoice(settings: InvoiceSettingsResponse): InvoiceResponse {
  return {
    id: "preview",
    // Que nadie confunda el ejemplo con una factura emitida.
    invoiceNumber: "EJEMPLO-0001",
    fiscalReceiptType: null,
    fiscalNcf: null,
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
    business: {
      name: settings.businessName,
      rnc: settings.rnc,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      city: settings.city,
      logoUrl: settings.logoUrl,
      footerMessage: settings.footerMessage,
      printSize: settings.printSize,
      showLogo: settings.showLogo,
      showRnc: settings.showRnc,
      showPhone: settings.showPhone,
      showEmail: settings.showEmail,
      showAddress: settings.showAddress,
      showCustomer: settings.showCustomer,
      showTax: settings.showTax,
    },
    branchName: "Sucursal principal",
    registerName: "Caja 1",
    customer: {
      name: "Maria Gomez",
      documentId: "001-1234567-8",
      phone: "809-555-0300",
      email: null,
      address: null,
    },
    subtotal: "1250.00",
    taxTotal: "225.00",
    discountAmount: "0.00",
    total: "1475.00",
    amountPaid: "1475.00",
    rental: null,
    items: [
      {
        productName: "Bizcocho de 1/2 libra",
        productUnit: "unit",
        quantity: 1,
        unitPrice: "950.00",
        taxRate: "18.00",
        lineTotal: "950.00",
      },
      {
        productName: "Velas de bengala",
        productUnit: "unit",
        quantity: 2,
        unitPrice: "150.00",
        taxRate: "18.00",
        lineTotal: "300.00",
      },
    ],
    payments: [
      {
        id: "preview-payment",
        method: "CASH",
        amount: "1475.00",
      },
    ],
  };
}
