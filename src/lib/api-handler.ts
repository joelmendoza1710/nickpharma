import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { Prisma } from "@prisma/client";

export function withErrorHandler<TArgs extends unknown[]>(
  handler: (req: NextRequest, ...args: TArgs) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ...args: TArgs): Promise<NextResponse> => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

export function withErrorHandlerSimple<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse> | NextResponse
) {
  return async (...args: TArgs): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const issues = error.issues ?? [];
    return NextResponse.json(
      { error: "Datos de entrada inválidos", code: "VALIDATION_ERROR", details: issues.map((e: any) => ({ path: e.path?.join("."), message: e.message })) },
      { status: 400 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": return NextResponse.json({ error: "Ya existe un registro con estos datos", code: "CONFLICT" }, { status: 409 });
      case "P2025": return NextResponse.json({ error: "Registro no encontrado", code: "NOT_FOUND" }, { status: 404 });
      case "P2003": return NextResponse.json({ error: "No se puede completar: hay registros relacionados", code: "FOREIGN_KEY_CONSTRAINT" }, { status: 409 });
      default: return NextResponse.json({ error: "Error de base de datos", code: "DATABASE_ERROR", prismaCode: error.code }, { status: 400 });
    }
  }
  if (error instanceof Error) {
    console.error("[API] Unhandled error:", error.message);
    return NextResponse.json({ error: "Error interno del servidor", code: "INTERNAL_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ error: "Error desconocido", code: "UNKNOWN_ERROR" }, { status: 500 });
}

export async function validateBody<T>(schema: ZodSchema<T>, req: NextRequest): Promise<T> {
  let body: unknown;
  try { body = await req.json(); } catch { throw new Error("El cuerpo de la petición no es JSON válido"); }
  return schema.parse(body);
}

export function validateQuery<T>(schema: ZodSchema<T>, req: NextRequest): T {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => { params[key] = value; });
  return schema.parse(params);
}
