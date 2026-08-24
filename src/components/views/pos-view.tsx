"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  CreditCard,
  Banknote,
  Landmark,
  Check,
  Printer,
  Pill,
  AlertCircle,
  UserPlus,
  Receipt,
  Percent,
  Star,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNav } from "@/lib/nav-store";
import {
  formatCurrency,
  formatCurrencyDetailed,
  getDosageColorClass,
  getPaymentMethodLabel,
} from "@/lib/format";

type Product = {
  id: string;
  name: string;
  activeIngredient: string | null;
  presentation: string | null;
  dosage: string | null;
  barcode: string;
  laboratory: string | null;
  salePrice: number;
  totalStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  requiresPrescription: boolean;
  category: { id: string; name: string; color: string };
  lots: { id: string; lotNumber: string; expiryDate: string; quantity: number; daysToExpiry: number }[];
};

type CartItem = {
  product: Product;
  quantity: number;
};

type Customer = {
  id: string;
  fullName: string;
  document: string | null;
  phone: string | null;
  loyaltyPoints: number;
};

export function PosView() {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [receipt, setReceipt] = React.useState<ReceiptData | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Debounce búsqueda
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Cargar productos
  React.useEffect(() => {
    setLoading(true);
    const url = `/api/products?q=${encodeURIComponent(debouncedQuery)}${debouncedQuery ? "" : "&limit=60"}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery]);

  // Cargar clientes
  React.useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => {});
  }, []);

  // Atajo: foco en búsqueda con "/"
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const addToCart = (product: Product) => {
    if (product.isOutOfStock) {
      toast.error("Producto agotado", {
        description: `${product.name} no tiene stock disponible`,
      });
      return;
    }
    const existing = cart.find((c) => c.product.id === product.id);
    const currentQty = existing?.quantity ?? 0;
    if (currentQty + 1 > product.totalStock) {
      toast.warning("Stock máximo alcanzado", {
        description: `Solo hay ${product.totalStock} unidades disponibles`,
      });
      return;
    }
    setCart((prev) => {
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const next = c.quantity + delta;
          if (next > c.product.totalStock) {
            toast.warning("Stock máximo alcanzado");
            return c;
          }
          return { ...c, quantity: next };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const clamped = Math.max(0, Math.min(qty, c.product.totalStock));
          return { ...c, quantity: clamped };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId("");
  };

  const subtotal = cart.reduce((s, c) => s + c.product.salePrice * c.quantity, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  // Buscar por código de barras exacto (Enter)
  const handleSearchEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const exact = products.find((p) => p.barcode === query.trim());
    if (exact) {
      addToCart(exact);
      toast.success("Producto agregado", {
        description: `${exact.name} ${exact.dosage ?? ""}`,
      });
      setQuery("");
    } else if (products.length === 1) {
      addToCart(products[0]);
      setQuery("");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Catálogo */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchEnter}
                placeholder="Buscar por nombre, sustancia o escanear código de barras…  (tecla “/”)"
                className="h-12 pl-10 pr-24 text-base"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  Enter
                </kbd>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar"
                >
                  {query && <X className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium">No se encontraron productos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Intenta con otro término de búsqueda
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} inCart={cart.find((c) => c.product.id === p.id)?.quantity ?? 0} />
            ))}
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="lg:col-span-2">
        <Card className="lg:sticky lg:top-20 flex flex-col" style={{ maxHeight: "calc(100vh - 6rem)" }}>
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold leading-tight">Carrito</h2>
                <p className="text-xs text-muted-foreground">
                  {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Vaciar
              </Button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ScanLine className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">Carrito vacío</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">
                Escanea o selecciona productos del catálogo para iniciar una venta
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-2">
                <div className="space-y-1.5 py-2">
                  {cart.map((item) => (
                    <CartLine
                      key={item.product.id}
                      item={item}
                      onInc={() => updateQty(item.product.id, 1)}
                      onDec={() => updateQty(item.product.id, -1)}
                      onSet={(q) => setQty(item.product.id, q)}
                      onRemove={() => removeFromCart(item.product.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t p-4 space-y-3">
                {/* Cliente */}
                <CustomerPicker
                  customers={customers}
                  selectedId={selectedCustomerId}
                  onSelect={setSelectedCustomerId}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(subtotal)}</span>
                </div>
                <Button
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={() => setCheckoutOpen(true)}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Cobrar {formatCurrency(subtotal)}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Dialog de pago (paso 2) */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        subtotal={subtotal}
        itemCount={itemCount}
        customerId={selectedCustomerId}
        hasRxProducts={cart.some((c) => c.product.requiresPrescription)}
        availablePoints={
          customers.find((c) => c.id === selectedCustomerId)?.loyaltyPoints ?? 0
        }
        items={cart.map((c) => ({ productId: c.product.id, quantity: c.quantity }))}
        onCompleted={(r) => {
          setCheckoutOpen(false);
          setReceipt(r);
          clearCart();
        }}
      />

      {/* Dialog de recibo (paso 3) */}
      <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  inCart,
}: {
  product: Product;
  onAdd: () => void;
  inCart: number;
}) {
  return (
    <button
      onClick={onAdd}
      disabled={product.isOutOfStock}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed",
        inCart > 0 && "ring-2 ring-primary/40 border-primary/40"
      )}
    >
      {inCart > 0 && (
        <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground shadow">
          {inCart}
        </span>
      )}
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Pill className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate">{product.name}</p>
          {product.activeIngredient && (
            <p className="text-[11px] text-muted-foreground truncate">{product.activeIngredient}</p>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {product.dosage && (
          <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold", getDosageColorClass(product.dosage))}>
            {product.dosage}
          </span>
        )}
        {product.presentation && (
          <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {product.presentation}
          </span>
        )}
        {product.requiresPrescription && (
          <span className="inline-flex rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            Rx
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-base font-bold text-primary">{formatCurrency(product.salePrice)}</p>
          <p className={cn("text-[10px] font-medium", product.isLowStock ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {product.isOutOfStock ? "Agotado" : `${product.totalStock} en stock`}
          </p>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary opacity-0 transition-opacity group-hover:opacity-100">
          <Plus className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function CartLine({
  item,
  onInc,
  onDec,
  onSet,
  onRemove,
}: {
  item: CartItem;
  onInc: () => void;
  onDec: () => void;
  onSet: (q: number) => void;
  onRemove: () => void;
}) {
  const { product, quantity } = item;
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm leading-tight">{product.name}</p>
          {product.dosage && (
            <span className={cn("inline-flex rounded px-1 py-0.5 text-[9px] font-bold", getDosageColorClass(product.dosage))}>
              {product.dosage}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(product.salePrice)} c/u
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={onDec}>
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            value={quantity}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) onSet(v);
            }}
            className="h-6 w-10 px-0 text-center text-sm"
          />
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={onInc}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold text-sm">{formatCurrency(product.salePrice * quantity)}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function CustomerPicker({
  customers,
  selectedId,
  onSelect,
}: {
  customers: Customer[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const cf = customers.find((c) => c.document === "CF");
  const selected = customers.find((c) => c.id === selectedId);
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background">
        <UserPlus className="h-4 w-4 text-muted-foreground" />
      </div>
      <select
        value={selectedId || cf?.id || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="flex-1 bg-transparent text-sm outline-none cursor-pointer"
      >
        <option value={cf?.id || ""}>Consumidor Final</option>
        {customers
          .filter((c) => c.document !== "CF")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName} {c.loyaltyPoints > 0 ? `· ${c.loyaltyPoints} pts` : ""}
            </option>
          ))}
      </select>
      {selected && selected.loyaltyPoints > 0 && (
        <Badge variant="secondary" className="text-[10px]">+{Math.floor((selected.loyaltyPoints))} pts</Badge>
      )}
    </div>
  );
}

type ReceiptData = {
  invoiceNumber: string;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  cashReceived: number | null;
  change: number | null;
  cashierName: string;
  createdAt: string;
  customer: { fullName: string; document: string | null } | null;
  items: {
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: { name: string; dosage: string | null; presentation: string | null };
  }[];
};

const PAYMENT_METHODS = [
  { key: "cash", label: "Efectivo", icon: Banknote },
  { key: "card", label: "Tarjeta", icon: CreditCard },
  { key: "transfer", label: "Transferencia", icon: Landmark },
];

function CheckoutDialog({
  open,
  onOpenChange,
  subtotal,
  itemCount,
  customerId,
  hasRxProducts,
  availablePoints,
  items,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subtotal: number;
  itemCount: number;
  customerId: string;
  hasRxProducts: boolean;
  availablePoints: number;
  items: { productId: string; quantity: number }[];
  onCompleted: (r: ReceiptData) => void;
}) {
  const { data: session } = useSession();
  const [method, setMethod] = React.useState("cash");
  const [cashReceived, setCashReceived] = React.useState<string>("");
  const [processing, setProcessing] = React.useState(false);

  // Points rate from settings (default 100)
  const [pointsRate, setPointsRate] = React.useState(100);
  React.useEffect(() => {
    fetch("/api/settings/pharmacy")
      .then((r) => r.json())
      .then((d) => { if (d.loyalty?.pointsRate) setPointsRate(d.loyalty.pointsRate); })
      .catch(() => {});
  }, []);

  // Descuento manual
  const [manualDiscount, setManualDiscount] = React.useState<string>("");
  // Canje de puntos
  const [usePoints, setUsePoints] = React.useState(false);
  const [pointsToRedeem, setPointsToRedeem] = React.useState<string>("");
  // Receta médica
  const [rxDoctorName, setRxDoctorName] = React.useState("");
  const [rxLicense, setRxLicense] = React.useState("");
  const [rxNumber, setRxNumber] = React.useState("");
  const [rxDate, setRxDate] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setMethod("cash");
      setCashReceived("");
      setManualDiscount("");
      setUsePoints(false);
      setPointsToRedeem("");
      setRxDoctorName("");
      setRxLicense("");
      setRxNumber("");
      setRxDate("");
    }
  }, [open]);

  // Cálculo de descuentos
  const manualDisc = Math.min(Math.max(parseFloat(manualDiscount) || 0, 0), subtotal);
  const maxRedeemablePoints = Math.min(
    availablePoints,
    Math.floor(Math.max(subtotal - manualDisc, 0) * pointsRate)
  );
  const pointsRedeemNum = Math.min(
    Math.max(parseInt(pointsToRedeem) || 0, 0),
    usePoints ? maxRedeemablePoints : 0
  );
  const pointsDiscount =
    usePoints && pointsRedeemNum > 0
      ? Math.min(pointsRedeemNum / pointsRate, Math.max(subtotal - manualDisc, 0))
      : 0;
  const totalDiscount = manualDisc + pointsDiscount;
  const finalTotal = Math.max(subtotal - totalDiscount, 0);

  const cashNum = parseFloat(cashReceived) || 0;
  const change = method === "cash" && cashNum > 0 ? cashNum - finalTotal : 0;

  const quickAmounts = React.useMemo(() => {
    const base = Math.ceil(finalTotal);
    const denoms = [base, Math.ceil(base / 5) * 5, Math.ceil(base / 10) * 10, Math.ceil(base / 20) * 20, Math.ceil(base / 50) * 50];
    return Array.from(new Set(denoms.filter((d) => d >= base))).slice(0, 4);
  }, [finalTotal]);

  // ¿Formulario de receta completo?
  const rxComplete =
    rxDoctorName.trim() !== "" &&
    rxLicense.trim() !== "" &&
    rxNumber.trim() !== "" &&
    rxDate !== "";

  const handleConfirm = async () => {
    // Validar receta médica
    if (hasRxProducts && !rxComplete) {
      toast.error("Receta médica incompleta", {
        description: "Completa los 4 campos de la receta para continuar",
      });
      return;
    }
    // Validar efectivo suficiente
    if (method === "cash" && cashNum < finalTotal) {
      toast.error("Efectivo insuficiente", {
        description: `Faltan ${formatCurrency(finalTotal - cashNum)}`,
      });
      return;
    }
    setProcessing(true);
    try {
      const payload: Record<string, unknown> = {
        items,
        customerId: customerId || null,
        paymentMethod: method,
        cashReceived: method === "cash" ? cashNum : null,
        cashierName: session?.user?.name ?? "Cajero",
        discount: +manualDisc.toFixed(2),
      };
      if (usePoints && pointsRedeemNum > 0) {
        payload.pointsToRedeem = pointsRedeemNum;
      }
      if (hasRxProducts) {
        payload.prescription = {
          doctorName: rxDoctorName.trim(),
          doctorLicense: rxLicense.trim(),
          prescriptionNumber: rxNumber.trim(),
          prescriptionDate: rxDate,
        };
      }
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar la venta");
      toast.success("Venta completada", {
        description: `Factura ${data.sale.invoiceNumber}`,
      });
      onCompleted(data.sale);
    } catch (e: any) {
      toast.error("No se pudo completar la venta", {
        description: e.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Cobrar venta
          </DialogTitle>
          <DialogDescription>Selecciona el método de pago y confirma</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Artículos</span>
              <span className="font-medium">{itemCount}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {manualDisc > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Descuento manual</span>
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  −{formatCurrency(manualDisc)}
                </span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Canje de puntos</span>
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  −{formatCurrency(pointsDiscount)}
                </span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ahorro total</span>
                <Badge variant="secondary" className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(totalDiscount)}
                </Badge>
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total a pagar</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Descuento manual */}
          <div className="space-y-1.5">
            <Label htmlFor="manual-discount" className="text-xs font-medium text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              Descuento manual ($)
            </Label>
            <Input
              id="manual-discount"
              type="number"
              min={0}
              max={subtotal}
              step="0.01"
              value={manualDiscount}
              onChange={(e) => setManualDiscount(e.target.value)}
              placeholder="0.00"
              className="h-10"
            />
            {manualDisc > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Descuento aplicado: {formatCurrency(manualDisc)}
              </p>
            )}
          </div>

          {/* Canje de puntos */}
          {customerId && availablePoints >= pointsRate && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-points" className="text-sm font-medium cursor-pointer">
                  <Star className="h-4 w-4 text-amber-500" />
                  Canjear puntos
                </Label>
                <Switch
                  id="use-points"
                  checked={usePoints}
                  onCheckedChange={(v) => {
                    setUsePoints(v);
                    if (v) {
                      setPointsToRedeem(String(maxRedeemablePoints));
                    } else {
                      setPointsToRedeem("");
                    }
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {availablePoints} pts disponibles · {pointsRate} pts = $1 · Máx. canje: {maxRedeemablePoints} pts
              </p>
              {usePoints && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={maxRedeemablePoints}
                    step="100"
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(e.target.value)}
                    className="h-9"
                  />
                  <span className="whitespace-nowrap text-sm font-medium text-amber-700 dark:text-amber-300">
                    −{formatCurrency(pointsDiscount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Receta médica */}
          {hasRxProducts && (
            <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900 dark:bg-rose-950/20">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-rose-700 dark:text-rose-300">
                  <FileText className="h-4 w-4" />
                  Receta médica
                </Label>
                <Badge variant="secondary" className="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  Rx requerida
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                El carrito incluye productos controlados. Completa todos los campos.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="rx-doctor" className="text-xs">Nombre del médico</Label>
                  <Input
                    id="rx-doctor"
                    value={rxDoctorName}
                    onChange={(e) => setRxDoctorName(e.target.value)}
                    placeholder="Dr. ..."
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rx-license" className="text-xs">Licencia</Label>
                  <Input
                    id="rx-license"
                    value={rxLicense}
                    onChange={(e) => setRxLicense(e.target.value)}
                    placeholder="N° licencia"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rx-number" className="text-xs">N° receta</Label>
                  <Input
                    id="rx-number"
                    value={rxNumber}
                    onChange={(e) => setRxNumber(e.target.value)}
                    placeholder="N°"
                    className="h-9"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="rx-date" className="text-xs">Fecha de receta</Label>
                  <Input
                    id="rx-date"
                    type="date"
                    value={rxDate}
                    onChange={(e) => setRxDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              {!rxComplete && (
                <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Completa los 4 campos para continuar
                </p>
              )}
            </div>
          )}

          {/* Método de pago */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Efectivo */}
          {method === "cash" && (
            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Efectivo recibido</label>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0"
                  className="mt-1 h-11 text-lg font-semibold"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setCashReceived(String(amt))}
                    className="flex-1 min-w-[70px]"
                  >
                    {formatCurrency(amt)}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCashReceived(String(finalTotal))}>
                  Exacto
                </Button>
              </div>
              {cashNum > 0 && (
                <div className={cn(
                  "flex items-center justify-between rounded-lg p-3",
                  change >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
                )}>
                  <span className={cn("font-medium text-sm", change >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                    {change >= 0 ? "Cambio a devolver" : "Faltante"}
                  </span>
                  <span className={cn("text-lg font-bold", change >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                    {formatCurrency(Math.abs(change))}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            size="lg"
            className="w-full h-12"
            onClick={handleConfirm}
            disabled={
              processing ||
              (hasRxProducts && !rxComplete) ||
              (method === "cash" && cashNum < finalTotal)
            }
          >
            {processing ? (
              <>Procesando…</>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Confirmar pago · {formatCurrency(finalTotal)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ receipt, onClose }: { receipt: ReceiptData | null; onClose: () => void }) {
  const { navigate } = useNav();
  const [pharmacy, setPharmacy] = React.useState<{ name: string; tagline: string; nit: string; phone: string; address: string; email: string } | null>(null);

  React.useEffect(() => {
    fetch("/api/settings/pharmacy")
      .then((r) => r.json())
      .then((d) => setPharmacy(d.pharmacy ?? null))
      .catch(() => {});
  }, []);

  if (!receipt) return null;

  return (
    <Dialog open={!!receipt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="h-5 w-5" />
            </div>
            Venta exitosa
          </DialogTitle>
          <DialogDescription>Factura generada correctamente</DialogDescription>
        </DialogHeader>

        {/* Recibo estilo ticket */}
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 font-mono text-xs">
          <div className="text-center mb-3">
            <p className="font-bold text-sm text-primary">
              {pharmacy?.name ?? "NickPharma"}
            </p>
            <p className="text-muted-foreground">{pharmacy?.tagline ?? "Cuidamos de ti"}</p>
            <p className="text-muted-foreground">NIT {pharmacy?.nit ?? "900.123.456-7"}</p>
            {pharmacy?.phone && <p className="text-muted-foreground">Tel: {pharmacy.phone}</p>}
            {pharmacy?.address && <p className="text-muted-foreground">{pharmacy.address}</p>}
            {pharmacy?.email && <p className="text-muted-foreground">{pharmacy.email}</p>}
          </div>
          <div className="space-y-0.5 border-y border-dashed py-2 my-2">
            <div className="flex justify-between">
              <span>Factura:</span>
              <span className="font-bold">{receipt.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Fecha:</span>
              <span>{new Date(receipt.createdAt).toLocaleString("es-CO")}</span>
            </div>
            <div className="flex justify-between">
              <span>Cajero:</span>
              <span>{receipt.cashierName}</span>
            </div>
            {receipt.customer && (
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span>{receipt.customer.fullName}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            {receipt.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="flex-1">
                  {it.quantity}x {it.product.name} {it.product.dosage ?? ""}
                </span>
                <span>{formatCurrencyDetailed(it.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed mt-2 pt-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrencyDetailed(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impuesto:</span>
              <span>{formatCurrencyDetailed(receipt.taxTotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL:</span>
              <span>{formatCurrencyDetailed(receipt.total)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Pago ({getPaymentMethodLabel(receipt.paymentMethod)}):</span>
              <span>{formatCurrencyDetailed(receipt.cashReceived ?? receipt.total)}</span>
            </div>
            {receipt.change != null && receipt.change > 0 && (
              <div className="flex justify-between">
                <span>Cambio:</span>
                <span>{formatCurrencyDetailed(receipt.change)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => {
            sessionStorage.setItem("print-invoice", JSON.stringify(receipt));
            window.open("/print/invoice", "_blank", "width=420,height=640");
          }}>
            <Printer className="h-4 w-4 mr-1.5" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onClose();
              navigate("sales");
            }}
          >
            <Receipt className="h-4 w-4 mr-1.5" />
            Ver ventas
          </Button>
          <Button className="flex-1" onClick={() => { onClose(); navigate("pos"); }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva venta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
