import { describe, expect, it } from "vitest";
import { DEMO_WHATSAPP_MESSAGE, WHATSAPP_NUMBER, whatsappLink } from "./landing";

describe("whatsappLink", () => {
  it("builds a wa.me link for the configured number", () => {
    expect(whatsappLink("hola")).toBe(`https://wa.me/${WHATSAPP_NUMBER}?text=hola`);
  });

  it("encodes spaces and accents so the message survives the URL", () => {
    const link = whatsappLink("Hola, quiero una demo para mi negocio");

    expect(link).not.toContain(" ");
    expect(decodeURIComponent(link.split("text=")[1])).toBe("Hola, quiero una demo para mi negocio");
  });

  it("encodes the characters that would otherwise break the query string", () => {
    const link = whatsappLink("precio & plan #1 ?ya");

    expect(link).toContain("%26");
    expect(link).toContain("%23");
    expect(link).toContain("%3F");
  });

  it("round-trips the default demo message", () => {
    const link = whatsappLink(DEMO_WHATSAPP_MESSAGE);

    expect(decodeURIComponent(link.split("text=")[1])).toBe(DEMO_WHATSAPP_MESSAGE);
  });
});
