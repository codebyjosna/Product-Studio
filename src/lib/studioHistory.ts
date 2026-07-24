/** Local studio project history (browser). Videos are session-only; metadata persists. */

export interface StudioHistoryItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  productDesc?: string;
  atmosphereDesc?: string;
  lastPrompt?: string;
  aspectRatio?: string;
  durationSec?: number;
  versionCount?: number;
  /** Thumbnail data URL (small) — optional */
  thumbDataUrl?: string | null;
}

const KEY = 'ps_studio_history_v1';
const MAX = 40;

function storageKey(userId: string | null | undefined) {
  return `${KEY}:${userId || 'anon'}`;
}

export function loadStudioHistory(userId: string | null | undefined): StudioHistoryItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.id === 'string' && typeof x.title === 'string')
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveStudioHistory(
  userId: string | null | undefined,
  items: StudioHistoryItem[],
): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

export function upsertStudioHistory(
  userId: string | null | undefined,
  item: StudioHistoryItem,
): StudioHistoryItem[] {
  const prev = loadStudioHistory(userId).filter((x) => x.id !== item.id);
  const next = [item, ...prev].slice(0, MAX);
  saveStudioHistory(userId, next);
  return next;
}

export function deleteStudioHistoryItem(
  userId: string | null | undefined,
  id: string,
): StudioHistoryItem[] {
  const next = loadStudioHistory(userId).filter((x) => x.id !== id);
  saveStudioHistory(userId, next);
  return next;
}

export function newHistoryId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromBrief(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return 'Untitled project';
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}
