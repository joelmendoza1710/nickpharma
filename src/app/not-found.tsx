import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileQuestion className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Página no encontrada</CardTitle>
          <CardDescription>
            La página que buscas no existe o fue movida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-6xl font-bold text-primary/20">404</p>
        </CardContent>
        <CardFooter className="justify-center gap-2">
          <Button asChild>
            <Link href="/">Volver al inicio</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Ir al panel</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
