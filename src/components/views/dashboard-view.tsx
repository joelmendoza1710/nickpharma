"use client";

import * as React from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Boxes,
  ScanLine,
  ArrowRight,
  Receipt,
  ChevronDown,
  XCircle,
  Clock,
  Pill,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KpiCard } from "./kpi-card";
import { useNav } from "@/lib/nav-store";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getPaymentMethodLabel,
  getDosageColorClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardData = {
  kpis: {
    todayTotal: number;
    todayCount: number;
    yesterdayTotal: number;
    dayVariation: number;
    monthTotal: number;
    prevMonthTotal: number;
    monthVariation: number;
    avgTicket: number;
    inventoryValue: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
    expiredCount: number;
  };
  dailySeries: { date: string; label: string; total: number; count: number }[];
  topProducts: {
    id: string;
    name: string;
    dosage: string | null;
    presentation: string | null;
    quantity: number;
    revenue: number;
    profit: number;
    margin: number;
  }[];
  paymentAgg: { method: string; total: number; count: number }[];
  alerts: {
    lowStock: {
      id: string;
      name: string;
      dosage: string | null;
      stock: number;
      minStock: number;
      categoryName: string;
    }[];
    outOfStock: {
      id: string;
      name: string;
      dosage: string | null;
      minStock: number;
      categoryName: string;
    }[];
    expiringSoon: {
      id: string;
      lotId: string;
      lotNumber: string;
      name: string;
      dosage: string | null;
      quantity: number;
      expiryDate: string;
      daysToExpiry: number;
    }[];
    expired: {
      id: string;
      lotId: string;
      lotNumber: string;
      name: string;
      dosage: string | null;
      quantity: number;
      expiryDate: string;
      daysToExpiry: number;
    }[];
  };
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "var(--color-chart-1)",
  card: "var(--color-chart-2)",
  transfer: "var(--color-chart-3)",
  mixed: "var(--color-chart-4)",
};

export function DashboardView() {
  const { navigate } = useNav();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => active && (setData(d), setLoading(false)))
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const k = data.kpis;
  const totalAlerts = k.lowStockCount + k.outOfStockCount + k.expiringSoonCount;

  return (
    <div className="space-y-5">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Ventas de hoy"
          value={formatCurrency(k.todayTotal)}
          icon={DollarSign}
          variation={k.dayVariation}
          hint={`${k.todayCount} transacciones`}
          accent="primary"
        />
        <KpiCard
          label="Ticket promedio"
          value={formatCurrency(k.avgTicket)}
          icon={ShoppingCart}
          hint="Hoy"
          accent="cyan"
        />
        <KpiCard
          label="Ventas del mes"
          value={formatCurrency(k.monthTotal)}
          icon={TrendingUp}
          variation={k.monthVariation}
          hint="vs mes anterior"
          accent="secondary"
        />
        <KpiCard
          label="Valor de inventario"
          value={formatCurrency(k.inventoryValue)}
          icon={Boxes}
          hint={`${formatNumber(k.totalStock)} unidades`}
          accent="violet"
        />
      </div>

      {/* Acciones rápidas + alertas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Ventas de los últimos 14 días</CardTitle>
              <CardDescription className="text-xs">
                Tendencia de ingresos diarios
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-medium">
              {formatCurrency(data.dailySeries.reduce((s, d) => s + d.total, 0))}
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(v) => `$${v / 1000 >= 1 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                    formatter={(value: number) => [formatCurrency(value), "Ingresos"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alertas operativas */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alertas operativas
              </CardTitle>
              <Badge
                variant={totalAlerts > 0 ? "destructive" : "secondary"}
                className="font-semibold"
              >
                {totalAlerts}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-1 space-y-2">
            <AlertsPanel alerts={data.alerts} onNavigate={() => navigate("inventory")} />
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={() => navigate("inventory")}
            >
              Ver inventario completo
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Acceso rápido POS */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-primary/5 to-transparent">
        <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ScanLine className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Iniciar nueva venta</h3>
              <p className="text-sm text-muted-foreground">
                Escanea o busca productos y completa la transacción en 3 pasos.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("pos")} className="w-full sm:w-auto">
            <ScanLine className="h-4 w-4 mr-1.5" />
            Abrir punto de venta
          </Button>
        </CardContent>
      </Card>

      {/* Top productos + métodos de pago */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Productos más vendidos</CardTitle>
                <CardDescription className="text-xs">Últimos 30 días</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("reports")}>
                Ver reportes
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{p.name}</span>
                        {p.dosage && (
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${getDosageColorClass(p.dosage)}`}
                          >
                            {p.dosage}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.quantity} unidades · margen {p.margin}%
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(p.revenue)}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(p.profit)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Métodos de pago</CardTitle>
            <CardDescription className="text-xs">Distribución (30 días)</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.paymentAgg} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(v) => `$${v / 1000 >= 1 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="method"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
                    tickFormatter={(v) => getPaymentMethodLabel(v)}
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, _name, props) => [
                      formatCurrency(value),
                      getPaymentMethodLabel(props.payload.method),
                    ]}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={28}>
                    {data.paymentAgg.map((entry) => (
                      <Cell key={entry.method} fill={PAYMENT_COLORS[entry.method] ?? "var(--color-chart-5)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {data.paymentAgg.map((p) => (
                <div key={p.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PAYMENT_COLORS[p.method] }}
                    />
                    <span className="text-muted-foreground">{getPaymentMethodLabel(p.method)}</span>
                    <span className="text-xs text-muted-foreground/70">({p.count})</span>
                  </div>
                  <span className="font-medium">{formatCurrency(p.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type LowStockItem = {
  id: string;
  name: string;
  dosage: string | null;
  stock: number;
  minStock: number;
  categoryName: string;
};

type OutOfStockItem = {
  id: string;
  name: string;
  dosage: string | null;
  minStock: number;
  categoryName: string;
};

type ExpiryItem = {
  id: string;
  lotId: string;
  lotNumber: string;
  name: string;
  dosage: string | null;
  quantity: number;
  expiryDate: string;
  daysToExpiry: number;
};

type AlertsData = {
  lowStock: LowStockItem[];
  outOfStock: OutOfStockItem[];
  expiringSoon: ExpiryItem[];
  expired: ExpiryItem[];
};

type AlertSectionKey = keyof AlertsData;

function AlertsPanel({
  alerts,
  onNavigate,
}: {
  alerts: AlertsData;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = React.useState<AlertSectionKey | null>(null);

  const sections: {
    key: AlertSectionKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: "amber" | "rose";
    items: AlertsData[AlertSectionKey];
  }[] = [
    { key: "lowStock", label: "Stock bajo", icon: Package, tone: "amber", items: alerts.lowStock },
    { key: "outOfStock", label: "Agotados", icon: XCircle, tone: "rose", items: alerts.outOfStock },
    { key: "expiringSoon", label: "Próximos a vencer", icon: Clock, tone: "amber", items: alerts.expiringSoon },
    { key: "expired", label: "Vencidos", icon: AlertTriangle, tone: "rose", items: alerts.expired },
  ];

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const count = section.items.length;
        const isOpen = expanded === section.key;
        const disabled = count === 0;
        const toneClass =
          section.tone === "rose"
            ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
            : "text-amber-600 dark:text-amber-400 bg-amber-500/10";

        return (
          <div key={section.key} className="rounded-lg border overflow-hidden">
            <button
              type="button"
              disabled={disabled}
              aria-expanded={disabled ? false : isOpen}
              onClick={() => {
                if (disabled) return;
                setExpanded(isOpen ? null : section.key);
              }}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/50"
              )}
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", toneClass)}>
                <section.icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-sm font-medium">{section.label}</span>
              <Badge
                variant={count > 0 ? (section.tone === "rose" ? "destructive" : "secondary") : "outline"}
                className="font-semibold"
              >
                {count}
              </Badge>
              {!disabled && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              )}
            </button>
            {isOpen && !disabled && (
              <div className="border-t bg-muted/30">
                <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-1">
                  {section.items.map((item, idx) => (
                    <AlertProductRow
                      key={`${section.key}-${item.id}-${"lotId" in item ? item.lotId : idx}`}
                      section={section.key}
                      item={item}
                      onClick={onNavigate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AlertProductRow({
  section,
  item,
  onClick,
}: {
  section: AlertSectionKey;
  item: LowStockItem | OutOfStockItem | ExpiryItem;
  onClick: () => void;
}) {
  let detail: React.ReactNode;
  let badge: React.ReactNode;

  if (section === "lowStock") {
    const i = item as LowStockItem;
    detail = (
      <>
        {i.categoryName} · min {i.minStock} u
      </>
    );
    badge = (
      <Badge
        variant="outline"
        className="font-medium text-amber-700 dark:text-amber-400 border-amber-300/60 shrink-0"
      >
        {i.stock}/{i.minStock}
      </Badge>
    );
  } else if (section === "outOfStock") {
    const i = item as OutOfStockItem;
    detail = (
      <>
        {i.categoryName} · min {i.minStock} u
      </>
    );
    badge = (
      <Badge variant="destructive" className="font-medium shrink-0">
        0/{i.minStock}
      </Badge>
    );
  } else if (section === "expiringSoon") {
    const i = item as ExpiryItem;
    detail = (
      <>
        Lote {i.lotNumber} · {i.quantity} u · vence {formatDate(i.expiryDate)}
      </>
    );
    badge = (
      <Badge
        variant="outline"
        className="font-medium text-amber-700 dark:text-amber-400 border-amber-300/60 shrink-0"
      >
        {i.daysToExpiry}d
      </Badge>
    );
  } else {
    const i = item as ExpiryItem;
    detail = (
      <>
        Lote {i.lotNumber} · {i.quantity} u · venció {formatDate(i.expiryDate)}
      </>
    );
    badge = (
      <Badge variant="destructive" className="font-medium shrink-0">
        {i.daysToExpiry}d
      </Badge>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors group"
    >
      <Pill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate">{item.name}</span>
          {item.dosage && (
            <span
              className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${getDosageColorClass(item.dosage)}`}
            >
              {item.dosage}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{detail}</p>
      </div>
      {badge}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-[340px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[340px] rounded-xl" />
      </div>
      <Skeleton className="h-[100px] rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Skeleton className="h-[360px] rounded-xl lg:col-span-3" />
        <Skeleton className="h-[360px] rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
