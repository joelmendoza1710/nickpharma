# Task 5-C — Frontend Developer

## Task: Error pages + hooks + print + global search

## Work Log

1. Leí `worklog.md` para entender el contexto previo (Tasks 0-ANALYZE-1) y la estructura del proyecto NickPharma.
2. Revisé archivos clave: `app-shell.tsx`, `lib/format.ts`, `lib/nav-store.ts`, `api/settings/pharmacy/route.ts`, `lib/settings.ts`, `api/products/route.ts`, `api/customers/route.ts`, `api/sales/route.ts`, `pos-view.tsx` (ReceiptData type), `layout.tsx`, `ui/dialog.tsx`, `ui/card.tsx`, `ui/button.tsx`, `ui/sonner.tsx`.
3. **Páginas de error (4 archivos)**
   - `src/app/error.tsx` ("use client"): boundary de error con Card de shadcn/ui, icono `AlertCircle` de lucide-react, botón "Reintentar" que llama `reset()` y botón secundario "Ir al inicio".
   - `src/app/loading.tsx`: spinner centrado con texto "Cargando…", `aria-busy` y `sr-only` para accesibilidad.
   - `src/app/not-found.tsx`: 404 con `FileQuestion` de lucide-react, Card y botón "Volver al inicio" usando `window.location.href = "/"`.
   - `src/app/global-error.tsx` ("use client"): boundary global con `<html>`/`<body>` propios y estilos inline (sin Tailwind) — SVG inline de alerta, botones "Reintentar" e "Ir al inicio".
4. **Hooks (3 archivos)**
   - `src/hooks/use-keyboard-shortcuts.ts`: hook genérico `useKeyboardShortcuts(shortcuts)` que registra listener `keydown` con `capture: true`. Soporta sintaxis "Ctrl+k", "Cmd+k", teclas numéricas, "/" (única que funciona dentro de inputs), letras y teclas nombradas (Enter, Escape). Ignora INPUT/TEXTAREA/SELECT/`contentEditable`. Limpieza al desmontar.
   - `src/hooks/use-idle-timeout.ts`: hook `useIdleTimeout(timeoutMinutes)` que rastrea `mousemove`/`keydown`/`click`/`scroll` (con throttle de 1s). 1 min antes del vencimiento muestra toast de advertencia (sonner). Al vencer: `signOut({ redirect: false })` + `window.location.href = "/login"`.
   - `src/hooks/use-connection-status.ts`: hook `useConnectionStatus()` que devuelve `{ status: "online" | "offline" }` usando lazy initializer en `useState` (evita setState-sync-en-effect) y listeners `online`/`offline`.
5. **Página de impresión** `src/app/print/invoice/page.tsx` ("use client"):
   - Lee `sessionStorage.getItem("print-invoice")` y parsea los datos de la venta.
   - Hace fetch paralelo a `/api/settings/pharmacy` para obtener info de la farmacia.
   - Renderiza recibo térmico 80mm: encabezado (nombre, tagline, NIT, teléfono, dirección), factura/fecha/cajero, cliente (o "Consumidor Final"), receta médica (si existe), tabla de items (qty/producto/total), totales (subtotal/impuesto/descuento/descuento por puntos/total), pago y cambio, pie con agradecimiento.
   - Auto-dispara `window.print()` 300ms después de tener todo listo.
   - CSS `@media print` con `@page { size: 80mm auto; margin: 0 }`, oculta `.print-error`, deja solo el `.receipt` sin sombra y con padding mínimo. En pantalla muestra el ticket centrado sobre fondo gris.
   - Usa `formatCurrency` y `formatCurrencyDetailed` importados de `@/lib/format`.
6. **Búsqueda global** `src/components/views/global-search.tsx` ("use client"):
   - Componente `GlobalSearch({ open, onOpenChange })` basado en `Dialog` de shadcn/ui.
   - Input de búsqueda con debounce 220ms que lanza `Promise.allSettled` a `/api/products?q=X&limit=5` y `/api/customers?q=X` en paralelo.
   - Resultados unificados con iconos `Pill` (productos, esmeralda) y `Users` (clientes, sky). Cada hit muestra nombre, metadatos y badge de tipo.
   - Navegación por teclado: `ArrowUp`/`ArrowDown` para mover, `Enter` para seleccionar. Auto-scroll del item activo mediante `scrollIntoView({ block: "nearest" })`.
   - Al seleccionar: `navigate("inventory", { productId })` o `navigate("customers", { customerId })` vía `useNav()`.
   - Estados: loading (spinner), vacío inicial (con kbd de atajos), sin resultados, lista con footer de atajos.
7. **Integración en `app-shell.tsx`**:
   - Importé `useKeyboardShortcuts`, `useIdleTimeout`, `useConnectionStatus`, `GlobalSearch`, `Search` (lucide-react) y `toast` (sonner).
   - Definí `NAV_KEYS_BY_NUMBER` para mapear teclas 1-9 a las primeras 9 vistas.
   - Hook de atajos: `Ctrl+k` abre búsqueda, `1`-`9` navega a las vistas.
   - Hook de inactividad: `useIdleTimeout(15)` (15 min).
   - Hook de conexión: muestra toast al cambiar offline→online y online→offline.
   - Header: añadí botón de búsqueda (icono) — versión compacta en desktop (h-9 w-9) y mobile (icon size). Añadí indicador de conexión (punto verde "En línea" animado / punto rojo "Sin conexión") visible en `sm+`.
   - Renderizo `<GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />` al final del wrapper.
8. **Lint**: primer pase falló con 1 error (`react-hooks/set-state-in-effect` en `use-connection-status.ts`) y 1 warning (`Unused eslint-disable directive` en `use-keyboard-shortcuts.ts`). Corregí ambos:
   - Cambié `useState` con `setState` sincrónico en effect → lazy initializer en `useState(() => ...)`.
   - Eliminé el `eslint-disable-next-line` no usado.
   - Segundo pase: 0 errores, 0 warnings. EXIT=0.
9. **Dev log**: últimas líneas muestran `✓ Compiled in 252ms` y recompilaciones exitosas posteriores. Sin errores de runtime originados por mis cambios (los warnings `NO_SECRET` de next-auth son preexistentes).

## Stage Summary

- **4 páginas de error** creadas: `error.tsx`, `loading.tsx`, `not-found.tsx`, `global-error.tsx` con manejo de `reset()` y mensajes en español.
- **3 hooks** reutilizables: `use-keyboard-shortcuts` (sintaxis tipo "Ctrl+k", ignora inputs excepto "/"), `use-idle-timeout` (logout con aviso previo), `use-connection-status` (online/offline reactivo).
- **1 página de impresión térmica** 80mm con recibo completo, `@media print` que oculta todo excepto el ticket y auto-`window.print()` tras 300ms.
- **1 componente de búsqueda global** Ctrl+K con fetch paralelo a productos+clientes, navegación por teclado, e integración con `useNav().navigate()`.
- **`app-shell.tsx` integrado** con los 3 hooks, búsqueda global, botón de búsqueda en header e indicador de conexión (punto verde "En línea" / rojo "Sin conexión").
- **Lint**: 0 errores, 0 warnings.
- **Dev server**: compila sin errores. Cambios visibles desde la Preview Panel.
