# Task ID: 8-A
**Agent**: frontend-developer
**Task**: Add SupplierDetailDialog to `src/components/views/suppliers-view.tsx` showing metrics and details when clicking a supplier card.

## Context Reviewed
- Read `/home/z/my-project/worklog.md` (tasks 0–7-C) — VitaliaPOS pharmacy system, suppliers view already exists with supplier cards + orders table.
- Read `/home/z/my-project/src/components/views/suppliers-view.tsx` (~127 lines before edits).
- Read `/home/z/my-project/src/app/api/suppliers/[id]/route.ts` — confirmed response shape: `{ supplier, metrics: { totalOrders, receivedCount, cancelledCount, pendingCount, totalPurchased, avgDeliveryDays, productsCount, lastOrderDate }, recentOrders, productsSupplied }`. PATCH accepts `{ active: boolean }`.
- Read `/home/z/my-project/src/lib/format.ts` — `formatCurrency` uses COP `es-CO`, `formatDate` returns `es-CO` short date.
- Read `/home/z/my-project/src/components/ui/tabs.tsx` — exports `Tabs, TabsList, TabsTrigger, TabsContent`.
- Read `/home/z/my-project/src/components/views/product-detail-dialog.tsx` for style reference (uses `sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0` dialog pattern with bordered header + tab strip + scrollable content).

## Work Log
Only `src/components/views/suppliers-view.tsx` was edited (no new files). Changes applied via MultiEdit:

1. **Imports**
   - Extended lucide-react import with: `ChevronRight, Phone, Mail, MapPin, Building2, Clock, DollarSign, AlertCircle, XCircle`.
   - Added `TabsContent` to the `@/components/ui/tabs` import.
   - Added `import { cn } from "@/lib/utils";`.
   - `formatCurrency, formatDate` from `@/lib/format` and `toast` from `sonner` were already imported and reused. `Badge, Button, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Card, CardContent` already imported and reused.

2. **New state** in `SuppliersView`:
   - `const [detailSupplierId, setDetailSupplierId] = React.useState<string | null>(null);`

3. **Card click behavior changed**
   - Old: `onClick={() => { setEditSupplier(s); setSupplierDialog(true); }}`
   - New: `onClick={() => setDetailSupplierId(s.id)}` — opens detail dialog instead of edit form.
   - Added `transition-shadow` class and a `<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />` indicator at the end of the card header row.

4. **`<SupplierDetailDialog>` mounted** in the main JSX (after `ReceiveDialog`):
   - Props: `supplierId={detailSupplierId}`, `onClose`, `onEdit` (closes detail, sets `editSupplier`, opens `supplierDialog`), `onMutated={load}`.

5. **`SupplierDetailDialog` component** added (placed before `ReceiveDialog`):
   - State: `data`, `loading`, `tab` (`"general"` default), `toggling`.
   - `useEffect` keyed on `supplierId` → fetches `GET /api/suppliers/[id]`, shows toast on error.
   - `handleToggle`: `PATCH /api/suppliers/[id]` with `{ active: !supplier.active }`, toast on success/error, re-fetches detail, calls `onMutated()`.
   - Dialog layout: `sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0` with bordered header showing Truck icon + name + Activo/Inactivo badge + order count description.
   - Loading skeleton (4 KPI cards + content skeleton) while fetching.
   - 3 tabs with counts in triggers:
     - **General**: 4 KPI cards (`Total comprado` / `Órdenes totales` / `Entrega prom.` / `Productos`), 3 status cards (`Recibidas` emerald / `Pendientes` amber / `Canceladas` rose), contact info card (Contacto, NIT, Teléfono, Email, Dirección if present, Última orden), and 2 buttons (`Editar` outline, `Activar`/`Desactivar` emerald when activating).
     - **Órdenes**: list of `recentOrders.slice(0, 10)` with orderNumber + status Badge (`STATUS_CONFIG` reused), date (`orderedAt ?? createdAt`), itemCount, totalQty, total. Empty state with ShoppingCart icon.
     - **Productos**: list of `productsSupplied` with name + dosage Badge + totalReceived + lastOrder date + totalSpent. Empty state with Package icon.
   - Editar button calls `onEdit(supplier)` which closes detail and opens `SupplierFormDialog` with that supplier.
   - `cn` used for conditional class on Activar/Desactivar button and status badges.

6. **Lint**: `bun run lint` → exit 0, no errors/warnings.

## Stage Summary
- Supplier cards now open a rich detail dialog (3 tabs) instead of jumping straight to the edit form.
- Edit action moved inside the detail dialog as an "Editar" button (closes detail → opens existing `SupplierFormDialog`).
- Detail dialog fetches metrics + recent orders + supplied products from `GET /api/suppliers/[id]` (already implemented by backend).
- Activar/Desactivar toggle uses `PATCH /api/suppliers/[id]` with `{ active: !active }`, shows toast, refreshes detail and triggers list reload via `onMutated`.
- Existing `SupplierFormDialog`, `OrderDialog`, `ReceiveDialog` left untouched.
- No new files created; only `src/components/views/suppliers-view.tsx` edited.
