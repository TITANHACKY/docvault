export type EditorFontSize = "small" | "default" | "large";
export type EditorPageWidth = "default" | "full";
import type { EditorTheme } from "@/lib/editor-themes";

export interface EditorPreferences {
  fontStyle: string;
  theme: EditorTheme;
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
const GLOBAL_PREFS_KEY = "doc-editor:prefs:global";

function keyForDoc(docId: string): string {
  return `${PREFS_PREFIX}${docId}`;
}

export function loadEditorPreferences(
  docId: string,
): Partial<EditorPreferences> | null {
  if (typeof window === "undefined") return null;

  // Try global prefs first, then doc-specific as fallback
  const globalRaw = window.localStorage.getItem(GLOBAL_PREFS_KEY);
  const docRaw = window.localStorage.getItem(keyForDoc(docId));

  try {
    const globalPrefs = globalRaw ? JSON.parse(globalRaw) : {};
    const docPrefs = docRaw ? JSON.parse(docRaw) : {};
    return { ...docPrefs, ...globalPrefs };
  } catch {
    return null;
  }
}

export function saveEditorPreferences(
  docId: string,
  preferences: EditorPreferences,
): void {
  if (typeof window === "undefined") return;

  // Save to doc-specific (for history/backup) and global (for current "user level" experience)
  const prefsString = JSON.stringify(preferences);
  window.localStorage.setItem(keyForDoc(docId), prefsString);
  window.localStorage.setItem(GLOBAL_PREFS_KEY, prefsString);
}
