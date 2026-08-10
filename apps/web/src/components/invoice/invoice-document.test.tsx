import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { InvoiceDocument, invoiceWidth } from "./invoice-document";
import { buildSampleInvoice } from "./sample-invoice";
import type { InvoiceSettingsResponse } from "@/types/settings";

const settings: InvoiceSettingsResponse = {
  businessName: "Reposteria Dona Ana",
  rnc: "131234567",
  phone: "809-555-0100 / 829-555-0200",
  email: "ventas@donaana.do",
  address: "Calle Duarte 12",
  city: "Santiago",
  logoUrl: null,
  footerMessage: "Gracias por su compra",
  printSize: "LETTER",
  showLogo: true,
  showRnc: true,
  showPhone: true,
  showEmail: true,
  showAddress: true,
  showCustomer: true,
  showTax: true,
};

describe("InvoiceDocument", () => {
  it("shows the business details the settings turned on", () => {
    renderWithProviders(<InvoiceDocument data={buildSampleInvoice(settings)} />);

    expect(screen.getByText("Reposteria Dona Ana")).toBeInTheDocument();
    expect(screen.getByText("RNC: 131234567")).toBeInTheDocument();
    expect(screen.getByText("Calle Duarte 12, Santiago")).toBeInTheDocument();
    expect(screen.getByText(/809-555-0100 \/ 829-555-0200/)).toBeInTheDocument();
    expect(screen.getByText("Gracias por su compra")).toBeInTheDocument();
  });

  it("drops each section its toggle turns off", () => {
    const hidden = { ...settings, showRnc: false, showAddress: false, showPhone: false, showEmail: false };

    renderWithProviders(<InvoiceDocument data={buildSampleInvoice(hidden)} />);

    expect(screen.queryByText("RNC: 131234567")).not.toBeInTheDocument();
    expect(screen.queryByText("Calle Duarte 12, Santiago")).not.toBeInTheDocument();
    expect(screen.queryByText(/809-555-0100/)).not.toBeInTheDocument();
  });

  it("hides the tax line when the tax toggle is off", () => {
    renderWithProviders(<InvoiceDocument data={buildSampleInvoice({ ...settings, showTax: false })} />);

    expect(screen.queryByText("Impuesto")).not.toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("hides the customer block when the customer toggle is off", () => {
    renderWithProviders(<InvoiceDocument data={buildSampleInvoice({ ...settings, showCustomer: false })} />);

    expect(screen.queryByText("Cliente")).not.toBeInTheDocument();
  });

  // Una tira termica no se puede dibujar del ancho de la pantalla: enganaria
  // sobre como sale impresa.
  it("narrows to the real paper width for each print size", () => {
    expect(invoiceWidth("LETTER")).toBe("max-w-3xl");
    expect(invoiceWidth("THERMAL_80MM")).toBe("max-w-[80mm]");
    expect(invoiceWidth("THERMAL_58MM")).toBe("max-w-[58mm]");
  });
});

describe("buildSampleInvoice", () => {
  it("carries the settings into the business block untouched", () => {
    const sample = buildSampleInvoice(settings);

    expect(sample.business.name).toBe("Reposteria Dona Ana");
    expect(sample.business.printSize).toBe("LETTER");
    expect(sample.business.showTax).toBe(true);
  });

  it("fills in a believable sale so the layout is not empty", () => {
    const sample = buildSampleInvoice(settings);

    expect(sample.items.length).toBeGreaterThan(0);
    expect(sample.customer).not.toBeNull();
    expect(sample.payments.length).toBeGreaterThan(0);
    expect(Number(sample.total)).toBeGreaterThan(0);
  });

  it("marks itself as an example, so nobody takes it for a real invoice", () => {
    expect(buildSampleInvoice(settings).invoiceNumber).toMatch(/ejemplo/i);
  });
});
