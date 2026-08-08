import type { Metadata } from "next";
import { Caveat, Fredoka, Inter } from "next/font/google";
import "./globals.css";

/**
 * Inter — admin tool body/titles (docs/12-ui-system.md).
 * Fredoka — Omnes stand-in for storefront UI (D111).
 * Caveat — Becca stand-in for display titles (D111).
 * Licensed Omnes/Becca files replace stand-ins when available.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Repeti Petit — Brechó Infantil",
  description:
    "Compre roupas, calçados e acessórios infantis seminovos em Foz do Iguaçu. Peça única, do jeito que a sua família merece.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Font CSS variables MUST live on <html>: globals applies `font-sans` there.
  // Variables only on <body> made `--font-fredoka` unresolved → Times fallback (SQ-3).
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${fredoka.variable} ${caveat.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
