# Task 5-A: Inventory dialogs + barcode scan

## Resumen
Añadidas 5 funcionalidades al módulo de Inventario:
1. Diálogo de detalle de producto con 4 tabs (General/Lotes/Movimientos/Ventas) + ajuste de stock interno.
2. Diálogo de crear/editar producto con cálculo de margen en vivo y lote inicial opcional.
3. Diálogo de movimientos de inventario con filtros, KPIs y exportación CSV.
4. Escaneo de código de barras (overlay fullscreen con shortcut "S").
5. Nombres de productos clicables → abren detalle; botones "Escanear", "Movimientos" y "Nuevo" en toolbar.

## Archivos
- **Nuevos (3)**:
  - `src/components/views/product-detail-dialog.tsx` (~640 líneas)
  - `src/components/views/product-form-dialog.tsx` (~490 líneas)
  - `src/components/views/stock-movements-dialog.tsx` (~270 líneas)
- **Modificados (1)**:
  - `src/components/views/inventory-view.tsx` (526 → 789 líneas)

## Cambios clave

### product-detail-dialog.tsx
- Props: `productId`, `onClose`, `onEdit?`, `onAddLot?`, `onAdjusted?`.
- 4 tabs en `ScrollArea` dentro de `Dialog sm:max-w-4xl max-h-[92vh]`.
- **General**: stock card color-coded (rose/amber/emerald), 3 KPIs (KpiCard), ficha técnica grid, precios con margin Badge, bar chart Recharts (6 meses), botones Editar/Agregar lote/Ajustar stock.
- **Lotes**: tarjetas con número, badge días (getExpiryStatus), Progress de consumo.
- **Movimientos**: timeline vertical con dots color (in=emerald, out=rose, adjustment=amber, return=sky), icono, cantidad con signo y color, saldo, referencia, usuario, fecha.
- **Ventas**: lista con Receipt icon, factura, fecha, cliente, qty×precio, total.
- **AdjustStockDialog interno**: input nuevo stock + diff en vivo + Textarea motivo → POST `/api/products/[id]/adjust-stock`.
- Tipado defensivo: optional chaining + `?? []` / `?? 0` para tolerar respuesta enriquecida o básica.

### product-form-dialog.tsx
- Props: `open`, `onOpenChange`, `product: ProductFormData | null`, `categories`, `onSaved?`, `onCategoryCreated?`.
- 5 secciones: Identificación, Clasificación, Precios y rentabilidad, Inventario y regulación, Lote inicial (solo crear).
- Campos: name, activeIngredient, presentation, dosage, barcode, laboratory, salePrice, costPrice, minStock, taxRate (%), categoryId (Select + botón "+" → AlertDialog inline para crear categoría), requiresPrescription (Switch), initialLot opcional.
- Margen en vivo (unit + %) con Badge color (≥30 emerald, ≥10 amber, <10 rose).
- POST `/api/products` (crear) o PATCH `/api/products/[id]` (editar).
- Exporta tipos `ProductFormData` y `CategoryOption`.

### stock-movements-dialog.tsx
- Props: `open`, `onOpenChange`.
- Filtros: Select tipo + inputs date from/to + botones Actualizar/CSV.
- 4 KPIs: Entradas (verde), Salidas (rosa), Ajustes (amber), Devoluciones (cyan).
- Tabla scrollable con header sticky, Badges color por tipo, cantidad con signo y color.
- CSV export client-side (Blob + `<a download>`, BOM UTF-8, nombre `movimientos-YYYY-MM-DD.csv`).
- Fetch `/api/stock-movements?limit=500&type=&from=&to=`.

### inventory-view.tsx
- Imports: `ScanLine, X, Scale, Barcode` de lucide; los 3 nuevos diálogos + tipos.
- Estado nuevo: `detailProductId`, `formOpen`, `editingProduct`, `movementsOpen`, `scanOpen`, `categories`.
- `loadCategories()` ejecutado en mount.
- useEffect keyboard shortcut: `S` abre scan (no en input/textarea/select/contentEditable, ni si diálogo abierto), `ESC` cierra scan.
- Callbacks: `handleEditFromDetail` (fetch + setEditingProduct + formOpen), `handleAddLotFromDetail` (busca item, setAddLotFor), `openByBarcode` (match exacto → detail o toast error).
- Toolbar: botones Escanear / Movimientos / Nuevo / Refresh.
- Filas: icono Pill + nombre ahora son `<button>` con hover:text-primary hover:underline → abren detalle.
- Render final: ProductDetailDialog (onEdit/onAddLot/onAdjusted=load), ProductFormDialog (onSaved=load+loadCategories, onCategoryCreated=append), StockMovementsDialog, ScanOverlay.
- ScanOverlay: fullscreen `z-[60]`, header + panel dashed + input grande (h-14, text-2xl, font-mono) + autoFocus + Enter para buscar + ESC para cerrar + botón Buscar.

## Validación
- `bun run lint`: 0 errores, 0 warnings.
- `npx eslint` sobre los 4 archivos: limpio (exit 0).
- Dev server compila sin errores (`✓ Compiled in 549ms`).
- Sin regresiones: AddLotDialog existente, filtros Tabs, búsqueda, KPIs siguen funcionando.

## Notas para siguientes agentes
- **5-B (Backend)**: se asume que enriquecerá `/api/products/[id]` con `stockMovements[]`, `recentSales[]`, `byMonth[]`, `stats{}`, `totalStock`, `activeLotCount`, `stockValue`, `retailValue`. Mientras tanto, el UI usa optional chaining y muestra "Sin datos" graceful.
- `ProductFormData` y `CategoryOption` están exportados desde `product-form-dialog.tsx` para reutilización.
- El escaneo hace match **exacto** de barcode en el array local `items` (sin llamada API). Si se requiere buscar en DB (porque el producto no está en la página actual), se podría cambiar a `fetch(/api/products?q=...)`.
