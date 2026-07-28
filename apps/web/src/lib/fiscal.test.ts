import { describe, expect, it } from "vitest";
import { fiscalError, normalizeFiscalProfile, sequencePayload, type SequenceForm } from "./fiscal";

function form(overrides: Partial<SequenceForm> = {}): SequenceForm {
  return {
    receiptType: "B01",
    prefix: "B01",
    startNumber: "1",
    nextNumber: "1",
    endNumber: "100",
    expiresAt: "2027-12-31",
    active: true,
    ...overrides,
  };
}

describe("normalizeFiscalProfile", () => {
  it("fills every field so the form stays controlled", () => {
    expect(normalizeFiscalProfile()).toEqual({
      businessName: "",
      tradeName: "",
      rnc: "",
      fiscalAddress: "",
      phone: "",
      email: "",
      taxRegime: "",
    });
  });

  it("turns the nulls of an unsaved profile into empty strings", () => {
    // React warns and switches the input to uncontrolled if a value flips between null and text.
    const normalized = normalizeFiscalProfile({ businessName: "Dona Ana", rnc: null as never });

    expect(normalized.businessName).toBe("Dona Ana");
    expect(normalized.rnc).toBe("");
  });

  it("keeps the values that are already set", () => {
    const normalized = normalizeFiscalProfile({ rnc: "131234567", taxRegime: "Ordinario" });

    expect(normalized.rnc).toBe("131234567");
    expect(normalized.taxRegime).toBe("Ordinario");
  });
});

describe("sequencePayload", () => {
  it("converts the form strings into the numbers the API expects", () => {
    const payload = sequencePayload(form({ startNumber: "1", nextNumber: "5", endNumber: "500" }));

    expect(payload.startNumber).toBe(1);
    expect(payload.nextNumber).toBe(5);
    expect(payload.endNumber).toBe(500);
    // Strings here would be rejected, or worse, compared lexicographically.
    expect(typeof payload.endNumber).toBe("number");
  });

  it("falls back to the receipt type when no prefix is given", () => {
    expect(sequencePayload(form({ prefix: "" })).prefix).toBe("B01");
    expect(sequencePayload(form({ prefix: "   " })).prefix).toBe("B01");
    expect(sequencePayload(form({ prefix: "  ", receiptType: "B14" })).prefix).toBe("B14");
  });

  it("trims a prefix typed with stray spaces", () => {
    expect(sequencePayload(form({ prefix: " B02 " })).prefix).toBe("B02");
  });

  it("keeps an explicit prefix that differs from the receipt type", () => {
    expect(sequencePayload(form({ receiptType: "B02", prefix: "B01" })).prefix).toBe("B01");
  });

  it("passes the expiry date through untouched, since the API parses the date itself", () => {
    expect(sequencePayload(form({ expiresAt: "2027-06-30" })).expiresAt).toBe("2027-06-30");
  });

  it("carries the active flag, which decides whether sales can draw from the range", () => {
    expect(sequencePayload(form({ active: false })).active).toBe(false);
  });
});

describe("fiscalError", () => {
  it("prefers the message the API sent", () => {
    const err = { response: { data: { error: "La secuencia NCF B01 esta agotada" } } };

    expect(fiscalError(err, "fallback")).toBe("La secuencia NCF B01 esta agotada");
  });

  it("falls back when the failure carries no message", () => {
    expect(fiscalError(new Error("network"), "No se pudo guardar")).toBe("No se pudo guardar");
    expect(fiscalError(undefined, "No se pudo guardar")).toBe("No se pudo guardar");
    expect(fiscalError({ response: {} }, "No se pudo guardar")).toBe("No se pudo guardar");
  });
});
