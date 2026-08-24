# PROGRESS.md — NickPharma

> **Memoria corto/medio plazo.** Estado actual del proyecto.

---

## [Completado]

### Módulos (11/11 — Todos completos)
- ✅ **Panel**: KPIs básicos + gráfico 14 días + **alertas accionables expandibles** (stock bajo, agotados, por vencer, vencidos con productos/lotes reales + click-to-navigate) + top productos + métodos de pago
- ✅ **POS**: búsqueda, carrito, checkout 3 pasos, recibo + **recetas médicas** (formulario condicional Rx) + **canje puntos** (≥100 pts, rate dinámico) + **descuentos manuales** + impresión térmica 80mm + **recibo lee pharmacy info completo de settings** (name, tagline, NIT, phone, address, email) + botón Imprimir usa /print/invoice dedicado
- ✅ **Inventario**: KPIs, tabla, filtros, agregar lote + **detalle producto** (4 tabs: General/Lotes/Movimientos/Ventas) + **ajuste stock** UI + **escaneo barcode** (atajo S) + **movimientos dialog** con filtros + CSV + **crear/editar producto** con lote inicial + **stock mínimo dinámico desde settings**
- ✅ **Ventas**: historial + **paginación real** (15/page) + **botón anular** con confirmación + impresión térmica + export CSV
- ✅ **Clientes**: tarjetas, agregar + **ficha detalle** con historial de compras (10 recientes) + **editar puntos** inline + KPIs
- ✅ Caja: apertura/cierre, arqueo
- ✅ **Proveedores**: CRUD, órdenes de compra, recibir + **ficha detalle con métricas** (3 tabs: General/Oórdenes/Productos, 4 KPIs, 3 status cards, toggle activar/desactivar, historial órdenes y productos suministrados) + **seed data** (5 proveedores, 8 órdenes de compra, 5 recibidas con lotes)
- ✅ Usuarios: CRUD, roles, activar/desactivar
- ✅ **Auditoría**: bitácora con **paginación** (20/page) + **filtros** (8 entidades, búsqueda, rango fechas) + **KPIs por categoría** (Ventas/Inventario/Usuarios-Clientes/Sistema) + **export CSV** + **registro automático en 18 operaciones** + **18 iconos y labels** por acción + **8 entidades** en filtro
- ✅ **Reportes**: **filtros custom** (rápido/personalizado + categoría + pago) + **export CSV** + **rendimiento por cajero** (ranking + Top badge + barras progreso) + KPIs + 3 gráficos
- ✅ **Configuración**: 13 settings en 4 secciones + vista previa + dirty tracking + API pública + **settings aplicados dinámicamente** (expiryWarningDays en dashboard, pointsRate/pointsEarnRate en sales/void, POS UI lee rates de /api/settings/pharmacy)

### Transversal
- ✅ NextAuth v4 con 4 roles, 12 permisos, trustHost, cookies sameSite=none+secure
- ✅ withErrorHandler + Zod validation
- ✅ Multi-lote FIFO con SaleItemLot
- ✅ Prisma schema 16 modelos con índices
- ✅ **Rate limiting + lockout** (100 req/min, 5 intentos fallidos → bloqueo 5min)
- ✅ **Headers de seguridad** (X-Frame-Options, X-Content-Type, Referrer-Policy, X-XSS, Permissions-Policy)
- ✅ **NEXTAUTH_SECRET** configurado en .env
- ✅ **API stock-movements** (GET con filtros + summary por tipo)
- ✅ **API customers/[id]** (GET detalle + PATCH editar)
- ✅ **API products/[id]/adjust-stock** (POST ajuste manual + StockMovement)
- ✅ **APIs export CSV**: sales, inventory, reports (5 secciones)
- ✅ **Páginas error**: error.tsx, loading.tsx, not-found.tsx, global-error.tsx
- ✅ **Hooks**: use-keyboard-shortcuts (Ctrl+K, números), use-idle-timeout (15min), use-connection-status
- ✅ **Búsqueda global Ctrl+K** (productos + clientes)
- ✅ **Print/invoice** (recibo térmico 80mm con @media print)
- ✅ **Indicador de conexión** en header (online/offline)

---

## [En Progreso]

Análisis exhaustivo completado (20/jun). Se identificaron **~46 gaps** tras reinicio del entorno. Pendiente restauración por prioridades.

---

## [Bugs/Errores conocidos]

### 🔴 CRÍTICOS
*(Ninguno — todos los bugs críticos resueltos)*

### ✅ RESUELTOS
8. ~~`not-found.tsx` Server Component con onClick~~ → Fase 6 (02/jul): Reemplazado `<Button onClick={window.location}>` con `<Button asChild><Link href="/">` (Link es compatible con Server Components)

### ✅ RESUELTOS
1. ~~`.env` sin `NEXTAUTH_SECRET`~~ → Fase 1 (20/jun)
2. ~~`next.config.ts` con `ignoreBuildErrors: true`~~ → Fase 1 (20/jun)
3. ~~Sin headers de seguridad~~ → Fase 1 (20/jun)
4. ~~Sin rate-limiting ni lockout~~ → Fase 1 (20/jun)
5. ~~`Prescription` huérfano~~ → Fase 4 (22/jun): UI POS captura receta cuando hay productos Rx
6. ~~`StockMovement` huérfano~~ → Fase 4 (22/jun): registro automático en sales (out), lots (in), void (return), adjust-stock (adjustment)
7. ~~`Settings` huérfano~~ → Fase 2 (22/jun)

---

## [Historial de cambios]

*(Máximo 5 elementos)*

1. **ARCHITECTURE.md actualizado (02/jul)**: Documento completamente reescrito con estado real: 32 API routes, 18 vistas/diálogos, 5 hooks, 3 capas de trazabilidad, 11 módulos con características detalladas, 8 comandos, regla nueva sobre Server Components sin onClick, settings dinámicos. ZIP: `nickpharma-20260702-223022.zip`.

2. **Verificación end-to-end + scripts seed (02/jul)**: 11/11 módulos OK, 15/15 APIs 200, 3/3 CSVs generados, 0 errores.

3. **Seed data suppliers + POs (02/jul)**: 5 proveedores, 8 órdenes de compra, $7,013 total.

4. **Supplier detail dialog + recibos completos (02/jul)**: Ficha con métricas, pharmacy info 6 campos.

5. **Audit log en 18 operaciones + UI completa (02/jul)**: 18 operaciones, 18 iconos, 8 entidades.

> **✅ PROYECTO COMPLETO + VERIFICADO + DOCUMENTADO**: 11/11 módulos, 8/8 bugs, 32 APIs, 18 operaciones auditadas, settings dinámicos, seed data, ARCHITECTURE.md y PROGRESS.md actualizados.
