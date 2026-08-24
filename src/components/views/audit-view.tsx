"use client";

import * as React from "react";
import {
  History,
  Ban,
  UserCog,
  PackagePlus,
  AlertTriangle,
  Download,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Package,
  Wallet,
  Scale,
  Layers,
  Users,
  Settings,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDateTime, formatDate } from "@/lib/format";
import { ErrorState } from "./error-state";

const PAGE_SIZE = 20;

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "sale.create": ShoppingCart,
  "sale.void": Ban,
  "product.create": PackagePlus,
  "product.update": Package,
  "stock.adjust": Scale,
  "lot.create": Layers,
  "user.create": UserCog,
  "user.update": UserCog,
  "customer.create": Users,
  "customer.update": Users,
  "cash.open": Wallet,
  "cash.close": Wallet,
  "supplier.create": Truck,
  "supplier.update": Truck,
  "supplier.deactivate": Truck,
  "po.create": Package,
  "po.receive": Package,
  "settings.update": Settings,
};

const ACTION_LABELS: Record<string, string> = {
  "sale.create": "Venta",
  "sale.void": "Anulación",
  "product.create": "Producto creado",
  "product.update": "Producto actualizado",
  "stock.adjust": "Ajuste stock",
  "lot.create": "Lote creado",
  "user.create": "Usuario creado",
  "user.update": "Usuario actualizado",
  "customer.create": "Cliente creado",
  "customer.update": "Cliente actualizado",
  "cash.open": "Turno abierto",
  "cash.close": "Turno cerrado",
  "supplier.create": "Proveedor creado",
  "supplier.update": "Proveedor actualizado",
  "supplier.deactivate": "Proveedor desactivado",
  "po.create": "Orden de compra",
  "po.receive": "OC recibida",
  "settings.update": "Configuración",
};

const ENTITY_LABELS: Record<string, string> = {
  sale: "Ventas",
  user: "Usuarios",
  product: "Productos",
  customer: "Clientes",
  cash: "Caja",
  supplier: "Proveedores",
  "purchase-order": "Órdenes compra",
  settings: "Configuración",
};

type LogEntry = {
  id: string;
  userId: string | null;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: string | null;
  createdAt: string;
};

export function AuditView() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // Filtros
  const [entityFilter, setEntityFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = React.useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));
    if (entityFilter !== "all") params.set("entityType", entityFilter);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    fetch(`/api/audit-log?${params}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [page, entityFilter, searchQuery, fromDate, toDate]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { setPage(1); }, [entityFilter, searchQuery, fromDate, toDate]);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("limit", "5000");
    params.set("offset", "0");
    if (entityFilter !== "all") params.set("entityType", entityFilter);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    window.open(`/api/audit-log?${params}`, "_blank");
  };

  const hasFilters = entityFilter !== "all" || searchQuery || fromDate || toDate;

  const clearFilters = () => {
    setEntityFilter("all");
    setSearchQuery("");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total registros</p>
              <p className="text-lg font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="text-lg font-bold">{logs.filter((l) => l.action.startsWith("sale.")).length}</p>
              <p className="text-[10px] text-muted-foreground">en esta página</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inventario</p>
              <p className="text-lg font-bold">{logs.filter((l) => ["product.create","product.update","stock.adjust","lot.create"].includes(l.action)).length}</p>
              <p className="text-[10px] text-muted-foreground">en esta página</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuarios/Clientes</p>
              <p className="text-lg font-bold">{logs.filter((l) => l.action.startsWith("user.") || l.action.startsWith("customer.")).length}</p>
              <p className="text-[10px] text-muted-foreground">en esta página</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla con filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Bitácora de auditoría
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative sm:w-48">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar…"
                  className="pl-8 h-9"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="sale">Ventas</SelectItem>
                  <SelectItem value="product">Productos</SelectItem>
                  <SelectItem value="user">Usuarios</SelectItem>
                  <SelectItem value="customer">Clientes</SelectItem>
                  <SelectItem value="cash">Caja</SelectItem>
                  <SelectItem value="supplier">Proveedores</SelectItem>
                  <SelectItem value="purchase-order">Órdenes compra</SelectItem>
                  <SelectItem value="settings">Config</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 h-9" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36 h-9" />
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                  Limpiar
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <ErrorState title="No se pudo cargar la bitácora" onRetry={load} />
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay registros{hasFilters ? " para los filtros seleccionados" : ""}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => {
                      const Icon = ACTION_ICONS[l.action] ?? History;
                      const actionLabel = ACTION_LABELS[l.action] ?? l.action;
                      return (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <Icon className="h-4 w-4" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {actionLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{l.userName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate">
                            {l.description}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(l.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs font-medium px-2">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
