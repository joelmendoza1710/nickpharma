"use client";
import * as React from "react";
import { Truck, Plus, Search, Package, ShoppingCart, CheckCircle2, Pencil, Loader2, ChevronRight, Phone, Mail, MapPin, Building2, Clock, DollarSign, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ErrorState } from "./error-state";

type Supplier = { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; taxId: string | null; active: boolean; _count: { purchaseOrders: number } };
type Product = { id: string; name: string; dosage: string | null; costPrice: number };
type PurchaseOrder = { id: string; orderNumber: string; status: string; total: number; createdAt: string; supplier: { id: string; name: string }; items: any[] };

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "bg-muted text-muted-foreground" }, ordered: { label: "Pedida", cls: "bg-amber-500/15 text-amber-700" }, received: { label: "Recibida", cls: "bg-emerald-500/15 text-emerald-700" }, cancelled: { label: "Cancelada", cls: "bg-rose-500/15 text-rose-700" },
};

export function SuppliersView() {
  const [tab, setTab] = React.useState<"suppliers" | "orders">("suppliers");
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [orders, setOrders] = React.useState<PurchaseOrder[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [supplierDialog, setSupplierDialog] = React.useState(false);
  const [editSupplier, setEditSupplier] = React.useState<Supplier | null>(null);
  const [orderDialog, setOrderDialog] = React.useState(false);
  const [receiveOrder, setReceiveOrder] = React.useState<PurchaseOrder | null>(null);
  const [detailSupplierId, setDetailSupplierId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true); setError(false);
    Promise.all([fetch("/api/suppliers").then(r => r.json()), fetch("/api/purchase-orders?limit=50").then(r => r.json()), fetch("/api/products?limit=200").then(r => r.json())])
      .then(([s, o, p]) => { setSuppliers(s.suppliers ?? []); setOrders(o.orders ?? []); setProducts(p.products ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);
  React.useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-[100px] rounded-xl" /><Skeleton className="h-[400px] rounded-xl" /></div>;
  if (error) return <Card><CardContent className="p-0"><ErrorState title="Error" onRetry={load} /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Truck className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Proveedores</p><p className="text-lg font-bold">{suppliers.filter(s => s.active).length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><ShoppingCart className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Órdenes</p><p className="text-lg font-bold">{orders.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Recibidas</p><p className="text-lg font-bold">{orders.filter(o => o.status === "received").length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600"><Package className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">En tránsito</p><p className="text-lg font-bold">{orders.filter(o => o.status !== "received" && o.status !== "cancelled").length}</p></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-3"><div className="flex items-center justify-between"><Tabs value={tab} onValueChange={(v: any) => setTab(v)}><TabsList><TabsTrigger value="suppliers">Proveedores</TabsTrigger><TabsTrigger value="orders">Órdenes</TabsTrigger></TabsList></Tabs><div className="flex items-center gap-2"><div className="relative w-48"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar…" className="pl-8 h-9" /></div>{tab === "suppliers" ? <Button onClick={() => { setEditSupplier(null); setSupplierDialog(true); }}><Plus className="h-4 w-4 mr-1.5" />Nuevo</Button> : <Button onClick={() => setOrderDialog(true)}><Plus className="h-4 w-4 mr-1.5" />Nueva orden</Button>}</div></div></CardHeader>
        <CardContent>
          {tab === "suppliers" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suppliers.filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase())).map(s => (
                <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailSupplierId(s.id)}><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary"><Truck className="h-5 w-5" /></div><div className="flex-1 min-w-0"><p className="font-semibold truncate">{s.name}</p>{s.contactName && <p className="text-xs text-muted-foreground">{s.contactName}</p>}</div>{!s.active && <Badge variant="secondary">Inactivo</Badge>}<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></div><div className="mt-3 space-y-1 text-xs text-muted-foreground">{s.phone && <p>📞 {s.phone}</p>}{s.email && <p>✉️ {s.email}</p>}{s.taxId && <p>NIT: {s.taxId}</p>}<p className="border-t pt-2 mt-2">{s._count.purchaseOrders} órdenes</p></div></CardContent></Card>
              ))}
            </div>
          ) : (
            <Table><TableHeader><TableRow><TableHead>Orden</TableHead><TableHead>Proveedor</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Fecha</TableHead><TableHead className="w-[80px]"></TableHead></TableRow></TableHeader>
              <TableBody>{orders.filter(o => !query || o.orderNumber.toLowerCase().includes(query.toLowerCase()) || o.supplier.name.toLowerCase().includes(query.toLowerCase())).map(o => {
                const st = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.draft;
                return <TableRow key={o.id}><TableCell className="font-mono font-semibold">{o.orderNumber}</TableCell><TableCell>{o.supplier.name}</TableCell><TableCell><Badge className={st.cls}>{st.label}</Badge></TableCell><TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell><TableCell>{o.status !== "received" && o.status !== "cancelled" && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReceiveOrder(o)}><Package className="h-3 w-3 mr-1" />Recibir</Button>}</TableCell></TableRow>;
              })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <SupplierFormDialog open={supplierDialog} onOpenChange={setSupplierDialog} supplier={editSupplier} onSaved={() => { setSupplierDialog(false); load(); }} />
      <OrderDialog open={orderDialog} onOpenChange={setOrderDialog} suppliers={suppliers} products={products} onSaved={() => { setOrderDialog(false); load(); }} />
      <ReceiveDialog order={receiveOrder} onClose={() => setReceiveOrder(null)} onReceived={() => { setReceiveOrder(null); load(); }} />
      <SupplierDetailDialog supplierId={detailSupplierId} onClose={() => setDetailSupplierId(null)} onEdit={(supplier: Supplier) => { setDetailSupplierId(null); setEditSupplier(supplier); setSupplierDialog(true); }} onMutated={load} />
    </div>
  );
}

function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: any) {
  const isEdit = !!supplier;
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState(""); const [contactName, setContactName] = React.useState(""); const [phone, setPhone] = React.useState(""); const [email, setEmail] = React.useState(""); const [taxId, setTaxId] = React.useState(""); const [notes, setNotes] = React.useState("");
  React.useEffect(() => { if (!open) return; if (supplier) { setName(supplier.name); setContactName(supplier.contactName ?? ""); setPhone(supplier.phone ?? ""); setEmail(supplier.email ?? ""); setTaxId(supplier.taxId ?? ""); } else { setName(""); setContactName(""); setPhone(""); setEmail(""); setTaxId(""); } }, [open, supplier]);
  const handleSave = async () => {
    if (!name.trim()) return toast.error("Nombre obligatorio");
    setSaving(true);
    try {
      const body = { name: name.trim(), contactName: contactName || null, phone: phone || null, email: email || null, taxId: taxId || null, notes: notes || null };
      const res = await fetch(isEdit ? `/api/suppliers/${supplier.id}` : "/api/suppliers", { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(); toast.success(isEdit ? "Actualizado" : "Creado"); onSaved();
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{isEdit ? "Editar" : "Nuevo"} proveedor</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Nombre *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" autoFocus /></div><div className="grid grid-cols-2 gap-3"><div><Label>Contacto</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} className="mt-1" /></div><div><Label>NIT/Tax ID</Label><Input value={taxId} onChange={e => setTaxId(e.target.value)} className="mt-1" /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Teléfono</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" /></div><div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></div></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Guardar</Button></DialogFooter></DialogContent></Dialog>;
}

function OrderDialog({ open, onOpenChange, suppliers, products, onSaved }: any) {
  const [supplierId, setSupplierId] = React.useState(""); const [items, setItems] = React.useState<any[]>([]); const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) { setSupplierId(suppliers[0]?.id ?? ""); setItems([{ productId: "", quantity: "1", unitCost: "" }]); } }, [open, suppliers]);
  const total = items.reduce((s, it) => s + (parseInt(it.quantity) || 0) * (parseFloat(it.unitCost) || 0), 0);
  const handleSave = async () => {
    if (!supplierId) return toast.error("Selecciona proveedor");
    const valid = items.filter((it: any) => it.productId && parseInt(it.quantity) > 0);
    if (!valid.length) return toast.error("Agrega productos");
    setSaving(true);
    try { const res = await fetch("/api/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId, items: valid.map((it: any) => ({ productId: it.productId, quantity: parseInt(it.quantity), unitCost: parseFloat(it.unitCost) || 0 })) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success("Orden creada", { description: data.order.orderNumber }); onSaved(); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nueva orden de compra</DialogTitle></DialogHeader><div className="space-y-3"><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Proveedor" /></SelectTrigger><SelectContent>{suppliers.filter((s: any) => s.active).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><div className="rounded-lg border divide-y">{items.map((it, i) => <div key={i} className="grid grid-cols-12 gap-2 p-2 items-end"><div className="col-span-7"><Select value={it.productId} onValueChange={(v: any) => { const n = [...items]; n[i] = { ...n[i], productId: v, unitCost: String(products.find((p: any) => p.id === v)?.costPrice ?? "") }; setItems(n); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Producto" /></SelectTrigger><SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} {p.dosage ?? ""}</SelectItem>)}</SelectContent></Select></div><div className="col-span-2"><Input type="number" min="1" value={it.quantity} onChange={e => { const n = [...items]; n[i] = { ...n[i], quantity: e.target.value }; setItems(n); }} placeholder="Cant" className="h-9 text-xs" /></div><div className="col-span-2"><Input type="number" step="0.01" value={it.unitCost} onChange={e => { const n = [...items]; n[i] = { ...n[i], unitCost: e.target.value }; setItems(n); }} placeholder="Costo" className="h-9 text-xs" /></div><div className="col-span-1"><Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => items.length > 1 && setItems(items.filter((_, idx) => idx !== i))}>✕</Button></div></div>)}</div><Button size="sm" variant="ghost" onClick={() => setItems([...items, { productId: "", quantity: "1", unitCost: "" }])}><Plus className="h-3 w-3 mr-1" />Agregar</Button><div className="flex justify-between text-sm border-t pt-2"><span className="text-muted-foreground">Total</span><span className="font-bold">{formatCurrency(total)}</span></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Crear</Button></DialogFooter></DialogContent></Dialog>;
}

function SupplierDetailDialog({ supplierId, onClose, onEdit, onMutated }: { supplierId: string | null; onClose: () => void; onEdit: (supplier: Supplier) => void; onMutated: () => void; }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<string>("general");
  const [toggling, setToggling] = React.useState(false);

  React.useEffect(() => {
    if (!supplierId) { setData(null); return; }
    setLoading(true); setData(null);
    fetch(`/api/suppliers/${supplierId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error("Error al cargar proveedor"))
      .finally(() => setLoading(false));
  }, [supplierId]);

  const handleToggle = async () => {
    if (!data?.supplier) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/suppliers/${data.supplier.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !data.supplier.active }) });
      if (!res.ok) throw new Error();
      toast.success(data.supplier.active ? "Proveedor desactivado" : "Proveedor activado");
      const refreshed = await fetch(`/api/suppliers/${data.supplier.id}`).then(r => r.json());
      setData(refreshed);
      onMutated();
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setToggling(false);
    }
  };

  const supplier = data?.supplier;
  const metrics = data?.metrics;

  return (
    <Dialog open={!!supplierId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Truck className="h-5 w-5" /></span>
            <span className="truncate">{supplier?.name ?? (loading ? "Cargando…" : "Proveedor")}</span>
            {supplier && <Badge variant={supplier.active ? "default" : "secondary"} className="shrink-0">{supplier.active ? "Activo" : "Inactivo"}</Badge>}
          </DialogTitle>
          <DialogDescription className="truncate">
            {supplier ? `${supplier._count?.purchaseOrders ?? 0} órdenes registradas` : "Detalle del proveedor"}
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Skeleton className="h-20 rounded-lg" /><Skeleton className="h-20 rounded-lg" /><Skeleton className="h-20 rounded-lg" /><Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-3 border-b">
              <TabsList className="h-9">
                <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">Órdenes ({metrics.totalOrders})</TabsTrigger>
                <TabsTrigger value="products" className="text-xs">Productos ({metrics.productsCount})</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* ---------- General ---------- */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card><CardContent className="p-3"><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><DollarSign className="h-3.5 w-3.5" />Total comprado</div><p className="text-base font-bold mt-1 truncate">{formatCurrency(metrics.totalPurchased)}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShoppingCart className="h-3.5 w-3.5" />Órdenes totales</div><p className="text-base font-bold mt-1">{metrics.totalOrders}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock className="h-3.5 w-3.5" />Entrega prom.</div><p className="text-base font-bold mt-1">{metrics.avgDeliveryDays != null ? `${metrics.avgDeliveryDays} d` : "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Package className="h-3.5 w-3.5" />Productos</div><p className="text-base font-bold mt-1">{metrics.productsCount}</p></CardContent></Card>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-emerald-500/5 border-emerald-500/20"><CardContent className="p-3"><div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Recibidas</div><p className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{metrics.receivedCount}</p></CardContent></Card>
                  <Card className="bg-amber-500/5 border-amber-500/20"><CardContent className="p-3"><div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400"><AlertCircle className="h-3.5 w-3.5" />Pendientes</div><p className="text-xl font-bold mt-1 text-amber-700 dark:text-amber-400">{metrics.pendingCount}</p></CardContent></Card>
                  <Card className="bg-rose-500/5 border-rose-500/20"><CardContent className="p-3"><div className="flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-400"><XCircle className="h-3.5 w-3.5" />Canceladas</div><p className="text-xl font-bold mt-1 text-rose-700 dark:text-rose-400">{metrics.cancelledCount}</p></CardContent></Card>
                </div>

                <Card><CardContent className="p-4 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground w-20 shrink-0">Contacto</span><span className="font-medium truncate">{supplier.contactName ?? "—"}</span></div>
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground w-20 shrink-0">NIT</span><span className="font-medium truncate">{supplier.taxId ?? "—"}</span></div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground w-20 shrink-0">Teléfono</span><span className="font-medium truncate">{supplier.phone ?? "—"}</span></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground w-20 shrink-0">Email</span><span className="font-medium truncate">{supplier.email ?? "—"}</span></div>
                  {supplier.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground w-20 shrink-0">Dirección</span><span className="font-medium">{supplier.address}</span></div>}
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground w-20 shrink-0">Última orden</span><span className="font-medium">{metrics.lastOrderDate ? formatDate(metrics.lastOrderDate) : "—"}</span></div>
                </CardContent></Card>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => onEdit(supplier)}><Pencil className="h-4 w-4 mr-1.5" />Editar</Button>
                  <Button size="sm" onClick={handleToggle} disabled={toggling} variant={supplier.active ? "outline" : "default"} className={cn(supplier.active ? "" : "bg-emerald-600 hover:bg-emerald-700 text-white")}>
                    {toggling ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : supplier.active ? <XCircle className="h-4 w-4 mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                    {supplier.active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </TabsContent>

              {/* ---------- Órdenes ---------- */}
              <TabsContent value="orders" className="mt-0">
                {data.recentOrders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Sin órdenes registradas</p></div>
                ) : (
                  <div className="space-y-2">
                    {data.recentOrders.slice(0, 10).map((o: any) => {
                      const st = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.draft;
                      return (
                        <div key={o.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap"><p className="font-mono font-semibold text-sm">{o.orderNumber}</p><Badge className={cn("text-[10px]", st.cls)}>{st.label}</Badge></div>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(o.orderedAt ?? o.createdAt)} · {o.itemCount} ítems · {o.totalQty} u.</p>
                          </div>
                          <p className="font-semibold text-sm shrink-0">{formatCurrency(o.total)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ---------- Productos ---------- */}
              <TabsContent value="products" className="mt-0">
                {data.productsSupplied.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Sin productos suministrados</p></div>
                ) : (
                  <div className="space-y-2">
                    {data.productsSupplied.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-sm truncate">{p.name}</p>{p.dosage && <Badge variant="secondary" className="text-[10px]">{p.dosage}</Badge>}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">Recibido: {p.totalReceived} u. · Última: {p.lastOrder ? formatDate(p.lastOrder) : "—"}</p>
                        </div>
                        <p className="font-semibold text-sm shrink-0">{formatCurrency(p.totalSpent)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({ order, onClose, onReceived }: any) {
  const [recvItems, setRecvItems] = React.useState<any[]>([]); const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (order) setRecvItems(order.items.map((it: any) => ({ id: it.id, lotNumber: `L-${Date.now().toString().slice(-6)}`, expiryDate: "", receivedQty: String(it.quantity) }))); }, [order]);
  if (!order) return null;
  const handleReceive = async () => {
    for (const r of recvItems) { if (parseInt(r.receivedQty) > 0 && (!r.lotNumber || !r.expiryDate)) return toast.error("Completa lote y vencimiento"); }
    setSaving(true);
    try { const res = await fetch(`/api/purchase-orders/${order.id}/receive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: recvItems.filter((r: any) => parseInt(r.receivedQty) > 0).map((r: any) => ({ id: r.id, receivedQty: parseInt(r.receivedQty), lotNumber: r.lotNumber, expiryDate: r.expiryDate })) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success("Recibida", { description: data.message }); onReceived(); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  return <Dialog open={!!order} onOpenChange={(v: any) => !v && onClose()}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Recibir — {order.orderNumber}</DialogTitle><DialogDescription>{order.supplier.name}</DialogDescription></DialogHeader><div className="space-y-3">{order.items.map((it: any, i: number) => <div key={it.id} className="rounded-lg border p-3"><p className="text-sm font-medium">{it.product.name} {it.product.dosage ?? ""}</p><p className="text-xs text-muted-foreground">Pedido: {it.quantity} · Costo: {formatCurrency(it.unitCost)}</p><div className="grid grid-cols-3 gap-2 mt-2"><div><Label className="text-[10px]">Recibido</Label><Input type="number" min="0" value={recvItems[i]?.receivedQty ?? ""} onChange={e => { const n = [...recvItems]; n[i] = { ...n[i], receivedQty: e.target.value }; setRecvItems(n); }} className="h-8 text-sm" /></div><div><Label className="text-[10px]">Lote</Label><Input value={recvItems[i]?.lotNumber ?? ""} onChange={e => { const n = [...recvItems]; n[i] = { ...n[i], lotNumber: e.target.value }; setRecvItems(n); }} className="h-8 text-sm" /></div><div><Label className="text-[10px]">Vence</Label><Input type="date" value={recvItems[i]?.expiryDate ?? ""} onChange={e => { const n = [...recvItems]; n[i] = { ...n[i], expiryDate: e.target.value }; setRecvItems(n); }} className="h-8 text-sm" /></div></div></div>)}</div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleReceive} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Confirmar</Button></DialogFooter></DialogContent></Dialog>;
}
