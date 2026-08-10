import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen } from "@/test/render";
import { InvoicePreviewDialog } from "./invoice-preview-dialog";
import type { InvoiceSettingsResponse } from "@/types/settings";

const settings: InvoiceSettingsResponse = {
  businessName: "Reposteria Dona Ana",
  rnc: "131234567",
  phone: "809-555-0100",
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

describe("InvoicePreviewDialog", () => {
  it("keeps the example out of the way until it is asked for", () => {
    renderWithProviders(<InvoicePreviewDialog settings={settings} />);

    expect(screen.getByRole("button", { name: /Ver ejemplo/ })).toBeInTheDocument();
    expect(screen.queryByText("Reposteria Dona Ana")).not.toBeInTheDocument();
  });

  it("draws the invoice with the values currently on screen", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePreviewDialog settings={settings} />);

    await user.click(screen.getByRole("button", { name: /Ver ejemplo/ }));

    expect(await screen.findByText("Reposteria Dona Ana")).toBeInTheDocument();
    expect(screen.getByText("RNC: 131234567")).toBeInTheDocument();
    expect(screen.getByText("Gracias por su compra")).toBeInTheDocument();
  });

  it("reflects a toggle that is off without needing a save", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePreviewDialog settings={{ ...settings, showRnc: false }} />);

    await user.click(screen.getByRole("button", { name: /Ver ejemplo/ }));

    expect(await screen.findByText("Reposteria Dona Ana")).toBeInTheDocument();
    expect(screen.queryByText("RNC: 131234567")).not.toBeInTheDocument();
  });

  it("names the paper size in the title, so a thermal strip is not mistaken for a letter", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoicePreviewDialog settings={{ ...settings, printSize: "THERMAL_80MM" }} />);

    await user.click(screen.getByRole("button", { name: /Ver ejemplo/ }));

    expect(await screen.findByText(/Tirilla 80mm/)).toBeInTheDocument();
  });

  it("does not submit the settings form it sits in", () => {
    renderWithProviders(<InvoicePreviewDialog settings={settings} />);

    expect(screen.getByRole("button", { name: /Ver ejemplo/ })).toHaveAttribute("type", "button");
  });
});
