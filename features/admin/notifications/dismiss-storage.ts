const STORAGE_KEY = "rp-admin-notif-dismissed";

function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function writeRaw(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Quota / private mode — dismiss fica só em memória nessa sessão.
  }
}

/** IDs dispensados (persistidos no browser do staff). */
export function loadDismissedNotificationIds(): Set<string> {
  return new Set(readRaw());
}

export function dismissNotificationId(id: string): Set<string> {
  const next = loadDismissedNotificationIds();
  next.add(id);
  writeRaw([...next]);
  return next;
}

export function dismissNotificationIds(ids: readonly string[]): Set<string> {
  const next = loadDismissedNotificationIds();
  for (const id of ids) next.add(id);
  writeRaw([...next]);
  return next;
}
