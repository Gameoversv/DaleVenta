import { describe, expect, it } from "vitest";
import { dateOnly, dateTime, NO_DATE } from "./dates";

// Fixed instant, expressed in UTC so the assertions do not depend on the machine's zone beyond
// what the formatter itself applies.
const INSTANT = "2026-07-27T18:15:00.000Z";

describe("dateTime", () => {
  it("formats day before month, as es-DO expects", () => {
    const formatted = dateTime(INSTANT);

    // 27 cannot be a month, so its position proves the order regardless of the runner's zone.
    expect(formatted).toMatch(/^27\/7\/2026/);
  });

  it("includes the time", () => {
    expect(dateTime(INSTANT)).toMatch(/\d{1,2}:\d{2}/);
  });

  it("accepts Date objects and epoch numbers as well as ISO strings", () => {
    expect(dateTime(new Date(INSTANT))).toBe(dateTime(INSTANT));
    expect(dateTime(new Date(INSTANT).getTime())).toBe(dateTime(INSTANT));
  });

  it("shows a placeholder instead of an absent timestamp", () => {
    expect(dateTime(null)).toBe(NO_DATE);
    expect(dateTime(undefined)).toBe(NO_DATE);
    expect(dateTime("")).toBe(NO_DATE);
  });

  it("never renders the literal \"Invalid Date\", which the replaced helpers could", () => {
    expect(dateTime("not a date")).toBe(NO_DATE);
    expect(dateTime("2026-13-45")).toBe(NO_DATE);
  });
});

describe("dateOnly", () => {
  it("drops the time", () => {
    const formatted = dateOnly(INSTANT);

    expect(formatted).toMatch(/^27\/7\/2026$/);
    expect(formatted).not.toMatch(/:/);
  });

  it("shares the placeholder and the invalid-input guard", () => {
    expect(dateOnly(null)).toBe(NO_DATE);
    expect(dateOnly("nonsense")).toBe(NO_DATE);
  });
});
