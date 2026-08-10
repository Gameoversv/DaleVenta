"use client";

import { useEffect, useRef } from "react";

/**
 * Un logo que nunca carga no puede dejar al cajero sin tirilla: pasado este
 * tiempo se imprime igual, con o sin imagen.
 */
const IMAGE_WAIT_MS = 3000;

/**
 * Dispara el dialogo de impresion en cuanto el documento esta listo.
 *
 * Se usa en la ruta de impresion, que se carga dentro de un iframe oculto al
 * cerrar una venta. El navegador no deja imprimir sin dialogo por seguridad;
 * con Chrome en modo --kiosk-printing ese dialogo desaparece y la tirilla sale
 * sola. Sin kiosk el cajero solo confirma, sin navegar ni buscar la venta.
 *
 * Imprime una sola vez por montaje: si el usuario quiere otra copia se remonta
 * el iframe, no se vuelve a llamar aqui.
 */
export function useAutoPrint(ready: boolean) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (!ready || printedRef.current) return;
    printedRef.current = true;

    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      window.print();
    };

    // Imprimir con el logo a medias saca una factura sin logo.
    const loading = Array.from(document.images).filter((image) => !image.complete);
    if (loading.length === 0) {
      const frame = requestAnimationFrame(fire);
      return () => cancelAnimationFrame(frame);
    }

    let pending = loading.length;
    const onSettled = () => {
      pending -= 1;
      if (pending === 0) fire();
    };
    loading.forEach((image) => {
      image.addEventListener("load", onSettled);
      image.addEventListener("error", onSettled);
    });
    const timer = setTimeout(fire, IMAGE_WAIT_MS);

    return () => {
      clearTimeout(timer);
      loading.forEach((image) => {
        image.removeEventListener("load", onSettled);
        image.removeEventListener("error", onSettled);
      });
    };
  }, [ready]);
}
