import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  // xlsx + QR/PDF stay on the server (SN-10) — avoid bloating the client bundle.
  serverExternalPackages: ["xlsx", "qrcode", "@react-pdf/renderer"],
  images: {
    // Seed usa placehold.co (SVG). Fotos reais do Storage serão JPEG/PNG/WEBP.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Placeholders do seed e CDN futuros
      { protocol: "https", hostname: "placehold.co" },
      // Storage público do projeto Supabase (product-images / intake-photos)
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
