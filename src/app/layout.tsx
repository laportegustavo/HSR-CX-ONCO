import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import PWAProvider from "@/components/PWAProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HSR CRM Cirúrgico",
  description: "Dashboard de acompanhamento cirúrgico HSR",
  manifest: "/manifest.json",
  themeColor: "#0a1f44",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HSR CRM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={`${inter.variable} font-sans antialiased text-slate-800 bg-slate-50 overflow-x-hidden`}>
        <PWAProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </PWAProvider>
      </body>
    </html>
  );
}
