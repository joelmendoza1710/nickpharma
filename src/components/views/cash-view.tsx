"use client";
import * as React from "react";
import { Wallet, Lock, Unlock, Loader2, CheckCircle2, TrendingUp, Banknote, CreditCard, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function CashView() {
  const [shift, setShift] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [closeDialog, setCloseDialog] = React.useState(false);
  const [openingAmount, setOpeningAmount] = React.useState("");
  const [closingAmount, setClosingAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [processing, setProcessing] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/cash-shifts/current").then(r => r.json()).then(d => { setShift(d.shift ?? null); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    const amt = parseFloat(openingAmount);
    if (isNaN(amt) || amt < 0) return toast.error("Monto inválido");
    setProcessing(true);
    try {
      const res = await fetch("/api/cash-shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ openingAmount: amt, notes: notes || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Turno abierto", { description: formatCurrency(amt) });
      setOpenDialog(false); setOpeningAmount(""); setNotes(""); load();
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  const handleClose = async () => {
    if (!shift) return;
    const amt = parseFloat(closingAmount);
    if (isNaN(amt) || amt < 0) return toast.error("Monto inválido");
    setProcessing(true);
    try {
      const res = await fetch(`/api/cash-shifts/${shift.id}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ closingAmount: amt, notes: notes || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const diff = data.difference;
      toast.success("Turno cerrado", { description: diff === 0 ? "Caja cuadrada" : diff > 0 ? `Sobrante ${formatCurrency(diff)}` : `Faltante ${formatCurrency(Math.abs(diff))}` });
      setCloseDialog(false); setClosingAmount(""); setNotes(""); load();
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-[180px] rounded-xl" /><Skeleton className="h-[200px] rounded-xl" /></div>;

  if (!shift || shift.status !== "open") {
    return (
      <div className="space-y-4">
        <Card className="border-amber-500/30">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Lock className="h-8 w-8 text-amber-500 mb-3" />
            <h2 className="text-xl font-bold">No hay turno abierto</h2>
            <p className="text-sm text-muted-foreground mt-1">Abre un turno declarando el monto inicial</p>
            <Button className="mt-5" onClick={() => setOpenDialog(true)}><Unlock className="h-4 w-4 mr-2" />Abrir turno</Button>
          </CardContent>
        </Card>
        <OpenDialog open={openDialog} onOpenChange={setOpenDialog} openingAmount={openingAmount} setOpeningAmount={setOpeningAmount} notes={notes} setNotes={setNotes} onConfirm={handleOpen} processing={processing} />
      </div>
    );
  }

  const s = shift.summary;
  const expected = s?.expectedAmount ?? shift.openingAmount;
  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/30">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600"><Wallet className="h-6 w-6" /></div>
            <div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">Turno abierto</h2><Badge className="bg-emerald-500/15 text-emerald-700">Activo</Badge></div><p className="text-xs text-muted-foreground mt-0.5">{shift.user?.name} · {formatDateTime(shift.openedAt)}</p></div>
          </div>
          <Button variant="outline" className="border-destructive/30 text-destructive" onClick={() => { setClosingAmount(String(expected)); setCloseDialog(true); }}><Lock className="h-4 w-4 mr-2" />Cerrar / Arqueo</Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Efectivo esperado" value={formatCurrency(expected)} icon={Wallet} />
        <Kpi label="Ventas efectivo" value={formatCurrency(s?.cashSales ?? 0)} icon={Banknote} />
        <Kpi label="Tarjeta" value={formatCurrency(s?.cardSales ?? 0)} icon={CreditCard} />
        <Kpi label="Transferencia" value={formatCurrency(s?.transferSales ?? 0)} icon={Landmark} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Resumen del turno</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Monto inicial" value={formatCurrency(shift.openingAmount)} />
          <Row label="Total ventas" value={formatCurrency(s?.totalSales ?? 0)} bold />
          <Row label="N° ventas" value={String(s?.salesCount ?? 0)} />
          {s && s.voidedCount > 0 && <Row label={`Devoluciones (${s.voidedCount})`} value={`- ${formatCurrency(s.voidedCash)}`} />}
          <div className="border-t pt-2"><Row label="Efectivo esperado" value={formatCurrency(expected)} bold tone="emerald" /></div>
        </CardContent>
      </Card>
      <CloseDialog open={closeDialog} onOpenChange={setCloseDialog} expected={expected} closingAmount={closingAmount} setClosingAmount={setClosingAmount} notes={notes} setNotes={setNotes} onConfirm={handleClose} processing={processing} />
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: any) {
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>;
}
function Row({ label, value, bold, tone }: any) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={bold ? "font-bold" : ""}>{value}</span></div>;
}

function OpenDialog({ open, onOpenChange, openingAmount, setOpeningAmount, notes, setNotes, onConfirm, processing }: any) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Abrir turno</DialogTitle><DialogDescription>Declara el monto inicial</DialogDescription></DialogHeader><div className="space-y-3"><div><Label>Monto inicial *</Label><Input type="number" value={openingAmount} onChange={(e: any) => setOpeningAmount(e.target.value)} className="mt-1 text-lg" autoFocus /></div><div><Label>Notas</Label><Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} rows={2} className="mt-1" /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={onConfirm} disabled={processing}>{processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Abrir</Button></DialogFooter></DialogContent></Dialog>;
}
function CloseDialog({ open, onOpenChange, expected, closingAmount, setClosingAmount, notes, setNotes, onConfirm, processing }: any) {
  const counted = parseFloat(closingAmount) || 0;
  const diff = +(counted - expected).toFixed(2);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Cerrar / Arqueo</DialogTitle><DialogDescription>Cuenta el efectivo e ingrésalo</DialogDescription></DialogHeader><div className="space-y-3"><div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm"><Row label="Esperado" value={formatCurrency(expected)} /><Row label="Contado" value={formatCurrency(counted)} /><div className="border-t pt-1.5 flex justify-between"><span className="font-medium">Diferencia</span><span className={`font-bold ${diff === 0 ? "text-emerald-600" : diff > 0 ? "text-amber-600" : "text-rose-600"}`}>{diff === 0 ? "Cuadrado" : `${diff > 0 ? "+" : ""}${formatCurrency(diff)}`}</span></div></div><div><Label>Efectivo contado *</Label><Input type="number" value={closingAmount} onChange={(e: any) => setClosingAmount(e.target.value)} className="mt-1 text-lg" autoFocus /></div><div><Label>Notas</Label><Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} rows={2} className="mt-1" /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="destructive" onClick={onConfirm} disabled={processing}>{processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Cerrar turno</Button></DialogFooter></DialogContent></Dialog>;
}
