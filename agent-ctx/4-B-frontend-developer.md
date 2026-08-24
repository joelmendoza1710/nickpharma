# Task 4-B: POS checkout — Recetas / Puntos / Descuentos

## Resumen
Añadidas 3 funcionalidades al `CheckoutDialog` de `src/components/views/pos-view.tsx` que el backend ya soportaba pero el UI no exponía: recetas médicas obligatorias, canje de puntos y descuento manual.

## Archivo modificado
- `src/components/views/pos-view.tsx` (851 → 1092 líneas)

## Cambios clave
1. **Imports**: añadidos `Percent`, `Star`, `FileText` (lucide) + `Label`, `Switch` (shadcn/ui).
2. **Props nuevos** en `CheckoutDialog`: `hasRxProducts: boolean`, `availablePoints: number`, pasados desde `PosView` (cart.some Rx + loyaltyPoints del cliente seleccionado).
3. **Estado nuevo** (7 vars): `manualDiscount`, `usePoints`, `pointsToRedeem`, `rxDoctorName`, `rxLicense`, `rxNumber`, `rxDate`. Todas se resetean en el `useEffect([open])`.
4. **Cálculo reactivo**: `manualDisc` (cap a subtotal) → `maxRedeemablePoints` → `pointsRedeemNum` → `pointsDiscount` (pts/100) → `totalDiscount` → `finalTotal`.
5. **UI**: 3 bloques nuevos antes del método de pago:
   - Descuento manual (siempre visible, input numérico con max=subtotal).
   - Canjear puntos (condicional customerId && availablePoints >= 100, Switch + input que se auto-rellena con máx. puntos canjeables).
   - Receta médica (condicional hasRxProducts, grid 4 campos, Badge "Rx requerida").
6. **Resumen actualizado**: muestra Subtotal, Descuento manual, Canje de puntos, Ahorro total (Badge) y Total a pagar (finalTotal).
7. **handleConfirm**: validación temprana de Rx (toast.error si incompleta) + payload dinámico con `discount`, `pointsToRedeem` y `prescription` (objeto con 4 campos).
8. **Botón confirmar**: deshabilitado si `hasRxProducts && !rxComplete` o efectivo < finalTotal. Muestra `finalTotal`.

## Validación
- `bun run lint`: 0 errores en `pos-view.tsx`. (El único error reportado es en `customers-view.tsx`, otro módulo.)
- `npx eslint src/components/views/pos-view.tsx`: limpio.
- Dev server compila sin errores (verificado en `dev.log`).

## Sin regresiones
El flujo original (sin Rx, sin cliente con puntos, sin descuento) sigue idéntico: los nuevos bloques son condicionales y `discount` siempre se envía (default 0).
