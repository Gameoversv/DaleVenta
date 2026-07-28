/**
 * Escapes text before it is interpolated into the HTML the app builds for printing.
 *
 * The quotation print view assembles a whole document from strings, so every value that
 * originates outside the code — product descriptions, customer names, free-text notes — has to be
 * neutralised first. Anyone who can name a product could otherwise inject markup into the printed
 * document of a different user.
 *
 * Note the deliberate limit: this covers text content and double-quoted attributes, not
 * single-quoted ones. Interpolating into a single-quoted attribute needs a different escape.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
