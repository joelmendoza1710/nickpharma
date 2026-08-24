"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  ReceiptText,
  Users,
  Wallet,
  Truck,
  UserCog,
  History,
  BarChart3,
  Menu,
  X,
  HeartPulse,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Settings,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/app-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useNav, type ViewKey } from "@/lib/nav-store";
import {
  hasPermission,
  VIEW_PERMISSIONS,
  ROLE_LABELS,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { DashboardView } from "@/components/views/dashboard-view";
import { PosView } from "@/components/views/pos-view";
import { InventoryView } from "@/components/views/inventory-view";
import { SalesView } from "@/components/views/sales-view";
import { CustomersView } from "@/components/views/customers-view";
import { CashView } from "@/components/views/cash-view";
import { SuppliersView } from "@/components/views/suppliers-view";
import { UsersView } from "@/components/views/users-view";
import { AuditView } from "@/components/views/audit-view";
import { ReportsView } from "@/components/views/reports-view";
import { SettingsView } from "@/components/views/settings-view";
import { GlobalSearch } from "@/components/views/global-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { toast } from "sonner";

const NAV_ITEMS: {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  permission: Permission;
}[] = [
  { key: "dashboard", label: "Panel", icon: LayoutDashboard, description: "Resumen general", permission: "dashboard:view" },
  { key: "pos", label: "Punto de Venta", icon: ScanLine, description: "Nueva venta", permission: "pos:use" },
  { key: "inventory", label: "Inventario", icon: Package, description: "Stock y lotes", permission: "inventory:view" },
  { key: "sales", label: "Ventas", icon: ReceiptText, description: "Historial de facturas", permission: "sales:view" },
  { key: "customers", label: "Clientes", icon: Users, description: "Base de clientes", permission: "customers:view" },
  { key: "cash", label: "Caja", icon: Wallet, description: "Corte y arqueo", permission: "cash:manage" },
  { key: "suppliers", label: "Proveedores", icon: Truck, description: "Compras y abastecimiento", permission: "suppliers:manage" },
  { key: "users", label: "Usuarios", icon: UserCog, description: "Gestión de usuarios", permission: "users:manage" },
  { key: "audit", label: "Auditoría", icon: History, description: "Bitácora", permission: "users:manage" },
  { key: "reports", label: "Reportes", icon: BarChart3, description: "Analítica", permission: "reports:view" },
  { key: "settings", label: "Configuración", icon: Settings, description: "Ajustes globales", permission: "users:manage" },
];

const VIEW_TITLES: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: { title: "Panel de control", subtitle: "Resumen general del día" },
  pos: { title: "Punto de venta", subtitle: "Registra una nueva transacción" },
  inventory: { title: "Inventario", subtitle: "Control de stock, lotes y vencimientos" },
  sales: { title: "Ventas", subtitle: "Historial de facturas y transacciones" },
  customers: { title: "Clientes", subtitle: "Gestión de clientes y fidelización" },
  cash: { title: "Caja", subtitle: "Corte de turno y arqueo de efectivo" },
  suppliers: { title: "Proveedores", subtitle: "Gestión de proveedores y órdenes de compra" },
  users: { title: "Usuarios", subtitle: "Gestión de usuarios y roles" },
  audit: { title: "Auditoría", subtitle: "Bitácora de acciones del sistema" },
  reports: { title: "Reportes", subtitle: "Analítica de ventas y rentabilidad" },
  settings: { title: "Configuración", subtitle: "Ajustes globales del sistema" },
};

// Atajos numéricos 1..9 (mismo orden que NAV_ITEMS)
const NAV_KEYS_BY_NUMBER: ViewKey[] = [
  "dashboard",
  "pos",
  "inventory",
  "sales",
  "customers",
  "cash",
  "suppliers",
  "users",
  "audit",
];

export function AppShell() {
  const { data: session, status } = useSession();
  const { view, navigate } = useNav();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { status: connectionStatus } = useConnectionStatus();

  // Cerrar sesión por inactividad (15 min)
  useIdleTimeout(15);

  // Mapa de atajos numéricos para navegación rápida
  const numberShortcuts = React.useMemo(() => {
    const map: Record<string, (e: KeyboardEvent) => void> = {};
    NAV_KEYS_BY_NUMBER.forEach((key, i) => {
      map[String(i + 1)] = () => {
        if (key) navigate(key);
      };
    });
    return map;
  }, [navigate]);

  useKeyboardShortcuts({
    "Ctrl+k": () => setSearchOpen(true),
    ...numberShortcuts,
  });

  // Toast cuando cambia la conexión
  const prevStatus = React.useRef(connectionStatus);
  React.useEffect(() => {
    if (prevStatus.current === connectionStatus) return;
    if (connectionStatus === "offline") {
      toast.error("Sin conexión", {
        description: "Trabajando en modo offline. Algunas funciones pueden fallar.",
      });
    } else if (prevStatus.current === "offline" && connectionStatus === "online") {
      toast.success("Conexión restablecida", {
        description: "Vuelves a estar en línea.",
      });
    }
    prevStatus.current = connectionStatus;
  }, [connectionStatus]);

  const role = (session?.user as any)?.role as Role | undefined;

  // Filtrar items de navegación según permisos del rol
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => hasPermission(role, item.permission)
  );

  // Si la vista actual no está permitida, ir a la primera permitida
  React.useEffect(() => {
    if (status !== "authenticated" || !role) return;
    const currentPerm = VIEW_PERMISSIONS[view];
    if (currentPerm && !hasPermission(role, currentPerm)) {
      const first = visibleNavItems[0]?.key ?? "dashboard";
      navigate(first);
    }
  }, [role, status, view, navigate, visibleNavItems]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [view]);

  // Mientras carga la sesión, mostrar skeleton simple
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Cargando sesión…</p>
        </div>
      </div>
    );
  }

  const current = VIEW_TITLES[view];
  const userName = session?.user?.name ?? "Usuario";
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Logout con redirección relativa (evita URLs absolutas localhost:3000)
  const handleLogout = () => {
    signOut({ redirect: false }).then(() => {
      window.location.href = "/login";
    });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
        <AppLogo />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleNavItems.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                )}
              />
              <div className="flex flex-col items-start leading-tight">
                <span>{item.label}</span>
                <span
                  className={cn(
                    "text-[11px] font-normal",
                    active ? "text-primary-foreground/70" : "text-muted-foreground/70"
                  )}
                >
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <UserCard
          name={userName}
          role={role}
          initials={initials}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-sidebar-border sticky top-0 h-screen">
          {sidebar}
        </aside>

        {/* Sidebar móvil */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 shadow-xl animate-in slide-in-from-left">
              {sidebar}
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Abrir menú"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2 lg:hidden">
              <AppLogo showText={false} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold leading-tight truncate md:text-lg">
                {current.title}
              </h1>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {current.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Botón búsqueda global */}
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex h-9 w-9 p-0 text-muted-foreground"
                onClick={() => setSearchOpen(true)}
                aria-label="Buscar (Ctrl+K)"
                title="Buscar (Ctrl+K)"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSearchOpen(true)}
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Indicador de conexión */}
              <div
                className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium"
                title={
                  connectionStatus === "online"
                    ? "Conexión establecida"
                    : "Sin conexión a internet"
                }
                aria-live="polite"
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    connectionStatus === "online"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-rose-500"
                  )}
                />
                <span
                  className={cn(
                    "hidden lg:inline",
                    connectionStatus === "online"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  )}
                >
                  {connectionStatus === "online" ? "En línea" : "Sin conexión"}
                </span>
              </div>

              <ModeToggle />
              {/* Indicador de sesión en desktop */}
              <div className="hidden md:flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                {ROLE_LABELS[role as Role] ?? "Usuario"}
              </div>
              {/* Menú usuario móvil */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="md:hidden h-9 w-9 rounded-full p-0" aria-label="Menú de usuario">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span>{userName}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {session?.user?.email}
                    </span>
                    <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                      {ROLE_LABELS[role as Role] ?? "Usuario"}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <ViewSwitcher />
          </main>

          <footer className="mt-auto border-t bg-background">
            <div className="flex flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row md:px-6">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-3.5 w-3.5 text-primary" />
                <span>
                  <span className="font-semibold text-foreground">
                    <span className="text-primary">Nick</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Pharma</span>
                  </span>{" "}
                  · Cuidamos de ti
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>v1.1.0</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">
                  {new Date().toLocaleDateString("es-CO", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Búsqueda global (Ctrl+K) */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

function UserCard({
  name,
  role,
  initials,
  onLogout,
}: {
  name: string;
  role: Role | undefined;
  initials: string;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent/60 px-3 py-2.5 text-left hover:bg-sidebar-accent transition-colors">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">{name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {ROLE_LABELS[role as Role] ?? "Usuario"}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ViewSwitcher() {
  const { view } = useNav();
  switch (view) {
    case "dashboard": return <DashboardView />;
    case "pos": return <PosView />;
    case "inventory": return <InventoryView />;
    case "sales": return <SalesView />;
    case "customers": return <CustomersView />;
    case "cash": return <CashView />;
    case "suppliers": return <SuppliersView />;
    case "users": return <UsersView />;
    case "audit": return <AuditView />;
    case "reports": return <ReportsView />;
    case "settings": return <SettingsView />;
    default: return <DashboardView />;
  }
}
