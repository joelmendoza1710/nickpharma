"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  HeartPulse,
  ShieldCheck,
  ScanLine,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { email: "admin@nickpharma.com", password: "admin123", role: "Administrador", color: "text-primary" },
  { email: "supervisor@nickpharma.com", password: "super123", role: "Supervisor", color: "text-sky-600 dark:text-sky-400" },
  { email: "cajero@nickpharma.com", password: "cajero123", role: "Cajero/a", color: "text-emerald-600 dark:text-emerald-400" },
  { email: "farmaceutico@nickpharma.com", password: "farma123", role: "Farmacéutico/a", color: "text-violet-600 dark:text-violet-400" },
];

// Mapear códigos de error de next-auth a mensajes comprensibles (definida antes del componente)
function getErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "Configuration":
      return null; // No mostrar mensaje para errores de configuración (warning, no error real)
    case "AccessDenied":
      return "Acceso denegado. No tienes permiso para ingresar.";
    case "Verification":
      return "El enlace de verificación es inválido o ha expirado.";
    case "CredentialsSignin":
      return "Correo o contraseña incorrectos. Verifica tus credenciales.";
    case "SessionExpired":
      return "Tu sesión expiró. Inicia sesión de nuevo para continuar.";
    default:
      return null; // No mostrar mensaje para códigos desconocidos
  }
}

export default function LoginPage() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const errorParam = params.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(getErrorMessage(errorParam));

  // Limpiar el parámetro ?error= de la URL para que no persista al recargar
  React.useEffect(() => {
    if (errorParam || params.get("callbackUrl")) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [errorParam, params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // redirect:false evita que next-auth genere una URL absoluta (localhost:3000)
      // que el navegador del usuario no puede alcanzar al usar el proxy de vista previa.
      // Manejamos la redirección nosotros con una URL relativa.
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setLoading(false);
        setError("Correo o contraseña incorrectos. Verifica tus credenciales.");
        return;
      }
      // Login exitoso: verificar que la cookie de sesión se haya guardado
      await new Promise((r) => setTimeout(r, 500));
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (sessionData?.user) {
        // Sesión confirmada: redirigir
        const dest = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
        window.location.replace(dest);
      } else {
        // La cookie no se guardó (problema del proxy)
        setLoading(false);
        setError("No se pudo establecer la sesión. Intenta recargar la página y volver a iniciar sesión.");
      }
    } catch (err) {
      setLoading(false);
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    }
  }

  function quickFill(acc: { email: string; password: string }) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel izquierdo — branding / hero */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute right-10 top-1/3 h-56 w-56 rounded-full bg-emerald-300 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-sky-300 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 w-fit shadow-lg">
            <AppLogo size="lg" />
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Gestiona tu farmacia
              <br />
              de forma inteligente
            </h2>
            <p className="mt-3 text-primary-foreground/80 max-w-md">
              Punto de venta, control de inventario, lotes, vencimientos y
              analítica en una sola plataforma.
            </p>
          </div>
          <div className="grid gap-3 max-w-md">
            <Feature icon={ScanLine} title="POS rápido y seguro" desc="Venta en 3 pasos con trazabilidad de lotes" />
            <Feature icon={HeartPulse} title="Control de vencimientos" desc="Alertas de medicamentos por caducar" />
            <Feature icon={ShieldCheck} title="Roles y permisos" desc="Acceso segmentado por tipo de usuario" />
          </div>
        </div>
        <p className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} NickPharma · Cuidamos de ti
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo móvil */}
          <div className="mb-8 flex justify-center lg:hidden">
            <AppLogo size="lg" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Bienvenido</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inicia sesión para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@nickpharma.com"
                  className="pl-9 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setError("Contacta al administrador para restablecer tu contraseña.")}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando sesión…
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Cuentas demo */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Cuentas de prueba
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickFill(acc)}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{acc.role}</span>
                    <span className="text-xs text-muted-foreground">{acc.email}</span>
                  </div>
                  <span className={`text-xs font-mono ${acc.color}`}>{acc.password}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Haz clic en una cuenta para autocompletar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-primary-foreground/70">{desc}</p>
      </div>
    </div>
  );
}
