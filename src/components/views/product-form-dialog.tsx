"use client";

import * as React from "react";
import {
  Pill,
  Barcode,
  Building2,
  Tag,
  Percent,
  DollarSign,
  TrendingUp,
  Loader2,
  Plus,
  Save,
  Package,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export type ProductFormData = {
  id: string;
  name: string;
  activeIngredient?: string | null;
  presentation?: string | null;
  dosage?: string | null;
  barcode: string;
  laboratory?: string | null;
  salePrice: number;
  costPrice: number;
  minStock: number;
  requiresPrescription: boolean;
  taxRate: number;
  categoryId: string;
  category?: { id: string; name: string; color: string } | null;
  cum?: string | null;
  invimaRegistration?: string | null;
  invimaExpiryDate?: string | null;
  therapeuticAction?: string | null;
};

export type CategoryOption = {
  id: string;
  name: string;
  color?: string;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
  onCategoryCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: ProductFormData | null;
  categories: CategoryOption[];
  onSaved?: (product: ProductFormData) => void;
  onCategoryCreated?: (category: CategoryOption) => void;
}) {
  const isEdit = !!product;

  const [name, setName] = React.useState("");
  const [activeIngredient, setActiveIngredient] = React.useState("");
  const [presentation, setPresentation] = React.useState("");
  const [dosage, setDosage] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [laboratory, setLaboratory] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [minStock, setMinStock] = React.useState("10");

  // Fetch low_stock_threshold from settings for default value
  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const threshold = d.settings?.find((s: any) => s.key === "low_stock_threshold");
        if (threshold && !isEdit) setMinStock(threshold.value);
      })
      .catch(() => {});
  }, [isEdit]);
  const [taxRate, setTaxRate] = React.useState("0");
  const [categoryId, setCategoryId] = React.useState("");
  const [requiresPrescription, setRequiresPrescription] = React.useState(false);

  // Registro INVIMA
  const [cum, setCum] = React.useState("");
  const [invimaRegistration, setInvimaRegistration] = React.useState("");
  const [invimaExpiryDate, setInvimaExpiryDate] = React.useState("");
  const [therapeuticAction, setTherapeuticAction] = React.useState("");

  // Initial lot (only when creating)
  const [hasInitialLot, setHasInitialLot] = React.useState(false);
  const [lotNumber, setLotNumber] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [lotQty, setLotQty] = React.useState("");

  // New category inline
  const [newCatOpen, setNewCatOpen] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");
  const [creatingCat, setCreatingCat] = React.useState(false);

  const [saving, setSaving] = React.useState(false);

  // Reset form when dialog opens / product changes
  React.useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setActiveIngredient(product.activeIngredient ?? "");
      setPresentation(product.presentation ?? "");
      setDosage(product.dosage ?? "");
      setBarcode(product.barcode);
      setLaboratory(product.laboratory ?? "");
      setSalePrice(String(product.salePrice ?? ""));
      setCostPrice(String(product.costPrice ?? ""));
      setMinStock(String(product.minStock ?? 10));
      setTaxRate(String((product.taxRate ?? 0) * 100));
      setCategoryId(product.categoryId ?? product.category?.id ?? "");
      setRequiresPrescription(!!product.requiresPrescription);
      setCum(product.cum ?? "");
      setInvimaRegistration(product.invimaRegistration ?? "");
      setInvimaExpiryDate(product.invimaExpiryDate ? product.invimaExpiryDate.slice(0, 10) : "");
      setTherapeuticAction(product.therapeuticAction ?? "");
      setHasInitialLot(false);
      setLotNumber("");
      setExpiryDate("");
      setLotQty("");
    } else {
      setName("");
      setActiveIngredient("");
      setPresentation("");
      setDosage("");
      setBarcode("");
      setLaboratory("");
      setSalePrice("");
      setCostPrice("");
      setMinStock("10");
      setTaxRate("0");
      setCategoryId(categories[0]?.id ?? "");
      setRequiresPrescription(false);
      setCum("");
      setInvimaRegistration("");
      setInvimaExpiryDate("");
      setTherapeuticAction("");
      setHasInitialLot(false);
      setLotNumber("");
      setExpiryDate("");
      setLotQty("");
    }
  }, [open, product, categories]);

  // Derived values
  const saleNum = parseFloat(salePrice || "0") || 0;
  const costNum = parseFloat(costPrice || "0") || 0;
  const marginUnit = saleNum - costNum;
  const marginPct = saleNum > 0 ? (marginUnit / saleNum) * 100 : 0;
  const taxNum = (parseFloat(taxRate || "0") || 0) / 100;

  const handleCreateCategory = async () => {
    if (newCatName.trim().length < 1) {
      toast.error("Ingresa un nombre para la categoría");
      return;
    }
    setCreatingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          color: "primary",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo crear la categoría");
      }
      const json = await res.json();
      toast.success("Categoría creada", { description: newCatName.trim() });
      setCategoryId(json.category.id);
      setNewCatName("");
      setNewCatOpen(false);
      onCategoryCreated?.(json.category as CategoryOption);
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally {
      setCreatingCat(false);
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) return "El nombre es obligatorio";
    if (!barcode.trim()) return "El código de barras es obligatorio";
    if (!categoryId) return "Selecciona una categoría";
    if (saleNum < 0) return "El precio de venta no puede ser negativo";
    if (costNum < 0) return "El costo no puede ser negativo";
    if (parseInt(minStock || "0", 10) < 0) return "El stock mínimo no puede ser negativo";
    if (taxNum < 0 || taxNum > 1) return "El IVA debe estar entre 0 y 100";
    if (!isEdit && hasInitialLot) {
      if (!lotNumber.trim()) return "Ingresa el número de lote";
      if (!expiryDate) return "Selecciona la fecha de vencimiento del lote";
      const q = parseInt(lotQty || "0", 10);
      if (isNaN(q) || q <= 0) return "La cantidad del lote debe ser mayor a 0";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const basePayload: any = {
      name: name.trim(),
      activeIngredient: activeIngredient.trim() || null,
      presentation: presentation.trim() || null,
      dosage: dosage.trim() || null,
      barcode: barcode.trim(),
      laboratory: laboratory.trim() || null,
      salePrice: saleNum,
      costPrice: costNum,
      minStock: parseInt(minStock || "0", 10) || 0,
      requiresPrescription,
      taxRate: taxNum,
      categoryId,
      cum: cum.trim() || null,
      invimaRegistration: invimaRegistration.trim() || null,
      invimaExpiryDate: invimaExpiryDate || null,
      therapeuticAction: therapeuticAction.trim() || null,
    };

    if (!isEdit && hasInitialLot) {
      basePayload.initialLot = {
        lotNumber: lotNumber.trim(),
        expiryDate,
        quantity: parseInt(lotQty || "0", 10),
      };
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo guardar el producto");
      }
      const json = await res.json();
      toast.success(isEdit ? "Producto actualizado" : "Producto creado", {
        description: name.trim(),
      });
      onSaved?.(json.product as ProductFormData);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error al guardar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              {isEdit ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Actualiza los datos del producto."
                : "Registra un nuevo producto en el inventario."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Identificación */}
            <Section title="Identificación" icon={Package}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nombre" required className="sm:col-span-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Acetaminofén"
                    autoFocus
                  />
                </Field>
                <Field label="Principio activo">
                  <Input
                    value={activeIngredient}
                    onChange={(e) => setActiveIngredient(e.target.value)}
                    placeholder="Ej. Paracetamol"
                  />
                </Field>
                <Field label="Presentación">
                  <Input
                    value={presentation}
                    onChange={(e) => setPresentation(e.target.value)}
                    placeholder="Caja x 20 tabletas"
                  />
                </Field>
                <Field label="Dosis / Concentración">
                  <Input
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="500mg, 5mg/5ml…"
                  />
                </Field>
                <Field label="Código de barras" required>
                  <div className="relative">
                    <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="7501000001234"
                      className="pl-8"
                    />
                  </div>
                </Field>
              </div>
            </Section>

            {/* Categoría y laboratorio */}
            <Section title="Clasificación" icon={Tag}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Categoría" required>
                  <div className="flex gap-2">
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setNewCatOpen(true)}
                      aria-label="Nueva categoría"
                      title="Nueva categoría"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>
                <Field label="Laboratorio">
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={laboratory}
                      onChange={(e) => setLaboratory(e.target.value)}
                      placeholder="Ej. Genfar"
                      className="pl-8"
                    />
                  </div>
                </Field>
              </div>
            </Section>

            {/* Precios */}
            <Section title="Precios y rentabilidad" icon={DollarSign}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Costo">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Precio de venta" required>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="IVA (%)">
                  <div className="relative">
                    <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="0"
                      className="pl-8"
                    />
                  </div>
                </Field>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Margen unitario
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(marginUnit)}</span>
                  <Badge
                    className={cn(
                      "font-semibold",
                      marginPct >= 30
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                        : marginPct >= 10
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                    )}
                  >
                    {marginPct.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </Section>

            {/* Stock mínimo y receta */}
            <Section title="Inventario y regulación" icon={Layers}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Stock mínimo (alerta)">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </Field>
                <div className="flex items-end pb-2">
                  <div className="flex items-center justify-between w-full rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Requiere receta</p>
                      <p className="text-xs text-muted-foreground">Medicamento controlado</p>
                    </div>
                    <Switch
                      checked={requiresPrescription}
                      onCheckedChange={setRequiresPrescription}
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Registro INVIMA */}
            <Section title="Registro INVIMA" icon={ShieldCheck}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="CUM">
                  <Input
                    value={cum}
                    onChange={(e) => setCum(e.target.value)}
                    placeholder="Ej. 20012345-1"
                  />
                </Field>
                <Field label="Registro INVIMA">
                  <Input
                    value={invimaRegistration}
                    onChange={(e) => setInvimaRegistration(e.target.value)}
                    placeholder="Ej. INVIMA 2018M-0012345"
                  />
                </Field>
                <Field label="Venc. Registro">
                  <Input
                    type="date"
                    value={invimaExpiryDate}
                    onChange={(e) => setInvimaExpiryDate(e.target.value)}
                  />
                </Field>
                <Field label="Acción Terapéutica">
                  <Input
                    value={therapeuticAction}
                    onChange={(e) => setTherapeuticAction(e.target.value)}
                    placeholder="Ej. Analgésico, Antihipertensivo"
                  />
                </Field>
              </div>
            </Section>

            {/* Lote inicial (solo crear) */}
            {!isEdit && (
              <Section title="Lote inicial (opcional)" icon={Layers}>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2 mb-3">
                  <div>
                    <p className="text-sm font-medium">Registrar lote inicial</p>
                    <p className="text-xs text-muted-foreground">
                      Activa para ingresar stock inicial al crear el producto
                    </p>
                  </div>
                  <Switch checked={hasInitialLot} onCheckedChange={setHasInitialLot} />
                </div>
                {hasInitialLot && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Número de lote" required>
                      <Input
                        value={lotNumber}
                        onChange={(e) => setLotNumber(e.target.value)}
                        placeholder="L-2024-0001"
                      />
                    </Field>
                    <Field label="Vencimiento" required>
                      <Input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </Field>
                    <Field label="Cantidad" required>
                      <Input
                        type="number"
                        min={1}
                        value={lotQty}
                        onChange={(e) => setLotQty(e.target.value)}
                        placeholder="0"
                      />
                    </Field>
                  </div>
                )}
              </Section>
            )}
          </div>

          <DialogFooter className="pt-2 border-t mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Guardando…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  {isEdit ? "Guardar cambios" : "Crear producto"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New category inline dialog */}
      <AlertDialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Nueva categoría
            </AlertDialogTitle>
            <AlertDialogDescription>
              Crea una categoría para clasificar productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="catName">Nombre</Label>
            <Input
              id="catName"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ej. Cuidado personal"
              autoFocus
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateCategory();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingCat}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCreateCategory();
              }}
              disabled={creatingCat || !newCatName.trim()}
            >
              {creatingCat ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creando…
                </>
              ) : (
                "Crear"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------- Helpers ----------

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="rounded-lg border bg-card p-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
