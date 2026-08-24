"use client";
import * as React from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, Search, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type Role } from "@/lib/permissions";
import { ErrorState } from "./error-state";

type User = { id: string; email: string; name: string; role: Role; active: boolean; createdAt: string; _count: { sales: number; cashShifts: number } };
const ROLE_COLORS: Record<Role, string> = { ADMIN: "bg-primary/15 text-primary", SUPERVISOR: "bg-sky-500/15 text-sky-600", CASHIER: "bg-emerald-500/15 text-emerald-600", PHARMACIST: "bg-violet-500/15 text-violet-600" };

export function UsersView() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);

  const load = React.useCallback(() => {
    setLoading(true); setError(false);
    fetch("/api/users").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { setUsers(d.users ?? []); setLoading(false); }).catch(() => { setError(true); setLoading(false); });
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()));
  const toggleActive = async (u: User) => {
    try { const res = await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !u.active }) }); if (!res.ok) throw new Error(); toast.success(u.active ? "Desactivado" : "Activado", { description: u.name }); load(); } catch { toast.error("Error"); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-[80px] rounded-xl" /><Skeleton className="h-[400px] rounded-xl" /></div>;
  if (error) return <Card><CardContent className="p-0"><ErrorState title="No se pudieron cargar los usuarios" onRetry={load} /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Gestión de usuarios</CardTitle><div className="flex items-center gap-2"><div className="relative w-56"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar…" className="pl-8 h-9" /></div><Button onClick={() => { setEditUser(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Nuevo</Button></div></div></CardHeader>
        <CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Rol</TableHead><TableHead className="text-center">Estado</TableHead><TableHead className="text-center">Ventas</TableHead><TableHead>Creado</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map(u => (
              <TableRow key={u.id} className={!u.active ? "opacity-60" : ""}>
                <TableCell><span className="font-medium text-sm">{u.name}{u.id === currentUserId && <Badge variant="secondary" className="ml-2 text-[9px]">Tú</Badge>}</span><br /><span className="text-xs text-muted-foreground">{u.email}</span></TableCell>
                <TableCell><Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge></TableCell>
                <TableCell className="text-center">{u.id === currentUserId ? <Badge variant="secondary" className="text-[10px]">—</Badge> : <Switch checked={u.active} onCheckedChange={() => toggleActive(u)} />}</TableCell>
                <TableCell className="text-center text-sm">{u._count.sales}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditUser(u); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editUser} onSaved={() => { setDialogOpen(false); load(); }} />
    </div>
  );
}

function UserFormDialog({ open, onOpenChange, user, onSaved }: any) {
  const isEdit = !!user;
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState(""); const [email, setEmail] = React.useState(""); const [password, setPassword] = React.useState(""); const [role, setRole] = React.useState<Role>("CASHIER"); const [active, setActive] = React.useState(true);
  React.useEffect(() => { if (!open) return; if (user) { setName(user.name); setEmail(user.email); setPassword(""); setRole(user.role); setActive(user.active); } else { setName(""); setEmail(""); setPassword(""); setRole("CASHIER"); setActive(true); } }, [open, user]);
  const handleSave = async () => {
    if (!name.trim()) return toast.error("Nombre obligatorio");
    if (!isEdit && !password) return toast.error("Contraseña obligatoria");
    if (password && password.length < 8) return toast.error("Mín 8 caracteres");
    setSaving(true);
    try {
      const body: any = { name: name.trim(), email: email.trim(), role, active };
      if (password) body.password = password;
      const res = await fetch(isEdit ? `/api/users/${user.id}` : "/api/users", { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(isEdit ? "Actualizado" : "Creado", { description: name }); onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{isEdit ? "Editar" : "Nuevo"} usuario</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Nombre *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" autoFocus /></div><div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></div><div><Label>Contraseña {isEdit && "(vacío=no cambiar)"} *</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín 8, 1 mayús, 1 número" className="mt-1" /></div><div><Label>Rol *</Label><Select value={role} onValueChange={(v: any) => setRole(v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(ROLE_LABELS) as Role[]).map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">Cuenta activa</p><p className="text-xs text-muted-foreground">Inactivos no pueden login</p></div><Switch checked={active} onCheckedChange={setActive} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}{isEdit ? "Guardar" : "Crear"}</Button></DialogFooter></DialogContent></Dialog>;
}
