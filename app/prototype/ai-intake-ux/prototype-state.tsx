"use client";

/**
 * PROTOTYPE — in-memory state for AI intake UX variants.
 * Question: how should one-piece capture → audio → confirm → (preview?) feel?
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PieceDraft = {
  id: string;
  photoDataUrl: string | null;
  audioMs: number;
  hasAudio: boolean;
  status: "idle" | "recording" | "ready" | "sending" | "preview" | "done";
  name: string;
  category: string;
  color: string;
  size: string;
  price: string;
};

type PrototypeState = {
  piecesDone: number;
  current: PieceDraft;
  batchQueue: PieceDraft[];
  resetCurrent: () => void;
  setCurrent: (patch: Partial<PieceDraft>) => void;
  completeCurrentToBatch: () => void;
  approveCurrent: () => void;
};

const Ctx = createContext<PrototypeState | null>(null);

function blankPiece(): PieceDraft {
  return {
    id: crypto.randomUUID(),
    photoDataUrl: null,
    audioMs: 0,
    hasAudio: false,
    status: "idle",
    name: "",
    category: "",
    color: "",
    size: "",
    price: "",
  };
}

function fakeAiFill(piece: PieceDraft): PieceDraft {
  return {
    ...piece,
    status: "preview",
    name: piece.name || "Body manga longa",
    category: piece.category || "Bodies",
    color: piece.color || "Verde",
    size: piece.size || "M",
    price: piece.price || "29,90",
  };
}

export function PrototypeStateProvider({ children }: { children: ReactNode }) {
  const [piecesDone, setPiecesDone] = useState(0);
  const [current, setCurrentState] = useState<PieceDraft>(blankPiece);
  const [batchQueue, setBatchQueue] = useState<PieceDraft[]>([]);

  const setCurrent = useCallback((patch: Partial<PieceDraft>) => {
    setCurrentState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetCurrent = useCallback(() => {
    setCurrentState(blankPiece());
  }, []);

  const completeCurrentToBatch = useCallback(() => {
    setCurrentState((prev) => {
      const filled = fakeAiFill({ ...prev, status: "sending" });
      setBatchQueue((q) => [...q, { ...filled, status: "done" }]);
      setPiecesDone((n) => n + 1);
      return blankPiece();
    });
  }, []);

  const approveCurrent = useCallback(() => {
    setCurrentState((prev) => {
      setBatchQueue((q) => [...q, { ...prev, status: "done" }]);
      setPiecesDone((n) => n + 1);
      return blankPiece();
    });
  }, []);

  const value = useMemo(
    () => ({
      piecesDone,
      current,
      batchQueue,
      resetCurrent,
      setCurrent,
      completeCurrentToBatch,
      approveCurrent,
    }),
    [
      piecesDone,
      current,
      batchQueue,
      resetCurrent,
      setCurrent,
      completeCurrentToBatch,
      approveCurrent,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrototypeState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("PrototypeStateProvider missing");
  return ctx;
}

/** Stub photo — solid brand-ish placeholder as data URL via canvas-free SVG. */
export function stubPhotoDataUrl(label = "foto"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#6b8f2e"/><stop offset="1" stop-color="#1e5a99"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="48%" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif">${label}</text>
    <text x="50%" y="56%" text-anchor="middle" fill="white" font-size="22" font-family="sans-serif" opacity="0.8">PROTOTYPE</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function applyFakeAi(piece: PieceDraft): PieceDraft {
  return fakeAiFill(piece);
}
