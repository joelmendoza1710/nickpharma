import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkLockout, registerFailedAttempt, resetFailedAttempts } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  // Usar sesión JWT (sin adapter de DB) para mantenerlo simple y stateless
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 horas
  },
  providers: [
    CredentialsProvider({
      name: "credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Correo y contraseña son obligatorios");
          }

          const emailKey = credentials.email.toLowerCase().trim();

          // 1. Verificar lockout antes de consultar DB
          const lockout = checkLockout(emailKey);
          if (lockout.locked && lockout.lockedUntilMs) {
            const mins = Math.max(1, Math.ceil((lockout.lockedUntilMs - Date.now()) / 60_000));
            throw new Error(`Cuenta bloqueada por seguridad. Intenta en ${mins} minuto${mins === 1 ? "" : "s"}.`);
          }

          const user = await db.user.findUnique({
            where: { email: emailKey },
          });

          // Usuario no existe → registrar intento fallido
          if (!user) {
            registerFailedAttempt(emailKey);
            throw new Error("Credenciales inválidas");
          }

          if (!user.active) {
            throw new Error("Tu cuenta está desactivada. Contacta al administrador.");
          }

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);

          // Password incorrecta → registrar intento fallido
          if (!valid) {
            registerFailedAttempt(emailKey);
            const after = checkLockout(emailKey);
            if (after.locked) {
              throw new Error("Demasiados intentos fallidos. Cuenta bloqueada 5 minutos.");
            }
            throw new Error(`Credenciales inválidas. ${after.remainingAttempts} intento${after.remainingAttempts === 1 ? "" : "s"} restante${after.remainingAttempts === 1 ? "" : "s"}.`);
          }

          // Login exitoso → resetear intentos fallidos
          resetFailedAttempts(emailKey);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image ?? null,
          };
        } catch (err: any) {
          console.error("[auth] authorize error:", err?.message);
          // Devolver null para que next-auth marque error sin filtrar el mensaje
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Al iniciar sesión, inyectamos el rol y el id en el token
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      // Exponer rol e id en la sesión del cliente
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Configuración de cookies para funcionar a través del proxy HTTPS
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  },
};
