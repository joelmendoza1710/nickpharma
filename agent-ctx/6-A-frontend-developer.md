# Task 6-A — Dashboard actionable alerts

## Goal
Replace the 4 static `AlertRow` rows in the dashboard's "Alertas operativas" card with an expandable, actionable `AlertsPanel` that lists specific products/lotes needing attention (from the new `alerts` field returned by `GET /api/dashboard`).

## File modified
- `src/components/views/dashboard-view.tsx` (only file touched, per task constraint)

## Changes
1. **Imports**: added `ChevronDown`, `XCircle`, `Clock`, `Pill`, `ChevronRight` (lucide); added `formatDate` from `@/lib/format`; added `cn` from `@/lib/utils`. Removed now-unused `CalendarClock`, `Boxes`.
2. **Types**: added `alerts` block to `DashboardData` (lowStock, outOfStock, expiringSoon, expired). Introduced `LowStockItem`, `OutOfStockItem`, `ExpiryItem`, `AlertsData`, `AlertSectionKey` types.
3. **Removed** the old `AlertRow` component.
4. **Added `AlertsPanel`**: 4 collapsible sections (Stock bajo/amber/Package, Agotados/rose/XCircle, Próximos a vencer/amber/Clock, Vencidos/rose/AlertTriangle). `useState<AlertSectionKey | null>` for single-open toggle. Each section header is a button with icon + label + count badge + `ChevronDown` that rotates 180° when open. Sections with 0 items are disabled (opacity-50, cursor-not-allowed, no chevron, no click). Expanded body shows a `max-h-[200px] overflow-y-auto` list of `AlertProductRow`s.
5. **Added `AlertProductRow`**: per-section rendering — Pill icon, product name, dosage badge (`getDosageColorClass`), contextual detail (category+min for stock sections; lot+quantity+date for expiry sections via `formatDate`), color-coded right-side badge (amber outline for lowStock/expiringSoon, destructive for outOfStock/expired), trailing `ChevronRight`. Whole row is a button → calls `onNavigate`.
6. **Card body** now renders `<AlertsPanel alerts={data.alerts} onNavigate={() => navigate("inventory")} />` plus the existing "Ver inventario completo" button.
7. Header badge total (`k.lowStockCount + k.outOfStockCount + k.expiringSoonCount`) preserved.

## Verification
- `bun run lint` → passes (no errors).
- Dev log inspected: only pre-existing login-button error; no new dashboard compile errors.

## Notes for downstream agents
- `data.alerts` is now expected from the dashboard API; if the API shape changes, update the `alerts` type in `DashboardData` and the per-section render branches in `AlertProductRow`.
- The header total still excludes `expiredCount` to preserve prior behavior — if a future task wants expired included in the header badge, sum it in `totalAlerts`.
