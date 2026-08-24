import withAuth from "next-auth/middleware";

// Protege las páginas de la app (no las APIs, que se protegen con requirePermission).
// Rutas públicas excluidas: /login, /api/* y assets estáticos.
// Las rutas /api/* se excluyen aquí para que devuelvan 401 JSON (no redirect).
// Nota: Next.js 16 renombró "middleware" a "proxy", pero next-auth v4
// sigue exportando desde "next-auth/middleware". Usamos este archivo como proxy.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon-32|nickpharma-icon|nickpharma-logo|logo|robots).*)",
  ],
};
