import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values so conditional classes stay readable at call sites", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("lets the last Tailwind utility of a conflicting pair win", () => {
    // Without the merge step both classes survive and the winner depends on stylesheet order.
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("keeps utilities that only look similar", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });
});
