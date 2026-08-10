import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, waitFor } from "@/test/render";
import { useAutoPrint } from "./use-auto-print";

const print = vi.fn();

function Probe({ ready, withImage = false }: Readonly<{ ready: boolean; withImage?: boolean }>) {
  useAutoPrint(ready);
  // eslint-disable-next-line @next/next/no-img-element
  return withImage ? <img src="/logo.png" alt="Logo" /> : null;
}

beforeEach(() => {
  print.mockReset();
  vi.stubGlobal("print", print);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useAutoPrint", () => {
  it("waits for the invoice before printing", () => {
    renderWithProviders(<Probe ready={false} />);

    expect(print).not.toHaveBeenCalled();
  });

  it("prints once the invoice is ready", async () => {
    renderWithProviders(<Probe ready />);

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it("prints only once, even if the component re-renders", async () => {
    const { rerender } = renderWithProviders(<Probe ready />);

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    rerender(<Probe ready />);
    rerender(<Probe ready />);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("holds the print until the logo finished loading", async () => {
    renderWithProviders(<Probe ready withImage />);

    // jsdom never fires load for the image on its own, so nothing should have printed yet.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(print).not.toHaveBeenCalled();

    document.images[0].dispatchEvent(new Event("load"));

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it("prints anyway when an image never settles, so the cashier is not left without a receipt", async () => {
    vi.useFakeTimers();
    renderWithProviders(<Probe ready withImage />);

    await vi.advanceTimersByTimeAsync(3000);

    expect(print).toHaveBeenCalledTimes(1);
  });
});
