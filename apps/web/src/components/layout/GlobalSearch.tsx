"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Package, Search, UserRound } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { GlobalSearchResponse, GlobalSearchResult } from "@/types/search";

async function fetchGlobalSearch(query: string): Promise<GlobalSearchResponse> {
  const res = await api.get<{ data: GlobalSearchResponse }>("/api/search", { params: { q: query } });
  return res.data.data;
}

/**
 * Renders the glyph rather than returning the component type. Picking a component during render
 * gives it a fresh identity on every pass, which remounts it and throws away any state it holds.
 */
function ResultIcon({ type }: { type: string }) {
  const className = "h-4 w-4";
  if (type === "Factura") return <FileText className={className} />;
  if (type === "Cliente") return <UserRound className={className} />;
  if (type === "Producto") return <Package className={className} />;
  return <Search className={className} />;
}

function ResultRow({ result, onSelect }: { result: GlobalSearchResult; onSelect: () => void }) {
  return (
    <Link
      href={result.href}
      onClick={onSelect}
      className="flex items-start gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <ResultIcon type={result.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{result.title}</span>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
            {result.type}
          </span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
      </span>
    </Link>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trimmedQuery = query.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", trimmedQuery],
    queryFn: () => fetchGlobalSearch(trimmedQuery),
    enabled: trimmedQuery.length >= 2,
  });

  const groupedResults = useMemo(() => data?.results ?? [], [data]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder="Buscar facturas, clientes, productos..."
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {open && trimmedQuery.length >= 2 && (
        <div
          className={cn(
            "absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          )}
        >
          <div className="max-h-[420px] overflow-y-auto p-2">
            {isFetching && <p className="px-3 py-3 text-sm text-muted-foreground">Buscando...</p>}
            {!isFetching && groupedResults.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">No se encontraron resultados.</p>
            )}
            {!isFetching &&
              groupedResults.map((result, index) => (
                <ResultRow key={`${result.type}-${result.title}-${index}`} result={result} onSelect={() => setOpen(false)} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
