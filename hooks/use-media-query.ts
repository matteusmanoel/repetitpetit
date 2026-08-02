"use client";

import { useEffect, useState } from "react";

/**
 * Assina um `matchMedia` no client. Retorna `null` até hidratar
 * (evita mismatch SSR / flash da variante errada).
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    function onChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
