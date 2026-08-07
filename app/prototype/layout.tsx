import type { ReactNode } from "react";
import { Caveat, Fredoka } from "next/font/google";

/**
 * PROTOTYPE fonts — stand-ins until licensed Omnes / Becca files are added.
 * Omnes → Fredoka (rounded geometric sans)
 * Becca → Caveat (friendly script display)
 */
const omnes = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-omnes",
  display: "swap",
});

const becca = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-becca",
  display: "swap",
});

export default function PrototypeLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${omnes.variable} ${becca.variable} min-h-screen bg-white antialiased`}
      style={
        {
          ["--font-sans" as string]: "var(--font-omnes), system-ui, sans-serif",
          ["--font-heading" as string]: "var(--font-becca), cursive",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
