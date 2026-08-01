import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  images: {
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
