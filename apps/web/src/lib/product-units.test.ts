import { describe, expect, it } from "vitest";
import { PRODUCT_UNITS, productUnitLabel } from "./product-units";

describe("productUnitLabel", () => {
  it("maps a known unit to its short label", () => {
    expect(productUnitLabel("lb")).toBe("lb");
    expect(productUnitLabel("dozen")).toBe("doc.");
    expect(productUnitLabel("unit")).toBe("unid.");
  });

  it("falls back to the raw value for a unit the catalog does not know", () => {
    // Products created before a unit was added to the catalog must still render something.
    expect(productUnitLabel("quintal")).toBe("quintal");
  });

  it("defaults to units when the value is missing", () => {
    expect(productUnitLabel(null)).toBe("unid.");
    expect(productUnitLabel(undefined)).toBe("unid.");
    expect(productUnitLabel("")).toBe("unid.");
  });

  it("keeps every catalog entry unique, so a value cannot resolve to two labels", () => {
    const values = PRODUCT_UNITS.map((unit) => unit.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
