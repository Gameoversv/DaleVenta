import { describe, expect, it } from "vitest";
import { money, moneyOrZero, NO_AMOUNT } from "./money";

const fmt = money;
const fmtZero = moneyOrZero;

describe("money", () => {
  it("always shows two decimals", () => {
    expect(fmt(250)).toBe("RD$250.00");
    expect(fmt("250.5")).toBe("RD$250.50");
    expect(fmt(0)).toBe("RD$0.00");
  });

  it("groups thousands, which the per-page formatters did not", () => {
    expect(fmt(12450)).toBe("RD$12,450.00");
    expect(fmt("1234567.89")).toBe("RD$1,234,567.89");
  });

  it("accepts the strings the API sends as well as numbers", () => {
    expect(fmt("1500.00")).toBe(fmt(1500));
  });

  it("rounds to cents rather than printing a long fraction", () => {
    expect(fmt(0.125)).toBe("RD$0.13");
    expect(fmt(1 / 3)).toBe("RD$0.33");
  });

  it("shows a placeholder when there is no amount at all", () => {
    expect(money(null)).toBe(NO_AMOUNT);
    expect(money(undefined)).toBe(NO_AMOUNT);
    expect(money("")).toBe(NO_AMOUNT);
  });

  it("never renders NaN, which some of the replaced formatters could", () => {
    expect(money("not a number")).toBe(NO_AMOUNT);
    expect(money(Number.NaN)).toBe(NO_AMOUNT);
    expect(money(Number.POSITIVE_INFINITY)).toBe(NO_AMOUNT);
  });

  it("keeps negative amounts signed, so a cash shortfall stays visible", () => {
    expect(fmt(-45.5)).toContain("45.50");
    expect(fmt(-45.5)).not.toBe(fmt(45.5));
  });
});

describe("moneyOrZero", () => {
  it("treats a missing amount as zero for running totals", () => {
    expect(fmtZero(null)).toBe("RD$0.00");
    expect(fmtZero(undefined)).toBe("RD$0.00");
    expect(fmtZero("")).toBe("RD$0.00");
    expect(fmtZero("garbage")).toBe("RD$0.00");
  });

  it("formats a real amount exactly like money", () => {
    expect(moneyOrZero(12450)).toBe(money(12450));
  });
});
