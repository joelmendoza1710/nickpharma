"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Pill,
  Package,
  Layers,
  TrendingUp,
  Box,
  CalendarClock,
  Receipt,
  DollarSign,
  ShoppingCart,
  Barcode,
  Building2,
  Tag,
  Percent,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Loader2,
  Scale,
  Plus,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KpiCard } from "./kpi-card";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  daysUntilExpiry,
  getExpiryStatus,
  getDosageColorClass,
} from "@/lib/format";
import { toast } from "sonner";

// ---------- Types (defensive — work with both rich and basic API responses) ----------

type Lot = {
  id: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  initialQty?: number;
  productId?: string;
};

type StockMovement = {
  id: string;
  type: "in" | "out" | "adjustment" | "return" | string;
  quantity: number;
  balance: number;
  reference?: string | null;
  lotId?: string | null;
  userName?: string;
  createdAt: string;
};

type RecentSale = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  customerName?: string | null;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  total?: number;
  paymentMethod?: string;
};

type ByMonth = {
  month?: string;
  label?: string;
  total?: number;
  revenue?: number;
  qty?: number;
  count?: number;
};

type ProductDetail = {
  id: string;
  name: string;
  activeIngredient?: string | null;
  presentation?: string | null;
  dosage?: string | null;
  barcode: string;
  laboratory?: string | null;
  salePrice: number;
  costPrice: number;
  minStock: number;
  requiresPrescription: boolean;
  taxRate: number;
  categoryId: string;
  category?: { id: string; name: string; color: string } | null;
  cum?: string | null;
  invimaRegistration?: string | null;
  invimaExpiryDate?: string | null;
  therapeuticAction?: string | null;
  lots?: Lot[];
  stockMovements?: StockMovement[];
  recentSales?: RecentSale[];
  byMonth?: ByMonth[];
  totalStock?: number;
  activeLotCount?: number;
  stockValue?: number;
  retailValue?: number;
  stats?: {
    totalSold?: number;
    totalRevenue?: number;
    salesCount?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

// ---------- Movement visual config ----------

const MOVEMENT_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; sign: "+" | "-" | "" }
> = {
  in: { icon: ArrowUpCircle, color: "text-emerald-600 dark:text-emerald-400", sign: "+" },
  out: { icon: ArrowDownCircle, color: "text-rose-600 dark:text-rose-400", sign: "-" },
  adjustment: { icon: Scale, color: "text-amber-600 dark:text-amber-400", sign: "" },
  return: { icon: ArrowUpCircle, color: "text-sky-600 dark:text-sky-400", sign: "+" },
};

const MOVEMENT_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
  return: "Devolución",
};

// ---------- Main dialog ----------

export function ProductDetailDialog({
  productId,
  onClose,
  onEdit,
  onAddLot,
  onAdjusted,
}: {
  productId: string | null;
  onClose: () => void;
  onEdit?: () => void;
  onAddLot?: () => void;
  onAdjusted?: () => void;
}) {
  const [data, setData] = React.useState<ProductDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState("general");
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("No se pudo cargar el producto");
      const json = await res.json();
      setData(json.product ?? null);
    } catch (e: any) {
      toast.error("Error al cargar el producto", { description: e.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    if (productId) {
      setTab("general");
      load();
    } else {
      setData(null);
    }
  }, [productId, load]);

  const totalStock =
    data?.totalStock ?? data?.lots?.reduce((s, l) => s + (l.quantity ?? 0), 0) ?? 0;
  const stockValue =
    data?.stockValue ??
    (data?.costPrice ? data.costPrice * totalStock : 0);
  const retailValue =
    data?.retailValue ??
    (data?.salePrice ? data.salePrice * totalStock : 0);
  const margin =
    data && data.salePrice > 0
      ? ((data.salePrice - data.costPrice) / data.salePrice) * 100
      : 0;

  return (
    <>
      <Dialog open={!!productId} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Pill className="h-5 w-5" />
              </span>
              <span className="truncate">{data?.name ?? "Cargando…"}</span>
              {data?.dosage && (
                <span
                  className={cn(
                    "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold",
                    getDosageColorClass(data.dosage)
                  )}
                >
                  {data.dosage}
                </span>
              )}
              {data?.requiresPrescription && (
                <span className="inline-flex rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  Rx
                </span>
              )}
              {data?.cum && (
                <span className="inline-flex rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  CUM
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="truncate">
              {data
                ? `${data.activeIngredient ?? "Sin principio activo"} · ${data.laboratory ?? "Laboratorio no registrado"}`
                : "Cargando información del producto…"}
            </DialogDescription>
          </DialogHeader>

          {loading || !data ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-3 border-b">
                <TabsList className="h-9">
                  <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
                  <TabsTrigger value="lotes" className="text-xs">
                    Lotes ({data.lots?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="movimientos" className="text-xs">
                    Movimientos
                  </TabsTrigger>
                  <TabsTrigger value="ventas" className="text-xs">Ventas</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="px-6 py-4">
                  <TabsContent value="general" className="mt-0 space-y-4">
                    <GeneralTab
                      data={data}
                      totalStock={totalStock}
                      stockValue={stockValue}
                      retailValue={retailValue}
                      margin={margin}
                      onEdit={onEdit}
                      onAddLot={onAddLot}
                      onAdjust={() => setAdjustOpen(true)}
                    />
                  </TabsContent>
                  <TabsContent value="lotes" className="mt-0">
                    <LotesTab lots={data.lots ?? []} />
                  </TabsContent>
                  <TabsContent value="movimientos" className="mt-0">
                    <MovimientosTab movements={data.stockMovements ?? []} />
                  </TabsContent>
                  <TabsContent value="ventas" className="mt-0">
                    <VentasTab sales={data.recentSales ?? []} />
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {data && (
        <AdjustStockDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          product={data}
          currentStock={totalStock}
          onDone={() => {
            setAdjustOpen(false);
            load();
            onAdjusted?.();
          }}
        />
      )}
    </>
  );
}

// ---------- General tab ----------

function GeneralTab({
  data,
  totalStock,
  stockValue,
  retailValue,
  margin,
  onEdit,
  onAddLot,
  onAdjust,
}: {
  data: ProductDetail;
  totalStock: number;
  stockValue: number;
  retailValue: number;
  margin: number;
  onEdit?: () => void;
  onAddLot?: () => void;
  onAdjust: () => void;
}) {
  const isOutOfStock = totalStock === 0;
  const isLowStock = totalStock > 0 && totalStock <= data.minStock;
  const stockState = isOutOfStock
    ? "out"
    : isLowStock
    ? "low"
    : "ok";

  const stockCardConfig = {
    out: {
      cls: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
      label: "Agotado",
      icon: AlertTriangle,
    },
    low: {
      cls: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
      label: "Stock bajo",
      icon: AlertTriangle,
    },
    ok: {
      cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
      label: "Disponible",
      icon: Box,
    },
  }[stockState];

  const byMonth = (data.byMonth ?? []).map((m, i) => ({
    name: m.label ?? m.month ?? `M${i + 1}`,
    total: m.total ?? m.revenue ?? 0,
    qty: m.qty ?? m.count ?? 0,
  }));

  const stats = data.stats ?? {};
  const totalSold = stats.totalSold ?? 0;
  const totalRevenue = stats.totalRevenue ?? 0;
  const salesCount = stats.salesCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Stock status card */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border p-4",
          stockCardConfig.cls
        )}
      >
        <div className="flex items-center gap-3">
          <stockCardConfig.icon className="h-6 w-6" />
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Estado de stock</p>
            <p className="text-lg font-bold">{stockCardConfig.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold leading-none">{formatNumber(totalStock)}</p>
          <p className="text-xs opacity-80 mt-1">unidades · mín. {data.minStock}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Ventas"
          value={String(salesCount)}
          icon={ShoppingCart}
          hint="transacciones"
          accent="primary"
        />
        <KpiCard
          label="Unidades vendidas"
          value={formatNumber(totalSold)}
          icon={Box}
          hint="acumulado"
          accent="cyan"
        />
        <KpiCard
          label="Ingresos"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          hint="acumulado"
          accent="secondary"
        />
      </div>

      {/* Ficha técnica + precios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Ficha técnica
            </p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <FichaItem icon={Barcode} label="Código" value={data.barcode} />
              <FichaItem
                icon={Tag}
                label="Categoría"
                value={data.category?.name ?? "—"}
              />
              <FichaItem
                icon={Pill}
                label="Sustancia"
                value={data.activeIngredient ?? "—"}
              />
              <FichaItem
                icon={Building2}
                label="Laboratorio"
                value={data.laboratory ?? "—"}
              />
              <FichaItem
                icon={Package}
                label="Presentación"
                value={data.presentation ?? "—"}
              />
              <FichaItem
                icon={Percent}
                label="IVA"
                value={`${Math.round(data.taxRate * 100)}%`}
              />
              <FichaItem
                icon={ShieldCheck}
                label="CUM"
                value={data.cum ?? "—"}
              />
              <FichaItem
                icon={ShieldCheck}
                label="Registro INVIMA"
                value={data.invimaRegistration ?? "—"}
              />
              <FichaItem
                icon={CalendarClock}
                label="Venc. Registro"
                value={data.invimaExpiryDate ? formatDate(data.invimaExpiryDate) : "—"}
              />
              <FichaItem
                icon={ShieldCheck}
                label="Acción Terapéutica"
                value={data.therapeuticAction ?? "—"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Precios y rentabilidad
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Costo</p>
                <p className="text-lg font-bold">{formatCurrency(data.costPrice)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-xs text-primary/80">Venta</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(data.salePrice)}</p>
              </div>
            </div>
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Margen unitario
                </span>
                <span className="font-semibold">
                  {formatCurrency(data.salePrice - data.costPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margen %</span>
                <Badge
                  className={cn(
                    "font-semibold",
                    margin >= 30
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                      : margin >= 10
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                  )}
                >
                  {margin.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Valor inventario · venta</span>
                <span className="font-medium">
                  {formatCurrency(stockValue)} · {formatCurrency(retailValue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Ventas por mes (6 meses)
          </p>
          {byMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin datos de ventas</p>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatNumber(v as number)}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Ingresos"]}
                  />
                  <Bar
                    dataKey="total"
                    fill="var(--color-chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
        </Button>
        <Button variant="outline" size="sm" onClick={onAddLot}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar lote
        </Button>
        <Button variant="outline" size="sm" onClick={onAdjust}>
          <Scale className="h-3.5 w-3.5 mr-1.5" /> Ajustar stock
        </Button>
      </div>
    </div>
  );
}

function FichaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="font-medium text-sm mt-0.5 break-words">{value}</dd>
    </div>
  );
}

// ---------- Lotes tab ----------

function LotesTab({ lots }: { lots: Lot[] }) {
  if (lots.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Layers className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No hay lotes registrados</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {lots.map((lot) => {
        const days = daysUntilExpiry(lot.expiryDate);
        const status = getExpiryStatus(lot.expiryDate);
        const initial = lot.initialQty ?? lot.quantity;
        const consumed = Math.max(0, initial - lot.quantity);
        const consumedPct = initial > 0 ? (consumed / initial) * 100 : 0;
        const badgeCfg: Record<string, { cls: string; label: string }> = {
          expired: { cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300", label: "Vencido" },
          critical: { cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300", label: `${days}d` },
          warning: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", label: `${days}d` },
          ok: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", label: `${days}d` },
        };
        const cfg = badgeCfg[status];
        return (
          <Card key={lot.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{lot.lotNumber}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        cfg.cls
                      )}
                    >
                      <CalendarClock className="h-2.5 w-2.5" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vence el {formatDate(lot.expiryDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold leading-none">{formatNumber(lot.quantity)}</p>
                  <p className="text-[10px] text-muted-foreground">de {formatNumber(initial)}</p>
                </div>
              </div>
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Consumido: {formatNumber(consumed)}</span>
                  <span>{consumedPct.toFixed(0)}%</span>
                </div>
                <Progress value={consumedPct} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- Movimientos tab ----------

function MovimientosTab({ movements }: { movements: StockMovement[] }) {
  if (movements.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Scale className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Sin movimientos registrados</p>
      </div>
    );
  }
  return (
    <div className="relative pl-5">
      <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
      <ul className="space-y-3">
        {movements.map((m) => {
          const cfg = MOVEMENT_CONFIG[m.type] ?? MOVEMENT_CONFIG.adjustment;
          const Icon = cfg.icon;
          return (
            <li key={m.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[18px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background",
                  m.type === "in" && "bg-emerald-500",
                  m.type === "out" && "bg-rose-500",
                  m.type === "adjustment" && "bg-amber-500",
                  m.type === "return" && "bg-sky-500"
                )}
              />
              <div className="flex items-start gap-2.5">
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {MOVEMENT_LABELS[m.type] ?? m.type}
                    </p>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        cfg.color
                      )}
                    >
                      {cfg.sign}
                      {Math.abs(m.quantity)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    <span>Saldo: <span className="font-medium text-foreground">{m.balance}</span></span>
                    {m.reference && <span className="truncate">· {m.reference}</span>}
                    {m.userName && <span>· {m.userName}</span>}
                    <span>· {formatDateTime(m.createdAt)}</span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Ventas tab ----------

function VentasTab({ sales }: { sales: RecentSale[] }) {
  if (sales.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Sin ventas recientes</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {sales.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors"
        >
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{s.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground truncate">
                {formatDate(s.createdAt)}
                {s.customerName ? ` · ${s.customerName}` : " · Consumidor Final"}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {s.quantity !== undefined && s.unitPrice !== undefined && (
              <p className="text-xs text-muted-foreground">
                {s.quantity} × {formatCurrency(s.unitPrice)}
              </p>
            )}
            <p className="text-sm font-bold">
              {formatCurrency(s.lineTotal ?? s.total ?? 0)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Adjust stock dialog (internal) ----------

function AdjustStockDialog({
  open,
  onOpenChange,
  product,
  currentStock,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: ProductDetail;
  currentStock: number;
  onDone: () => void;
}) {
  const [newStock, setNewStock] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNewStock(String(currentStock));
      setReason("");
    }
  }, [open, currentStock]);

  const diff =
    (parseInt(newStock || "0", 10) || 0) - currentStock;

  const handleSave = async () => {
    const n = parseInt(newStock || "0", 10);
    if (isNaN(n) || n < 0) {
      toast.error("Ingresa un stock válido (entero ≥ 0)");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Indica el motivo del ajuste (mín. 3 caracteres)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}/adjust-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStock: n, reason: reason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo ajustar el stock");
      }
      const json = await res.json();
      toast.success("Stock ajustado", {
        description: json.message ?? `${currentStock} → ${n}`,
      });
      onDone();
    } catch (e: any) {
      toast.error("Error al ajustar stock", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Ajustar stock
          </DialogTitle>
          <DialogDescription>
            {product.name} · Stock actual: <span className="font-semibold">{currentStock}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="newStock">Nuevo stock (conteo físico)</Label>
            <Input
              id="newStock"
              type="number"
              min={0}
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="mt-1"
              autoFocus
            />
            <p
              className={cn(
                "text-xs mt-1.5 font-medium",
                diff === 0
                  ? "text-muted-foreground"
                  : diff > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              Diferencia: {diff > 0 ? "+" : ""}
              {diff} unidades
            </p>
          </div>
          <div>
            <Label htmlFor="reason">Motivo del ajuste</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Conteo físico de fin de mes, merma por rotura…"
              className="mt-1 resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {reason.length}/500
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || diff === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Guardando…
              </>
            ) : (
              "Aplicar ajuste"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
