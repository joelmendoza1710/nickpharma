"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log de error a consola (en producción enviaría a un servicio)
    console.error("Error de aplicación:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Algo salió mal</CardTitle>
          <CardDescription>
            Se produjo un error inesperado al cargar esta sección.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error?.message && (
            <p className="rounded-md bg-muted/60 p-3 text-center font-mono text-xs text-muted-foreground">
              {error.message}
              {error.digest ? ` · ${error.digest}` : ""}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center gap-2">
          <Button onClick={() => reset()}>
            <AlertCircle className="h-4 w-4" />
            Reintentar
          </Button>
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            Ir al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
