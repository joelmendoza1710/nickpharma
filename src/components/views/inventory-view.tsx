"use client";

import * as React from "react";
import {
  Search,
  Package,
  AlertTriangle,
  CalendarClock,
  Boxes,
  TrendingUp,
  Filter,
  RefreshCw,
  Pill,
  Plus,
  Layers,
  ScanLine,
  X,
  Scale,
  Barcode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KpiCard } from "./kpi-card";
import { ProductDetailDialog } from "./product-detail-dialog";
import {
  ProductFormDialog,
  type ProductFormData,
  type CategoryOption,
} from "./product-form-dialog";
import { StockMovementsDialog } from "./stock-movements-dialog";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  daysUntilExpiry,
  getExpiryStatus,
  getDosageColorClass,
} from "@/lib/format";
import { toast } from "sonner";

type InventoryItem = {
  id: string;
  name: string;
  activeIngredient: string | null;
  dosage: string | null;
  presentation: string | null;
  barcode: string;
  laboratory: string | null;
  categoryName: string;
  categoryColor: string;
  salePrice: number;
  costPrice: number;
  minStock: number;
  requiresPrescription: boolean;
  totalStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  stockValue: number;
  retailValue: number;
  nextExpiry: string | null;
  daysToExpiry: number | null;
  expiryStatus: "ok" | "warning" | "critical" | "expired" | "none";
  lotCount: number;
};

type Summary = {
  totalProducts: number;
  totalStock: number;
  stockValue: number;
  retailValue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCritical: number;
  expiringWarning: number;
  expiredCount: number;
};

const STATUS_LABELS: Record<string, string> = {
  ok: "En buen estado",
  warning: "Vence < 90 días",
  critical: "Vence < 30 días",
  expired: "Vencido",
  none: "Sin lotes",
};

export function InventoryView() {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<string>("all");
  const [addLotFor, setAddLotFor] = React.useState<InventoryItem | null>(null);

  // New state for product detail / form / movements / scan
  const [detailProductId, setDetailProductId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductFormData | null>(null);
  const [movementsOpen, setMovementsOpen] = React.useState(false);
  const [scanOpen, setScanOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/inventory`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setSummary(d.summary ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadCategories = React.useCallback(() => {
    fetch(`/api/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);

  const filtered = React.useMemo(() => {
    let list = items;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.activeIngredient?.toLowerCase().includes(q) ||
          i.barcode.includes(q) ||
          i.laboratory?.toLowerCase().includes(q)
      );
    }
    if (filter === "low") list = list.filter((i) => i.isLowStock && !i.isOutOfStock);
    else if (filter === "out") list = list.filter((i) => i.isOutOfStock);
    else if (filter === "expiring")
      list = list.filter((i) => i.expiryStatus === "critical" || i.expiryStatus === "warning");
    else if (filter === "expired") list = list.filter((i) => i.expiryStatus === "expired");
    return list;
  }, [items, query, filter]);

  // Keyboard shortcut "S" to open scan overlay; ESC handled by overlay itself
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && scanOpen) {
        setScanOpen(false);
        return;
      }
      if (e.key.toLowerCase() === "s" && !scanOpen) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        // Avoid hijack when user is typing in an input/textarea/select or inside a dialog
        if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
        // Don't open if any dialog is open
        if (detailProductId || formOpen || movementsOpen || addLotFor) return;
        e.preventDefault();
        setScanOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scanOpen, detailProductId, formOpen, movementsOpen, addLotFor]);

  // Edit from detail: fetch full product, then open form
  const handleEditFromDetail = React.useCallback(async () => {
    if (!detailProductId) return;
    const pid = detailProductId;
    setDetailProductId(null);
    try {
      const res = await fetch(`/api/products/${pid}`);
      if (!res.ok) throw new Error("No se pudo cargar el producto");
      const json = await res.json();
      setEditingProduct(json.product as ProductFormData);
      setFormOpen(true);
    } catch (e: any) {
      toast.error("No se pudo abrir el editor", { description: e.message });
    }
  }, [detailProductId]);

  // Add lot from detail: close detail, open the existing AddLotDialog
  const handleAddLotFromDetail = React.useCallback(() => {
    if (!detailProductId) return;
    const item = items.find((i) => i.id === detailProductId) ?? null;
    setDetailProductId(null);
    if (item) setAddLotFor(item);
  }, [detailProductId, items]);

  // Open detail by exact barcode match (used by scan overlay)
  const openByBarcode = React.useCallback(
    (code: string) => {
      const hit = items.find((i) => i.barcode === code);
      if (hit) {
        setScanOpen(false);
        setDetailProductId(hit.id);
        return true;
      }
      return false;
    },
    [items]
  );

  if (loading || !summary) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs de inventario */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Valor de inventario"
          value={formatCurrency(summary.stockValue)}
          icon={Boxes}
          hint={`Costo · ${formatNumber(summary.totalStock)} und`}
          accent="primary"
        />
        <KpiCard
          label="Valor de venta"
          value={formatCurrency(summary.retailValue)}
          icon={TrendingUp}
          hint={`Ganancia potencial ${formatCurrency(summary.potentialProfit)}`}
          accent="cyan"
        />
        <KpiCard
          label="Stock bajo"
          value={String(summary.lowStockCount)}
          icon={AlertTriangle}
          hint="Requieren reposición"
          accent="amber"
        />
        <KpiCard
          label="Por vencer / vencidos"
          value={String(summary.expiringCritical + summary.expiringWarning + summary.expiredCount)}
          icon={CalendarClock}
          hint={`${summary.expiredCount} vencidos`}
          accent="rose"
        />
      </div>

      {/* Tabla de inventario */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Productos en inventario
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.length} de {summary.totalProducts} productos
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar producto…"
                  className="pl-8 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScanOpen(true)}
                className="h-9"
                title="Escanear código (S)"
              >
                <ScanLine className="h-4 w-4 mr-1.5" /> Escanear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMovementsOpen(true)}
                className="h-9"
                title="Movimientos de inventario"
              >
                <Scale className="h-4 w-4 mr-1.5" /> Movimientos
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setEditingProduct(null);
                  setFormOpen(true);
                }}
                className="h-9"
                title="Nuevo producto"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nuevo
              </Button>
              <Button variant="outline" size="icon" onClick={load} aria-label="Actualizar" className="h-9 w-9">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs value={filter} onValueChange={setFilter} className="mt-2">
            <TabsList className="h-9 overflow-x-auto">
              <TabsTrigger value="all" className="text-xs">
                Todos ({summary.totalProducts})
              </TabsTrigger>
              <TabsTrigger value="low" className="text-xs">
                Stock bajo ({summary.lowStockCount})
              </TabsTrigger>
              <TabsTrigger value="out" className="text-xs text-rose-600 dark:text-rose-400">
                Agotados ({summary.outOfStockCount})
              </TabsTrigger>
              <TabsTrigger value="expiring" className="text-xs text-amber-600 dark:text-amber-400">
                Por vencer ({summary.expiringCritical + summary.expiringWarning})
              </TabsTrigger>
              <TabsTrigger value="expired" className="text-xs text-rose-600 dark:text-rose-400">
                Vencidos ({summary.expiredCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[220px]">Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No hay productos que coincidan con el filtro
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => setDetailProductId(item.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20 cursor-pointer"
                            aria-label={`Ver detalle de ${item.name}`}
                          >
                            <Pill className="h-4 w-4" />
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setDetailProductId(item.id)}
                                className="font-medium text-sm text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                                title="Ver detalle"
                              >
                                {item.name}
                              </button>
                              {item.dosage && (
                                <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold", getDosageColorClass(item.dosage))}>
                                  {item.dosage}
                                </span>
                              )}
                              {item.requiresPrescription && (
                                <span className="inline-flex rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  Rx
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.activeIngredient} · {item.laboratory}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {item.categoryName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.salePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StockBadge item={item} />
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge item={item} />
                      </TableCell>
                      <TableCell>
                        <ExpiryBadge item={item} />
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(item.stockValue)}</p>
                        <p className="text-[11px] text-muted-foreground">venta {formatCurrency(item.retailValue)}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 opacity-0 group-hover:opacity-100"
                          onClick={() => setAddLotFor(item)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Lote
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para agregar lote (recepción de mercancía) */}
      <AddLotDialog
        product={addLotFor}
        onClose={() => setAddLotFor(null)}
        onCreated={() => {
          setAddLotFor(null);
          load();
        }}
      />

      {/* Diálogo de detalle de producto (4 tabs) */}
      <ProductDetailDialog
        productId={detailProductId}
        onClose={() => setDetailProductId(null)}
        onEdit={handleEditFromDetail}
        onAddLot={handleAddLotFromDetail}
        onAdjusted={load}
      />

      {/* Diálogo de crear/editar producto */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        categories={categories}
        onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
        onSaved={() => {
          setFormOpen(false);
          setEditingProduct(null);
          load();
          loadCategories();
        }}
      />

      {/* Diálogo de movimientos de inventario */}
      <StockMovementsDialog open={movementsOpen} onOpenChange={setMovementsOpen} />

      {/* Overlay de escaneo de código de barras */}
      <ScanOverlay
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onSubmit={(code) => {
          const ok = openByBarcode(code);
          if (!ok) {
            toast.error("Código no encontrado", {
              description: `No hay producto con barcode "${code}"`,
            });
          }
        }}
      />
    </div>
  );
}

function StockBadge({ item }: { item: InventoryItem }) {
  if (item.isOutOfStock) {
    return <span className="font-bold text-rose-600 dark:text-rose-400">0</span>;
  }
  return (
    <div className="flex flex-col items-end">
      <span className={cn("font-bold", item.isLowStock ? "text-amber-600 dark:text-amber-400" : "")}>
        {item.totalStock}
      </span>
      <span className="text-[10px] text-muted-foreground">mín. {item.minStock}</span>
    </div>
  );
}

function StockStatusBadge({ item }: { item: InventoryItem }) {
  if (item.isOutOfStock) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Boxes className="h-3 w-3" /> Agotado
      </Badge>
    );
  }
  if (item.isLowStock) {
    return (
      <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20">
        <AlertTriangle className="h-3 w-3" /> Stock bajo
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
      <Check2 className="h-3 w-3" /> Disponible
    </Badge>
  );
}

function Check2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ExpiryBadge({ item }: { item: InventoryItem }) {
  if (!item.nextExpiry || item.daysToExpiry === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const status = getExpiryStatus(item.nextExpiry);
  const map: Record<string, { cls: string; label: string }> = {
    expired: { cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300", label: "Vencido" },
    critical: { cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300", label: `${item.daysToExpiry}d` },
    warning: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", label: `${item.daysToExpiry}d` },
    ok: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", label: `${item.daysToExpiry}d` },
  };
  const cfg = map[status];
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", cfg.cls)}>
        <CalendarClock className="h-2.5 w-2.5" />
        {cfg.label}
      </span>
      <span className="text-[10px] text-muted-foreground">{formatDate(item.nextExpiry)}</span>
    </div>
  );
}

function AddLotDialog({
  product,
  onClose,
  onCreated,
}: {
  product: InventoryItem | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [lotNumber, setLotNumber] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (product) {
      setLotNumber("");
      setExpiryDate("");
      setQuantity("");
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    if (!lotNumber || !expiryDate || !quantity) {
      toast.error("Completa todos los campos");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          lotNumber,
          expiryDate,
          quantity,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error");
      }
      toast.success("Lote agregado", {
        description: `${quantity} unidades de ${product.name}`,
      });
      onCreated();
    } catch (e: any) {
      toast.error("No se pudo agregar el lote", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Recepción de mercancía
          </DialogTitle>
          <DialogDescription>
            Agregar nuevo lote a {product?.name} {product?.dosage}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="lot">Número de lote</Label>
            <Input
              id="lot"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="Ej. L-2024-0456"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="expiry">Fecha de vencimiento</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="qty">Cantidad recibida</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Agregar lote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Scan overlay ----------

function ScanOverlay({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setCode("");
      // Focus after the overlay mounts
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const c = code.trim();
    if (!c) return;
    onSubmit(c);
    setCode("");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Escanear código de barras"
    >
      <div className="w-full max-w-xl space-y-6 text-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <ScanLine className="h-6 w-6" />
            <span className="text-lg font-semibold">Escanear producto</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar (ESC)"
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="flex flex-col items-center gap-2 text-primary/70">
            <Barcode className="h-16 w-16" />
            <p className="text-sm">Apunta el escáner o escribe el código</p>
          </div>
        </div>

        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Código de barras…"
            className="h-14 text-center text-2xl font-mono tracking-wider"
            inputMode="numeric"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Presiona <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Enter</kbd> para
            buscar · <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">ESC</kbd> para cerrar
          </p>
        </div>

        <Button onClick={submit} size="lg" className="w-full" disabled={!code.trim()}>
          <Search className="h-4 w-4 mr-2" /> Buscar producto
        </Button>
      </div>
    </div>
  );
}
