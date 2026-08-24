import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NickPharma — Sistema de Gestión de Farmacia",
  description:
    "Plataforma integral de punto de venta y gestión para NickPharma: inventario, lotes, vencimientos, ventas y analítica en tiempo real. Cuidamos de ti.",
  keywords: [
    "NickPharma",
    "farmacia",
    "POS",
    "punto de venta",
    "inventario",
    "vencimientos",
    "lotes",
  ],
  authors: [{ name: "NickPharma" }],
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/nickpharma-icon.png", sizes: "256x256", type: "image/png" },
    ],
    apple: "/nickpharma-icon.png",
  },
  openGraph: {
    title: "NickPharma — Sistema de Gestión de Farmacia",
    description: "Punto de venta y gestión integral para NickPharma. Cuidamos de ti.",
    siteName: "NickPharma",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
