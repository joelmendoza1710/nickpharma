"use client";

import * as React from "react";
import {
  Search,
  Receipt,
  Eye,
  Banknote,
  CreditCard,
  Landmark,
  User,
  Ban,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
  getDosageColorClass,
} from "@/lib/format";

const PAGE_SIZE = 15;

type Sale = {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  cashReceived: number | null;
  change: number | null;
  cashierName: string;
  status: string;
  createdAt: string;
  customer: { id: string; fullName: string; document: string | null } | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: { name: string; dosage: string | null; presentation: string | null };
  }[];
};

const PAYMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  transfer: Landmark,
};

const STATUS_OPTIONS = [
  { value: "completed", label: "Completadas" },
  { value: "voided", label: "Anuladas" },
  { value: "all", label: "Todas" },
] as const;

export function SalesView() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as Role | undefined;
  const canManage = hasPermission(role, "sales:manage");

  const [sales, setSales] = React.useState<Sale[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<string>("completed");
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Sale | null>(null);
  const [voidTarget, setVoidTarget] = React.useState<Sale | null>(null);
  const [voidReason, setVoidReason] = React.useState("");
  const [voiding, setVoiding] = React.useState(false);

  const loadSales = React.useCallback(() => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const url = `/api/sales?limit=${PAGE_SIZE}&offset=${offset}&status=${encodeURIComponent(
      statusFilter,
    )}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setSales(d.sales ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, statusFilter]);

  React.useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Reset to page 1 when status filter changes
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filtered = React.useMemo(() => {
    if (!query) return sales;
    const q = query.toLowerCase();
    return sales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customer?.fullName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q),
    );
  }, [sales, query]);

  const pageTotal = React.useMemo(
    () => sales.reduce((sum, s) => sum + (s.status === "voided" ? 0 : s.total), 0),
    [sales],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const handleOpenVoid = (sale: Sale) => {
    setVoidReason("");
    setVoidTarget(sale);
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    const reason = voidReason.trim();
    if (reason.length < 3) {
      toast.error("Indica el motivo de la anulación (mínimo 3 caracteres).");
      return;
    }
    setVoiding(true);
    try {
      const res = await fetch(`/api/sales/${voidTarget.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Error al anular la venta");
      }
      toast.success(
        data.message ?? `Venta ${voidTarget.invoiceNumber} anulada. Stock restaurado.`,
      );
      setVoidTarget(null);
      setVoidReason("");
      setSelected(null);
      loadSales();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al anular la venta";
      toast.error(msg);
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="flex items-center justify-between gap-3 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total en la página</p>
              <p className="text-2xl font-bold">{formatCurrency(pageTotal)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total registros</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Historial de facturas</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 h-9">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative sm:w-72">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por factura, cliente o cajero…"
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Factura</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cajero</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No hay ventas registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((sale) => {
                        const Icon = PAYMENT_ICONS[sale.paymentMethod] ?? Banknote;
                        const isVoided = sale.status === "voided";
                        return (
                          <TableRow
                            key={sale.id}
                            className={cn("cursor-pointer", isVoided && "opacity-60")}
                            onClick={() => setSelected(sale)}
                          >
                            <TableCell className="font-mono font-semibold text-sm">
                              <div className="flex items-center gap-2">
                                {sale.invoiceNumber}
                                {isVoided && (
                                  <Badge variant="destructive" className="font-normal gap-1">
                                    <Ban className="h-3 w-3" />
                                    Anulada
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(sale.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{sale.customer?.fullName ?? "Consumidor Final"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{sale.cashierName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal gap-1">
                                <Icon className="h-3 w-3" />
                                {getPaymentMethodLabel(sale.paymentMethod)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("text-right font-semibold", isVoided && "line-through")}>
                              {formatCurrency(sale.total)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {total === 0
                    ? "Sin resultados"
                    : `Mostrando ${from}-${to} de ${total}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SaleDetailDialog
        sale={selected}
        onClose={() => setSelected(null)}
        canManage={canManage}
        onVoid={handleOpenVoid}
      />

      {/* Confirmación de anulación */}
      <AlertDialog
        open={!!voidTarget}
        onOpenChange={(v) => {
          if (!v && !voiding) {
            setVoidTarget(null);
            setVoidReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Anular venta {voidTarget?.invoiceNumber ?? ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción restaurará el stock de los productos y revertirá los
              puntos de lealtad del cliente. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="void-reason" className="text-sm font-medium">
              Motivo de la anulación <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Indica el motivo (mínimo 3 caracteres)…"
              rows={3}
              maxLength={500}
              disabled={voiding}
            />
            <p className="text-xs text-muted-foreground">
              {voidReason.length}/500 caracteres · mínimo 3
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voiding}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleVoid();
              }}
              disabled={voiding || voidReason.trim().length < 3}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voiding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Anulando…
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Anular venta
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaleDetailDialog({
  sale,
  onClose,
  canManage,
  onVoid,
}: {
  sale: Sale | null;
  onClose: () => void;
  canManage: boolean;
  onVoid: (sale: Sale) => void;
}) {
  if (!sale) return null;
  const isVoided = sale.status === "voided";
  return (
    <Dialog open={!!sale} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {sale.invoiceNumber}
            {isVoided && (
              <Badge variant="destructive" className="ml-1 gap-1">
                <Ban className="h-3 w-3" />
                Anulada
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{formatDateTime(sale.createdAt)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{sale.customer?.fullName ?? "Consumidor Final"}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Cajero</p>
              <p className="font-medium">{sale.cashierName}</p>
            </div>
          </div>
          <div className="rounded-lg border">
            <div className="border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
              Productos ({sale.items.length})
            </div>
            <div className="divide-y max-h-60 overflow-y-auto">
              {sale.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{it.product.name}</span>
                      {it.product.dosage && (
                        <span className={cn("inline-flex rounded px-1 py-0.5 text-[9px] font-bold", getDosageColorClass(it.product.dosage))}>
                          {it.product.dosage}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} × {formatCurrency(it.unitPrice)}
                    </p>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(it.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impuesto</span>
              <span>{formatCurrency(sale.taxTotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(sale.total)}</span>
            </div>
            {sale.cashReceived != null && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Recibido ({getPaymentMethodLabel(sale.paymentMethod)})</span>
                  <span>{formatCurrency(sale.cashReceived)}</span>
                </div>
                {sale.change != null && sale.change > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cambio</span>
                    <span>{formatCurrency(sale.change)}</span>
                  </div>
                )}
              </>
            )}
          </div>
          {canManage && !isVoided && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onVoid(sale)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Anular venta
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
