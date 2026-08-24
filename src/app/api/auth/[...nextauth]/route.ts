import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Forzar runtime Node.js (no edge) para que Prisma y bcrypt funcionen
export const runtime = "nodejs";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
