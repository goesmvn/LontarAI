// Autosaved Studio draft (one slot), kept only in this browser: image + typed lines survive reloads and crashes.
// The image lives in IndexedDB (too big for localStorage); a tiny summary lives in localStorage for the dashboard.
import type { AnalysisResult } from "./ai/schema";
import type { Rect } from "./area";

export type Draft = {
  image: string; title: string; owner: string; banjar: string; era: string; regency: string;
  analysis: AnalysisResult; lineRects: Rect[]; updatedAt: number;
};
export type DraftMeta = { title: string; updatedAt: number; lines: number; filled: number };

const DB = "lontarai", STORE = "kv", KEY = "draft", META = "lontarai.draft.meta";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function saveDraft(d: Draft): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(d, KEY); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
    const meta: DraftMeta = { title: d.title, updatedAt: d.updatedAt, lines: d.analysis.lines.length, filled: d.analysis.lines.filter((l) => l.latin.trim()).length };
    localStorage.setItem(META, JSON.stringify(meta));
  } catch { /* private mode / quota: drafts are best-effort */ }
}

export async function loadDraft(): Promise<Draft | null> {
  try {
    const db = await open();
    const d = await new Promise<Draft | undefined>((res, rej) => { const q = db.transaction(STORE).objectStore(STORE).get(KEY); q.onsuccess = () => res(q.result as Draft | undefined); q.onerror = () => rej(q.error); });
    db.close();
    return d ?? null;
  } catch { return null; }
}

export async function clearDraft(): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(KEY); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
  } catch { /* ignore */ }
  try { localStorage.removeItem(META); } catch { /* ignore */ }
}

export function readDraftMeta(): DraftMeta | null {
  try { const s = localStorage.getItem(META); return s ? (JSON.parse(s) as DraftMeta) : null; } catch { return null; }
}
