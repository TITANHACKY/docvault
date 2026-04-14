export type EditorFontSize = "small" | "default" | "large";
export type EditorPageWidth = "default" | "full";

export interface EditorPreferences {
  fontStyle: string;
  fontSize: EditorFontSize;
  pageWidth: EditorPageWidth;
  coverImage: boolean;
  pageIconTitle: boolean;
  owners: boolean;
  contributors: boolean;
  subtitle: boolean;
  lastModified: boolean;
  pageOutline: boolean;
  focusBlock: boolean;
  focusPage: boolean;
  showStatsOnPage: boolean;
  isPagesSidebarOpen: boolean;
}

const PREFS_PREFIX = "doc-editor:prefs:v1:";

function keyForDoc(docId: string): string {
  return `${PREFS_PREFIX}${docId}`;
}

export function loadEditorPreferences(
  docId: string,
): Partial<EditorPreferences> | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(keyForDoc(docId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Partial<EditorPreferences>;
  } catch {
    return null;
  }
}

export function saveEditorPreferences(
  docId: string,
  preferences: EditorPreferences,
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(keyForDoc(docId), JSON.stringify(preferences));
}
