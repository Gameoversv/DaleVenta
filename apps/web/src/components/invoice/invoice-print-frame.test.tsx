import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { InvoicePrintFrame } from "./invoice-print-frame";

describe("InvoicePrintFrame", () => {
  it("stays out of the way until a print is asked for", () => {
    renderWithProviders(<InvoicePrintFrame saleId="s-1" job={0} />);

    expect(screen.queryByTestId("invoice-print-frame")).not.toBeInTheDocument();
  });

  it("loads the printable invoice of the sale", () => {
    renderWithProviders(<InvoicePrintFrame saleId="s-1" job={1} />);

    const frame = screen.getByTestId("invoice-print-frame");
    expect(frame).toHaveAttribute("src", "/print/sales/s-1");
    expect(frame).toHaveAttribute("data-job", "1");
  });

  it("reloads on a new job so a reprint really reprints", () => {
    const { rerender } = renderWithProviders(<InvoicePrintFrame saleId="s-1" job={1} />);

    rerender(<InvoicePrintFrame saleId="s-1" job={2} />);

    expect(screen.getByTestId("invoice-print-frame")).toHaveAttribute("data-job", "2");
  });

  it("never shows on screen", () => {
    renderWithProviders(<InvoicePrintFrame saleId="s-1" job={1} />);

    const frame = screen.getByTestId("invoice-print-frame");
    expect(frame).toHaveAttribute("aria-hidden", "true");
    expect(frame.style.position).toBe("fixed");
  });
});
