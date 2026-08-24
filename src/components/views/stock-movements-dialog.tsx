"use client";

import * as React from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Scale,
  RefreshCw,
  Download,
  Loader2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "./kpi-card";
import { formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";

type Movement = {
  id: string;
  type: "in" | "out" | "adjustment" | "return" | string;
  quantity: number;
  balance: number;
  reference?: string | null;
  lotId?: string | null;
  userName?: string;
  createdAt: string;
  product?: { id: string; name: string; dosage?: string | null; barcode: string };
};

type Summary = {
  in?: { count: number; quantity: number };
  out?: { count: number; quantity: number };
  adjustment?: { count: number; quantity: number };
  return?: { count: number; quantity: number };
};

const MOVEMENT_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
  return: "Devolución",
};

const MOVEMENT_BADGE: Record<string, string> = {
  in: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20",
  out: "bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20",
  adjustment: "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20",
  return: "bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20",
};

export function StockMovementsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/stock-movements?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudieron cargar los movimientos");
      const json = await res.json();
      setMovements(json.movements ?? []);
      setSummary(json.summary ?? null);
      setTotal(json.total ?? 0);
    } catch (e: any) {
      toast.error("Error al cargar movimientos", { description: e.message });
      setMovements([]);
      setSummary(null);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, from, to]);

  React.useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  const handleExportCSV = () => {
    if (movements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }
    const headers = [
      "Fecha",
      "Tipo",
      "Producto",
      "Código de barras",
      "Cantidad",
      "Saldo",
      "Referencia",
      "Usuario",
    ];
    const rows = movements.map((m) => [
      formatDateTime(m.createdAt),
      MOVEMENT_LABELS[m.type] ?? m.type,
      m.product?.name ?? "—",
      m.product?.barcode ?? "",
      String(m.quantity),
      String(m.balance),
      (m.reference ?? "").replace(/"/g, '""'),
      m.userName ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    // BOM for Excel UTF-8 compatibility
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado", {
      description: `${movements.length} movimientos`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" /> Movimientos de inventario
          </DialogTitle>
          <DialogDescription>
            Entradas, salidas, ajustes y devoluciones registradas.
          </DialogDescription>
        </DialogHeader>

        {/* Filters + KPIs */}
        <div className="px-6 py-3 border-b space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in">Entradas</SelectItem>
                  <SelectItem value="out">Salidas</SelectItem>
                  <SelectItem value="adjustment">Ajustes</SelectItem>
                  <SelectItem value="return">Devoluciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40 h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-9">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={loading || movements.length === 0}
              className="h-9 ml-auto"
            >
              <Download className="h-4 w-4 mr-1.5" /> CSV
            </Button>
          </div>

          {/* KPI summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Entradas"
              value={formatNumber(summary?.in?.quantity ?? 0)}
              icon={ArrowUpCircle}
              hint={`${summary?.in?.count ?? 0} movs`}
              accent="secondary"
            />
            <KpiCard
              label="Salidas"
              value={formatNumber(Math.abs(summary?.out?.quantity ?? 0))}
              icon={ArrowDownCircle}
              hint={`${summary?.out?.count ?? 0} movs`}
              accent="rose"
            />
            <KpiCard
              label="Ajustes"
              value={String(summary?.adjustment?.count ?? 0)}
              icon={Scale}
              hint={`${formatNumber(Math.abs(summary?.adjustment?.quantity ?? 0))} und`}
              accent="amber"
            />
            <KpiCard
              label="Devoluciones"
              value={formatNumber(summary?.return?.quantity ?? 0)}
              icon={RefreshCw}
              hint={`${summary?.return?.count ?? 0} movs`}
              accent="cyan"
            />
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Filter className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay movimientos con los filtros seleccionados</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[150px]">Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="min-w-[220px]">Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="min-w-[160px]">Referencia</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "font-medium border-transparent",
                          MOVEMENT_BADGE[m.type] ?? MOVEMENT_BADGE.adjustment
                        )}
                      >
                        {MOVEMENT_LABELS[m.type] ?? m.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {m.product?.name ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.product?.barcode}
                          {m.product?.dosage ? ` · ${m.product.dosage}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold tabular-nums",
                        m.type === "in" && "text-emerald-600 dark:text-emerald-400",
                        m.type === "out" && "text-rose-600 dark:text-rose-400",
                        m.type === "adjustment" && "text-amber-600 dark:text-amber-400",
                        m.type === "return" && "text-sky-600 dark:text-sky-400"
                      )}
                    >
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {m.balance}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {m.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{m.userName ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <div className="px-6 py-2 border-t text-xs text-muted-foreground">
          Mostrando {movements.length} de {total} movimientos
        </div>
      </DialogContent>
    </Dialog>
  );
}
