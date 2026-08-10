import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/render";
import PrintInvoicePage from "./page";
import type { InvoiceResponse } from "@/types/sale";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "s-1" }) }));

const print = vi.fn();

function invoice(printSize: InvoiceResponse["business"]["printSize"] = "THERMAL_80MM"): InvoiceResponse {
  return {
    id: "s-1",
    invoiceNumber: "FV-000123",
    fiscalReceiptType: null,
    fiscalNcf: null,
    status: "COMPLETED",
    createdAt: "2026-07-27T18:15:00.000Z",
    customer: null,
    rental: null,
    subtotal: "500.00",
    taxTotal: "0.00",
    discountAmount: "0.00",
    total: "500.00",
    items: [{ productName: "Bizcocho", productUnit: "unit", quantity: 2, unitPrice: "250.00", lineTotal: "500.00" }],
    payments: [{ id: "pay-1", method: "CASH", amount: "500.00" }],
    business: {
      name: "Reposteria Maranatha",
      rnc: "131-12345-6",
      address: "Calle 1",
      city: "Santiago",
      phone: "809-000-0000",
      email: "hola@maranatha.do",
      logoUrl: null,
      printSize,
      showLogo: false,
      showRnc: true,
      showAddress: true,
      showPhone: true,
      showEmail: false,
      showCustomer: true,
      showTax: false,
      footerMessage: "Gracias por su compra",
    },
  } as unknown as InvoiceResponse;
}

beforeEach(() => {
  get.mockReset();
  print.mockReset();
  vi.stubGlobal("print", print);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PrintInvoicePage", () => {
  it("prints the invoice of the sale in the URL without any click", async () => {
    get.mockResolvedValue({ data: { data: invoice() } });

    renderWithProviders(<PrintInvoicePage />);

    expect(await screen.findByText("FV-000123")).toBeInTheDocument();
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(get).toHaveBeenCalledWith("/api/sales/s-1/invoice");
  });

  it("prints on the paper width configured for the business", async () => {
    get.mockResolvedValue({ data: { data: invoice("THERMAL_58MM") } });

    renderWithProviders(<PrintInvoicePage />);

    await screen.findByText("FV-000123");
    expect(screen.getByTestId("print-invoice-paper").className).toContain("max-w-[58mm]");
  });

  it("never prints a blank page when the invoice cannot be loaded", async () => {
    get.mockRejectedValue(new Error("network"));

    renderWithProviders(<PrintInvoicePage />);

    expect(await screen.findByText(/no se pudo cargar la factura/i)).toBeInTheDocument();
    expect(print).not.toHaveBeenCalled();
  });
});
