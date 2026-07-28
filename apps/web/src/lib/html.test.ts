import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("neutralises a script tag rather than letting it through", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("escapes the ampersand first, so an entity is not double-decoded", () => {
    // Escaping "<" before "&" would turn "<" into "&lt;" and then into "&amp;lt;".
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
    expect(escapeHtml("Café & Pan")).toBe("Café &amp; Pan");
  });

  it("closes an attribute injection attempt", () => {
    expect(escapeHtml('" onload="alert(1)')).toBe("&quot; onload=&quot;alert(1)");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Bizcocho de chocolate")).toBe("Bizcocho de chocolate");
    expect(escapeHtml("")).toBe("");
  });

  it("escapes every occurrence, not just the first", () => {
    expect(escapeHtml("<<>>")).toBe("&lt;&lt;&gt;&gt;");
  });

  it("does not escape the single quote, which is why single-quoted attributes are unsafe", () => {
    // Documented limitation rather than an oversight: every current interpolation is text
    // content or a double-quoted attribute. A single-quoted one would need more than this.
    expect(escapeHtml("it's")).toBe("it's");
  });
});
