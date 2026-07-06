export const WHATSAPP_NUMBER = "18095550199";

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const DEMO_WHATSAPP_MESSAGE = "Hola, quiero solicitar una demo de DaleVenta para mi negocio.";
