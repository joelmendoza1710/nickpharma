# ARCHITECTURE.md — NickPharma

> **Memoria a largo plazo.** Fuente de verdad para arquitectura, stack y reglas de desarrollo.

---

## 1. Propósito

**NickPharma** — Sistema de Gestión de Farmacia full-stack: POS, inventario con trazabilidad de lotes/vencimientos, clientes con lealtad, caja/arqueo, proveedores con OC, usuarios/roles, auditoría con 18 operaciones registradas, reportes analíticos. Cumple requisitos regulatorios (recetas médicas, trazabilidad de medicamentos controlados, ajustes de inventario).

---

## 2. Stack (NO NEGOCIABLE)

- **Framework**: Next.js 16 App Router + TypeScript 5 estricto
- **Runtime**: Bun, puerto 3000
- **UI**: Tailwind CSS 4 (oklch) + shadcn/ui (New York) + Lucide
- **Estado**: Zustand (`src/lib/nav-store.ts`) — NO Redux
- **ORM**: Prisma 6 + SQLite (`src/lib/db.ts`)
- **Auth**: NextAuth v4 (CredentialsProvider, JWT, bcrypt, lockout tras 5 intentos)
- **Validación**: Zod (`src/lib/schemas.ts`)
- **Gráficos**: Recharts
- **Toasts**: Sonner (NO Radix Toast)
- **SDK AI**: z-ai-web-dev-sdk (SOLO backend)
- **Settings**: `src/lib/settings.ts` (getTypedSettings + caché 60s + invalidate)

---

## 3. Estructura

```
src/
├── app/
│   ├── api/              # 32 rutas API (App Router)
│   │   ├── audit-log/       # Bitácora con filtros + paginación
│   │   ├── auth/[...nextauth]/  # NextAuth
│   │   ├── cash-shifts/     # Apertura/cierre/arqueo
│   │   ├── categories/      # CRUD categorías
│   │   ├── customers/       # CRUD + [id] (detalle + PATCH)
│   │   ├── dashboard/       # KPIs + alertas accionables
│   │   ├── export/          # CSV: sales, inventory, reports
│   │   ├── health/          # Health check
│   │   ├── inventory/       # Listado con KPIs
│   │   ├── lots/            # Creación de lotes
│   │   ├── products/        # CRUD + [id] + [id]/adjust-stock
│   │   ├── purchase-orders/ # CRUD + [id]/receive
│   │   ├── reports/         # Analítica con filtros + byCashier
│   │   ├── sales/           # List + POST + [id] + [id]/void
│   │   ├── settings/        # GET/PUT + /pharmacy (público)
│   │   ├── stock-movements/ # Bitácora movimientos con filtros
│   │   ├── suppliers/       # CRUD + [id] (detalle con métricas)
│   │   └── users/           # CRUD + [id]
│   ├── print/invoice/    # Página impresión térmica 80mm
│   ├── login/            # Página login
│   ├── error.tsx         # Error boundary
│   ├── loading.tsx       # Loading UI
│   ├── not-found.tsx     # 404
│   ├── global-error.tsx  # Global error boundary
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # AppShell
├── components/
│   ├── ui/               # shadcn/ui (NO modificar)
│   └── views/            # 18 vistas/diálogos
│       ├── dashboard-view.tsx       # KPIs + alertas expandibles
│       ├── pos-view.tsx             # POS con recetas + puntos + descuentos
│       ├── inventory-view.tsx       # Tabla + escaneo + detalle
│       ├── sales-view.tsx           # Paginación + anular
│       ├── customers-view.tsx       # Tarjetas + ficha detalle
│       ├── cash-view.tsx            # Turnos + arqueo
│       ├── suppliers-view.tsx       # CRUD + ficha detalle con métricas
│       ├── users-view.tsx           # CRUD + roles
│       ├── audit-view.tsx           # Bitácora con 18 acciones
│       ├── reports-view.tsx         # Filtros + CSV + cajeros
│       ├── settings-view.tsx        # 13 settings en 4 secciones
│       ├── product-detail-dialog.tsx  # 4 tabs (General/Lotes/Mov/Ventas)
│       ├── product-form-dialog.tsx    # Crear/editar con lote inicial
│       ├── stock-movements-dialog.tsx # Filtros + KPIs + CSV
│       ├── global-search.tsx          # Ctrl+K búsqueda
│       ├── kpi-card.tsx
│       └── error-state.tsx
├── lib/
│   ├── auth.ts           # NextAuth + lockout
│   ├── db.ts             # Prisma client
│   ├── api-handler.ts    # withErrorHandler + Zod
│   ├── permissions.ts    # 12 permisos, 4 roles
│   ├── rate-limit.ts     # Rate limiting + lockout
│   ├── schemas.ts        # Zod schemas
│   ├── settings.ts       # getTypedSettings + caché 60s
│   ├── audit.ts          # auditLog helper
│   ├── format.ts         # formatCurrency, formatDate, etc.
│   ├── nav-store.ts      # Zustand (ViewKey)
│   └── utils.ts          # cn()
├── hooks/
│   ├── use-keyboard-shortcuts.ts  # Ctrl+K, números, S
│   ├── use-idle-timeout.ts        # 15min logout
│   ├── use-connection-status.ts   # Online/offline
│   ├── use-mobile.ts
│   └── use-toast.ts
└── proxy.ts              # Middleware Next.js 16 (NO middleware.ts)
prisma/
├── schema.prisma         # 16 modelos
├── seed.ts               # Productos, categorías, clientes, ventas
├── seed-users.ts         # 4 usuarios demo
└── seed-suppliers.ts     # 5 proveedores + 8 OCs
```

---

## 4. Reglas Estrictas

- TypeScript estricto, sin `any` sin justificación
- shadcn/ui existentes, no construir desde cero
- Zod SIEMPRE (body + query)
- `withErrorHandler` en todas las APIs
- `requirePermission()` para auth
- `auditLog()` en toda operación de negocio (18 acciones registradas)
- `Promise.all` para queries independientes (evitar N+1)
- `db.$transaction` para multi-tabla
- NO modificar `schema.prisma` sin `db:push`
- NO escribir tests
- `bun run lint` debe pasar
- z-ai-web-dev-sdk SOLO backend
- Footer SIEMPRE sticky (`min-h-screen flex flex-col` + `mt-auto`)
- NO indigo/blue como primarios
- Server Components NO pueden usar onClick → usar `asChild` + `Link`
- Settings dinámicos: usar `getTypedSettings()` en APIs, fetch `/api/settings/pharmacy` en client

---

## 5. Empaquetado ZIP (REGLA OBLIGATORIA)

- Tras cada cambio de código: `bash .zscripts/create-zip.sh`
- Genera `download/nickpharma-YYYYMMDD-HHMMSS.zip`
- Incluye: src, prisma, db/custom.db, config files, README-LOCAL.md, .env (path relativo)
- Excluye: node_modules, .next, .git, logs, skills, tool-results, worklog.md

---

## 6. Comandos

| Comando | Propósito |
|---------|-----------|
| `bun run dev` | Dev server puerto 3000 |
| `bun run lint` | ESLint |
| `bun run db:push` | Aplicar schema a DB |
| `bun run db:generate` | Regenerar Prisma Client |
| `bun run db:seed` | Seed: productos, ventas, clientes |
| `bun run db:seed-users` | Seed: 4 usuarios demo |
| `bun run db:seed-suppliers` | Seed: 5 proveedores + 8 OCs |
| `bash .zscripts/create-zip.sh` | Crear ZIP del proyecto |

---

## 7. Cuentas Demo

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@nickpharma.com | admin123 |
| Supervisor | supervisor@nickpharma.com | super123 |
| Cajero | cajero@nickpharma.com | cajero123 |
| Farmacéutico | farmaceutico@nickpharma.com | farma123 |

---

## 8. Trazabilidad (3 capas)

1. **StockMovement**: 4 tipos (in/out/adjustment/return) — movimientos de inventario
2. **AuditLog**: 18 acciones — operaciones de negocio (ventas, anulaciones, productos, usuarios, caja, proveedores, OCs, settings)
3. **SaleItemLot**: multi-lote FIFO — qué lote se vendió, cuántas unidades, a qué precio

---

## 9. 11 Módulos

| # | Módulo | ViewKey | Permiso | Características |
|---|--------|---------|---------|-----------------|
| 1 | Panel | dashboard | dashboard:view | KPIs + alertas accionables + gráficos |
| 2 | POS | pos | pos:use | Recetas, puntos, descuentos, impresión |
| 3 | Inventario | inventory | inventory:view | Detalle producto, ajuste, escaneo, movimientos |
| 4 | Ventas | sales | sales:view | Paginación, anular, impresión, CSV |
| 5 | Clientes | customers | customers:view | Ficha detalle, historial, editar puntos |
| 6 | Caja | cash | cash:manage | Apertura/cierre/arqueo |
| 7 | Proveedores | suppliers | suppliers:manage | Ficha detalle con métricas, OCs, recibir |
| 8 | Usuarios | users | users:manage | CRUD + roles + activar |
| 9 | Auditoría | audit | users:manage | 18 acciones, 8 entidades, paginación, CSV |
| 10 | Reportes | reports | reports:view | Filtros custom, CSV, por cajero |
| 11 | Configuración | settings | users:manage | 13 settings dinámicos, vista previa |
