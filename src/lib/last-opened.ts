const KEY = "doc-editor:last-opened:v1";

export interface LastOpenedEntry {
  docId: string;
  pageId: string | null;
  docTitle: string;
  pageTitle: string | null;
  updatedAt: number;
}

export function saveLastOpened(entry: LastOpenedEntry): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entry));
}

export function loadLastOpened(): LastOpenedEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastOpenedEntry>;
    if (typeof parsed?.docId !== "string" || typeof parsed?.updatedAt !== "number") return null;
    return {
      docId: parsed.docId,
      pageId: parsed.pageId ?? null,
      docTitle: parsed.docTitle ?? "Untitled",
      pageTitle: parsed.pageTitle ?? null,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}
