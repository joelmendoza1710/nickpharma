"use client";

import * as React from "react";
import {
  Search,
  Users,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  ShoppingBag,
  DollarSign,
  Receipt,
  Pencil,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import { toast } from "sonner";

type Customer = {
  id: string;
  fullName: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyaltyPoints: number;
  salesCount: number;
  totalSpent: number;
  createdAt: string;
};

type SaleItem = {
  quantity: number;
  product: { name: string };
};

type Sale = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  total: number;
  status: string;
  paymentMethod: string;
  items: SaleItem[];
};

export function CustomersView() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.customers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.document?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, query]);

  const totalCustomers = customers.length;
  const totalLoyalty = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes registrados</p>
              <p className="text-xl font-bold">{formatNumber(totalCustomers)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Puntos de lealtad</p>
              <p className="text-xl font-bold">{formatNumber(totalLoyalty)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compras acumuladas</p>
              <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Directorio de clientes</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar cliente…"
                  className="pl-8 h-9"
                />
              </div>
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Nuevo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[160px] rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">No hay clientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <CustomerCard
                  key={c.id}
                  customer={c}
                  onClick={() => setSelectedId(c.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          load();
        }}
      />

      <CustomerDetailDialog
        customerId={selectedId}
        open={!!selectedId}
        onOpenChange={(v) => !v && setSelectedId(null)}
        onPointsUpdated={(id, points) =>
          setCustomers((prev) =>
            prev.map((c) => (c.id === id ? { ...c, loyaltyPoints: points } : c))
          )
        }
      />
    </div>
  );
}

function CustomerCard({
  customer,
  onClick,
}: {
  customer: Customer;
  onClick?: () => void;
}) {
  const initials = customer.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const isCF = customer.document === "CF";

  return (
    <Card
      className="overflow-hidden transition-shadow hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer group"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              isCF
                ? "bg-muted text-muted-foreground"
                : "bg-primary/15 text-primary"
            )}
          >
            {isCF ? "CF" : initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight truncate">{customer.fullName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {customer.document ? `Doc: ${customer.document}` : "Sin documento"}
            </p>
          </div>
          {customer.loyaltyPoints > 0 && (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 gap-1">
              <Award className="h-3 w-3" />
              {customer.loyaltyPoints}
            </Badge>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs">
            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{customer.salesCount} compras</span>
          </div>
          <span className="font-bold text-sm">{formatCurrency(customer.totalSpent)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = React.useState("");
  const [document, setDocument] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setFullName("");
      setDocument("");
      setPhone("");
      setEmail("");
      setAddress("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          document: document.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error");
      }
      toast.success("Cliente registrado", { description: fullName });
      onCreated();
    } catch (e: any) {
      toast.error("No se pudo registrar el cliente", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nuevo cliente
          </DialogTitle>
          <DialogDescription>Registra un cliente en el directorio</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Nombre completo *</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" placeholder="Ej. María Pérez" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="doc">Documento</Label>
              <Input id="doc" value={document} onChange={(e) => setDocument(e.target.value)} className="mt-1" placeholder="DPI/NIT" />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+57 …" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="cliente@email.com" />
          </div>
          <div>
            <Label htmlFor="addr">Dirección</Label>
            <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" placeholder="Dirección de entrega" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Registrar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailDialog({
  customerId,
  open,
  onOpenChange,
  onPointsUpdated,
}: {
  customerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPointsUpdated?: (id: string, points: number) => void;
}) {
  const [detailData, setDetailData] = React.useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(true);
  const [detailSales, setDetailSales] = React.useState<Sale[]>([]);
  const [editing, setEditing] = React.useState(false);
  const [pointsInput, setPointsInput] = React.useState("");
  const [savingPoints, setSavingPoints] = React.useState(false);

  React.useEffect(() => {
    if (!open || !customerId) return;
    setDetailLoading(true);
    setEditing(false);
    setDetailData(null);
    setDetailSales([]);
    Promise.all([
      fetch(`/api/customers/${customerId}`).then((r) => r.json()),
      fetch(
        `/api/sales?customerId=${encodeURIComponent(customerId)}&limit=10&status=all`
      ).then((r) => r.json()),
    ])
      .then(([cd, sd]) => {
        setDetailData(cd.customer ?? null);
        setDetailSales(sd.sales ?? []);
        setPointsInput(String(cd.customer?.loyaltyPoints ?? 0));
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
  }, [open, customerId]);

  const handleSavePoints = async () => {
    if (!customerId || !detailData) return;
    const n = parseInt(pointsInput, 10);
    if (isNaN(n) || n < 0) {
      toast.error("Ingrese un valor válido (entero ≥ 0)");
      return;
    }
    setSavingPoints(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loyaltyPoints: n }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error");
      }
      const d = await res.json();
      const newPoints: number = d.customer.loyaltyPoints;
      setDetailData((prev) =>
        prev ? { ...prev, loyaltyPoints: newPoints } : prev
      );
      onPointsUpdated?.(customerId, newPoints);
      setEditing(false);
      toast.success("Puntos actualizados", {
        description: `${formatNumber(newPoints)} pts`,
      });
    } catch (e: any) {
      toast.error("No se pudo actualizar los puntos", {
        description: e.message,
      });
    } finally {
      setSavingPoints(false);
    }
  };

  const isCF = detailData?.document === "CF";
  const avgTicket =
    detailData && detailData.salesCount > 0
      ? detailData.totalSpent / detailData.salesCount
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {detailLoading
              ? "Cargando cliente…"
              : detailData?.fullName ?? "Cliente"}
          </DialogTitle>
          <DialogDescription>
            Ficha del cliente · contacto, lealtad e historial de compras
          </DialogDescription>
        </DialogHeader>

        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : detailData ? (
          <div className="space-y-4">
            {/* Contact info */}
            <div className="rounded-lg border p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0 w-20">
                    Documento
                  </span>
                  <span className="font-medium truncate">
                    {detailData.document ?? "—"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <span className="truncate">
                    {detailData.phone ?? "Sin teléfono"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <span className="truncate">
                    {detailData.email ?? "Sin correo"}
                  </span>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <span className="truncate">
                    {detailData.address ?? "Sin dirección"}
                  </span>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <span>Cliente desde {formatDate(detailData.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <ShoppingBag className="h-3.5 w-3.5" /> Compras
                </div>
                <p className="text-lg font-bold">
                  {formatNumber(detailData.salesCount)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" /> Total
                </div>
                <p className="text-lg font-bold">
                  {formatCurrency(detailData.totalSpent)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Receipt className="h-3.5 w-3.5" /> Ticket prom.
                </div>
                <p className="text-lg font-bold">{formatCurrency(avgTicket)}</p>
              </div>
            </div>

            {/* Loyalty points */}
            <div className="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Puntos de lealtad
                  </p>
                  {editing ? (
                    <Input
                      type="number"
                      min={0}
                      value={pointsInput}
                      onChange={(e) => setPointsInput(e.target.value)}
                      className="h-8 w-32 mt-0.5"
                      disabled={savingPoints}
                      autoFocus
                    />
                  ) : (
                    <p className="text-lg font-bold leading-tight">
                      {formatNumber(detailData.loyaltyPoints)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        pts
                      </span>
                    </p>
                  )}
                </div>
              </div>
              {isCF ? (
                <Badge variant="outline" className="text-muted-foreground">
                  Consumidor Final
                </Badge>
              ) : editing ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setPointsInput(String(detailData.loyaltyPoints));
                    }}
                    disabled={savingPoints}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePoints}
                    disabled={savingPoints}
                  >
                    {savingPoints ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Guardando
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Ajustar
                </Button>
              )}
            </div>

            {/* Purchase history */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Historial de compras</p>
                <span className="text-xs text-muted-foreground">
                  {detailSales.length === 0
                    ? "Sin ventas"
                    : `${detailSales.length} ${
                        detailSales.length === 1 ? "venta" : "ventas"
                      }`}
                </span>
              </div>
              {detailSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <Receipt className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Sin compras registradas</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {detailSales.map((s) => {
                    const itemsCount = s.items.reduce(
                      (sum, it) => sum + (it.quantity ?? 0),
                      0
                    );
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {s.invoiceNumber}
                            </span>
                            {s.status && s.status !== "completed" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5"
                              >
                                {s.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(s.createdAt)} · {itemsCount}{" "}
                            {itemsCount === 1 ? "artículo" : "artículos"}
                          </p>
                        </div>
                        <span className="font-bold text-sm shrink-0">
                          {formatCurrency(s.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No se pudo cargar el cliente</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
