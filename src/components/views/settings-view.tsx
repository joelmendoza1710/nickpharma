"use client";

import * as React from "react";
import {
  Building2,
  Award,
  AlertTriangle,
  Receipt,
  Save,
  Loader2,
  RotateCcw,
  Store,
  Phone,
  MapPin,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ErrorState } from "./error-state";

type Setting = { key: string; label: string; value: string };

const SECTIONS = [
  {
    id: "pharmacy",
    title: "Información de la farmacia",
    description: "Datos que aparecen en facturas y recibos",
    icon: Building2,
    keys: ["pharmacy_name", "pharmacy_tagline", "pharmacy_nit", "pharmacy_phone", "pharmacy_address", "pharmacy_email"],
  },
  {
    id: "loyalty",
    title: "Programa de lealtad",
    description: "Configuración de puntos de fidelización",
    icon: Award,
    keys: ["points_rate", "points_earn_rate"],
  },
  {
    id: "alerts",
    title: "Alertas de inventario",
    description: "Umbrales para alertas de stock y vencimientos",
    icon: AlertTriangle,
    keys: ["expiry_warning_days", "expiry_critical_days", "low_stock_threshold"],
  },
  {
    id: "invoicing",
    title: "Facturación",
    description: "Configuración de numeración de facturas",
    icon: Receipt,
    keys: ["invoice_prefix", "invoice_start"],
  },
] as const;

export function SettingsView() {
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [original, setOriginal] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/api/settings")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        const map: Record<string, string> = {};
        for (const s of d.settings ?? []) map[s.key] = s.value;
        setSettings(map);
        setOriginal(map);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const dirtyKeys = Object.keys(settings).filter((k) => settings[k] !== original[k]);

  const handleSave = async () => {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      for (const k of dirtyKeys) updates[k] = settings[k];
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setOriginal({ ...settings });
      toast.success("Configuración guardada", {
        description: `${dirtyKeys.length} ${dirtyKeys.length === 1 ? "campo actualizado" : "campos actualizados"}`,
      });
    } catch (e: any) {
      toast.error("No se pudo guardar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...original });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[60px] rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[200px] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) return <Card><CardContent className="p-0"><ErrorState title="No se pudo cargar la configuración" onRetry={load} /></CardContent></Card>;

  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <Card className="border-primary/15">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Configuración global</p>
              <p className="text-xs text-muted-foreground">
                {dirtyKeys.length > 0
                  ? `${dirtyKeys.length} ${dirtyKeys.length === 1 ? "cambio sin guardar" : "cambios sin guardar"}`
                  : "Todos los cambios guardados"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirtyKeys.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Descartar
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={dirtyKeys.length === 0 || saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Guardando…</> : <><Save className="h-4 w-4 mr-1.5" />Guardar cambios</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secciones de configuración */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const sectionDirty = section.keys.some((k) => settings[k] !== original[k]);
          return (
            <Card key={section.id} className={sectionDirty ? "border-primary/40" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{section.title}</CardTitle>
                      <CardDescription className="text-xs">{section.description}</CardDescription>
                    </div>
                  </div>
                  {sectionDirty && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Modificado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.id === "pharmacy" && (
                  <>
                    <SettingInput setting={settings} k="pharmacy_name" label="Nombre" onChange={handleChange} />
                    <SettingInput setting={settings} k="pharmacy_tagline" label="Eslogan" onChange={handleChange} />
                    <div className="grid grid-cols-2 gap-3">
                      <SettingInput setting={settings} k="pharmacy_nit" label="NIT" onChange={handleChange} />
                      <SettingInput setting={settings} k="pharmacy_phone" label="Teléfono" icon={Phone} onChange={handleChange} />
                    </div>
                    <SettingInput setting={settings} k="pharmacy_address" label="Dirección" icon={MapPin} onChange={handleChange} />
                    <SettingInput setting={settings} k="pharmacy_email" label="Email" icon={Mail} onChange={handleChange} />
                  </>
                )}

                {section.id === "loyalty" && (
                  <>
                    <SettingInput
                      setting={settings}
                      k="points_rate"
                      label="Puntos por dólar (canje)"
                      type="number"
                      hint={`${settings.points_rate || "100"} pts = $1 de descuento en POS`}
                      onChange={handleChange}
                    />
                    <SettingInput
                      setting={settings}
                      k="points_earn_rate"
                      label="Dólares por punto (acumulación)"
                      type="number"
                      hint={`1 pt acumulado por cada $${settings.points_earn_rate || "10"} de compra`}
                      onChange={handleChange}
                    />
                  </>
                )}

                {section.id === "alerts" && (
                  <>
                    <SettingInput
                      setting={settings}
                      k="expiry_warning_days"
                      label="Días para alerta de vencimiento"
                      type="number"
                      hint={`Lotes que vencen en ${settings.expiry_warning_days || "90"} días o menos aparecen como "Por vencer"`}
                      onChange={handleChange}
                    />
                    <SettingInput
                      setting={settings}
                      k="expiry_critical_days"
                      label="Días para vencimiento crítico"
                      type="number"
                      hint={`Lotes que vencen en ${settings.expiry_critical_days || "30"} días o menos aparecen como "Crítico"`}
                      onChange={handleChange}
                    />
                    <SettingInput
                      setting={settings}
                      k="low_stock_threshold"
                      label="Stock mínimo por defecto"
                      type="number"
                      hint="Valor inicial al crear productos nuevos"
                      onChange={handleChange}
                    />
                  </>
                )}

                {section.id === "invoicing" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <SettingInput setting={settings} k="invoice_prefix" label="Prefijo" onChange={handleChange} />
                      <SettingInput setting={settings} k="invoice_start" label="N° inicial" type="number" onChange={handleChange} />
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                      <p>Ejemplo: <span className="font-mono font-semibold text-foreground">{settings.invoice_prefix || "FAC"}-{settings.invoice_start || "1001"}</span></p>
                      <p className="mt-1">Nota: El número de factura actual ya está en uso. Este prefijo se aplica a nuevas facturas si el contador se reinicia.</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview de factura */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Vista previa de factura
          </CardTitle>
          <CardDescription className="text-xs">Así aparecerán los datos en las facturas impresas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed bg-muted/30 p-4 font-mono text-xs max-w-[300px] mx-auto">
            <div className="text-center mb-2">
              <p className="font-bold text-sm">
                <span className="text-primary">{settings.pharmacy_name || "NickPharma"}</span>
              </p>
              <p className="text-muted-foreground">{settings.pharmacy_tagline || "Cuidamos de ti"}</p>
            </div>
            <Separator className="my-2" />
            <div className="space-y-0.5 text-[10px] text-muted-foreground">
              <p>NIT: {settings.pharmacy_nit || "900.123.456-7"}</p>
              <p>Tel: {settings.pharmacy_phone || "+57 601 555 0011"}</p>
              <p>{settings.pharmacy_address || "Calle 123 #45-67, Bogotá"}</p>
              {settings.pharmacy_email && <p>{settings.pharmacy_email}</p>}
            </div>
            <Separator className="my-2" />
            <div className="text-center text-[10px] text-muted-foreground">
              <p>¡Gracias por su compra!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingInput({
  setting,
  k,
  label,
  type = "text",
  hint,
  icon: Icon,
  onChange,
}: {
  setting: Record<string, string>;
  k: string;
  label: string;
  type?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={k} className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative mt-0.5">
        {Icon && <Icon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />}
        <Input
          id={k}
          type={type}
          value={setting[k] ?? ""}
          onChange={(e) => onChange(k, e.target.value)}
          className={cn("h-9 text-sm", Icon && "pl-8")}
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
