"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingCart,
  Trophy,
  Filter,
  Users,
  Download,
  CalendarRange,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "./kpi-card";
import { formatCurrency, formatNumber, getPaymentMethodLabel, getDosageColorClass } from "@/lib/format";
import { cn } from "@/lib/utils";

type CashierRow = {
  name: string;
  salesCount: number;
  revenue: number;
  discount: number;
  pointsDiscount: number;
  units: number;
  avgTicket: number;
};

type Report = {
  period: { days: number; from: string; to: string };
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    margin: number;
    totalSales: number;
    totalUnits: number;
    avgTicket: number;
  };
  byCategory: {
    name: string;
    color: string;
    total: number;
    qty: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  byDay: { date: string; label: string; total: number; count: number; qty: number }[];
  byPayment: { method: string; total: number; count: number }[];
  byCashier?: CashierRow[];
  byProfit: {
    name: string;
    dosage: string | null;
    qty: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
};

type Category = { id: string; name: string; color: string };

const PIE_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)", "#0ea5e9", "#14b8a6", "#a855f7", "#f97316"];
const PAYMENT_COLORS: Record<string, string> = {
  cash: "var(--color-chart-1)",
  card: "var(--color-chart-2)",
  transfer: "var(--color-chart-3)",
  mixed: "var(--color-chart-4)",
};

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
];

export function ReportsView() {
  const [days, setDays] = React.useState("30");
  const [mode, setMode] = React.useState<"rapido" | "personalizado">("rapido");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("");
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [data, setData] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Fetch categories once for the filter dropdown
  React.useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.categories)) {
          setCategories(d.categories.map((c: any) => ({ id: c.id, name: c.name, color: c.color })));
        }
      })
      .catch(() => {});
  }, []);

  const hasFilters = categoryId !== "" || paymentMethod !== "";

  // Build the query string used both for the API fetch and the CSV export
  const buildQuery = React.useCallback(() => {
    const params = new URLSearchParams();
    if (mode === "personalizado") {
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
    } else {
      params.set("days", days);
    }
    if (categoryId) params.set("categoryId", categoryId);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    return params;
  }, [mode, days, fromDate, toDate, categoryId, paymentMethod]);

  React.useEffect(() => {
    setLoading(true);
    const qs = buildQuery().toString();
    fetch(`/api/reports${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [buildQuery]);

  const handleClear = () => {
    setMode("rapido");
    setDays("30");
    setFromDate("");
    setToDate("");
    setCategoryId("");
    setPaymentMethod("");
  };

  const handleExport = () => {
    const qs = buildQuery().toString();
    window.open(`/api/export/reports${qs ? `?${qs}` : ""}`, "_blank");
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[120px] rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      </div>
    );
  }

  const s = data.summary;
  const cashiers = Array.isArray(data.byCashier) ? data.byCashier : [];
  const topCashierRevenue = cashiers.length > 0 ? cashiers[0].revenue : 0;
  const totalCashierRevenue = cashiers.reduce((acc, c) => acc + c.revenue, 0);

  return (
    <div className="space-y-4">
      {/* Panel de filtros */}
      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filtros</span>
                {hasFilters && (
                  <Badge variant="secondary" className="gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Filtros activos
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5 text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Limpiar</span>
                </Button>
              </div>
            </div>

            {/* Toggle Rápido / Personalizado + presets */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Tipo de período</Label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as "rapido" | "personalizado")}>
                  <TabsList>
                    <TabsTrigger value="rapido">Rápido</TabsTrigger>
                    <TabsTrigger value="personalizado">Personalizado</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {mode === "rapido" ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">Período</Label>
                  <Tabs value={days} onValueChange={setDays}>
                    <TabsList>
                      <TabsTrigger value="7">7 días</TabsTrigger>
                      <TabsTrigger value="30">30 días</TabsTrigger>
                      <TabsTrigger value="90">90 días</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="from-date" className="text-xs text-muted-foreground gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" /> Desde
                    </Label>
                    <Input
                      id="from-date"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="to-date" className="text-xs text-muted-foreground gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" /> Hasta
                    </Label>
                    <Input
                      id="to-date"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filtros adicionales: categoría + método de pago */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <Select value={categoryId} onValueChange={(v) => setCategoryId(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las categorías</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los métodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos los métodos</SelectItem>
                    {PAYMENT_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Ingresos totales"
          value={formatCurrency(s.totalRevenue)}
          icon={DollarSign}
          hint={`${formatNumber(s.totalSales)} ventas`}
          accent="primary"
        />
        <KpiCard
          label="Utilidad bruta"
          value={formatCurrency(s.totalProfit)}
          icon={TrendingUp}
          hint={`Costo ${formatCurrency(s.totalCost)}`}
          accent="cyan"
        />
        <KpiCard
          label="Margen"
          value={`${s.margin}%`}
          icon={Percent}
          hint="Rentabilidad"
          accent="violet"
        />
        <KpiCard
          label="Ticket promedio"
          value={formatCurrency(s.avgTicket)}
          icon={ShoppingCart}
          hint={`${formatNumber(s.totalUnits)} unidades`}
          accent="amber"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventas por día</CardTitle>
            <CardDescription className="text-xs">Evolución de ingresos en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(v) => `$${v / 1000 >= 1 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number, name) => {
                      if (name === "total") return [formatCurrency(value), "Ingresos"];
                      return [value, name];
                    }}
                  />
                  <Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventas por categoría</CardTitle>
            <CardDescription className="text-xs">Distribución de ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {data.byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number, name) => [formatCurrency(value), name as string]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rentabilidad por categoría */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Rentabilidad por categoría
          </CardTitle>
          <CardDescription className="text-xs">Ingresos, costo y utilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byCategory} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v) => `$${v / 1000 >= 1 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  width={45}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number, name) => [formatCurrency(value), name === "total" ? "Ingresos" : name === "cost" ? "Costo" : "Utilidad"]}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="total" name="Ingresos" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="cost" name="Costo" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="profit" name="Utilidad" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Rendimiento por cajero */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Rendimiento por cajero
          </CardTitle>
          <CardDescription className="text-xs">
            Ventas, unidades e ingresos por cajero en el período
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {cashiers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No hay datos de cajeros para el período seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium text-muted-foreground w-[44px]">#</th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">Cajero</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Ventas</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Unidades</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Ingresos</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Ticket prom</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Descuentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cashiers.map((c, i) => {
                    const isTop = i === 0 && c.revenue === topCashierRevenue && c.revenue > 0;
                    const sharePct = totalCashierRevenue > 0 ? (c.revenue / totalCashierRevenue) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-accent/40 align-top">
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold",
                              isTop
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{c.name}</span>
                              {isTop && (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-950">
                                  Top
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={sharePct} className="h-1.5 w-32" />
                              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                                {sharePct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(c.salesCount)}</td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(c.units)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(c.revenue)}</td>
                        <td className="px-4 py-2.5 text-right">{formatCurrency(c.avgTicket)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {formatCurrency((c.discount ?? 0) + (c.pointsDiscount ?? 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top productos por rentabilidad */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Productos más rentables
          </CardTitle>
          <CardDescription className="text-xs">Top 15 por utilidad generada</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Producto</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Unidades</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Ingresos</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Utilidad</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.byProfit.map((p, i) => (
                  <tr key={i} className="hover:bg-accent/40">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[11px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium">{p.name}</span>
                        {p.dosage && (
                          <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold", getDosageColorClass(p.dosage))}>
                            {p.dosage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(p.qty)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(p.revenue)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.profit)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant="outline" className="font-mono">{p.margin}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
