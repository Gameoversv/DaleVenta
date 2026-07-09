export const PRODUCT_UNITS = [
  { value: "unit", label: "Unidad", shortLabel: "unid." },
  { value: "lb", label: "Libra", shortLabel: "lb" },
  { value: "kg", label: "Kilogramo", shortLabel: "kg" },
  { value: "g", label: "Gramo", shortLabel: "g" },
  { value: "l", label: "Litro", shortLabel: "L" },
  { value: "gal", label: "Galon", shortLabel: "gal" },
  { value: "m", label: "Metro", shortLabel: "m" },
  { value: "pack", label: "Paquete", shortLabel: "paq." },
  { value: "box", label: "Caja", shortLabel: "caja" },
  { value: "dozen", label: "Docena", shortLabel: "doc." },
] as const;

export function productUnitLabel(value: string | null | undefined): string {
  if (!value) return "unid.";
  return PRODUCT_UNITS.find((unit) => unit.value === value)?.shortLabel ?? value;
}
