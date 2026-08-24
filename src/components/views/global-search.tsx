"use client";

import * as React from "react";
import {
  Pill,
  Users,
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useNav, type ViewKey } from "@/lib/nav-store";

type ProductHit = {
  id: string;
  name: string;
  activeIngredient?: string | null;
  dosage?: string | null;
  salePrice: number;
  totalStock: number;
  category?: { name: string; color: string } | null;
};

type CustomerHit = {
  id: string;
  fullName: string;
  document?: string | null;
  phone?: string | null;
  loyaltyPoints: number;
};

type Hit =
  | { type: "product"; data: ProductHit }
  | { type: "customer"; data: CustomerHit };

const VIEW_BY_NUMBER: ViewKey[] = [
  "dashboard",
  "pos",
  "inventory",
  "sales",
  "customers",
  "cash",
  "suppliers",
  "users",
  "audit",
  "reports",
  "settings",
];

/**
 * Diálogo global de búsqueda (Ctrl+K).
 *
 * Busca productos y clientes en paralelo y permite navegar por teclado
 * (↑/↓ para mover, Enter para seleccionar, Esc para cerrar).
 * Al seleccionar un resultado, navega a la vista correspondiente.
 */
export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { navigate } = useNav();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // Reset al abrir
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActiveIndex(0);
      // enfocar input tras animación
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Búsqueda con debounce
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const [prodRes, custRes] = await Promise.allSettled([
          fetch(`/api/products?q=${encodeURIComponent(q)}&limit=5`, {
            signal: ctrl.signal,
          }).then((r) => r.json()),
          fetch(`/api/customers?q=${encodeURIComponent(q)}`, {
            signal: ctrl.signal,
          }).then((r) => r.json()),
        ]);

        const newHits: Hit[] = [];
        if (prodRes.status === "fulfilled" && prodRes.value?.products) {
          for (const p of prodRes.value.products as ProductHit[]) {
            newHits.push({ type: "product", data: p });
          }
        }
        if (custRes.status === "fulfilled" && custRes.value?.customers) {
          // limitamos a 5 clientes
          for (const c of (custRes.value.customers as CustomerHit[]).slice(0, 5)) {
            newHits.push({ type: "customer", data: c });
          }
        }
        setHits(newHits);
        setActiveIndex(0);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, open]);

  // Navegación por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[activeIndex];
      if (hit) selectHit(hit);
    }
  };

  const selectHit = (hit: Hit) => {
    if (hit.type === "product") {
      navigate("inventory", { productId: hit.data.id });
    } else {
      navigate("customers", { customerId: hit.data.id });
    }
    onOpenChange(false);
  };

  // Auto-scroll del item activo
  React.useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${activeIndex}"]`
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Búsqueda global</DialogTitle>
          <DialogDescription>
            Busca productos o clientes y navega a la sección correspondiente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar productos o clientes…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Buscar productos o clientes"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2 scrollbar-thin"
          role="listbox"
        >
          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Buscando…
            </div>
          )}

          {!loading && query.trim() === "" && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-2 h-6 w-6 opacity-40" />
              Escribe para buscar productos o clientes.
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px]">
                {VIEW_BY_NUMBER.slice(0, 6).map((v, i) => (
                  <kbd
                    key={v}
                    className="rounded border bg-muted px-1.5 py-0.5 font-medium"
                  >
                    {i + 1} · {v}
                  </kbd>
                ))}
              </div>
            </div>
          )}

          {!loading && query.trim() !== "" && hits.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Sin resultados para “{query}”.
            </div>
          )}

          {!loading && hits.length > 0 && (
            <ul className="space-y-1" role="presentation">
              {hits.map((hit, idx) => (
                <li key={`${hit.type}-${hit.data.id}`}>
                  <button
                    type="button"
                    data-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectHit(hit)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      idx === activeIndex
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                    role="option"
                    aria-selected={idx === activeIndex}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                        hit.type === "product"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      )}
                    >
                      {hit.type === "product" ? (
                        <Pill className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </span>

                    <div className="flex-1 min-w-0">
                      {hit.type === "product" ? (
                        <>
                          <p className="truncate font-medium">
                            {hit.data.name}
                            {hit.data.dosage && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                {hit.data.dosage}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {hit.data.activeIngredient ?? "Sin principio activo"}
                            {" · Stock: "}
                            {hit.data.totalStock}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="truncate font-medium">
                            {hit.data.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {hit.data.document ?? "Sin documento"}
                            {hit.data.phone ? ` · ${hit.data.phone}` : ""}
                            {" · "}
                            {hit.data.loyaltyPoints} pts
                          </p>
                        </>
                      )}
                    </div>

                    <div className="hidden text-right sm:block">
                      {hit.type === "product" ? (
                        <p className="text-xs font-semibold">
                          ${hit.data.salePrice.toLocaleString("es-CO")}
                        </p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {hit.type === "product" ? "Producto" : "Cliente"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!loading && hits.length > 0 && (
          <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                navegar
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                seleccionar
              </span>
            </div>
            <span>{hits.length} resultados</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
