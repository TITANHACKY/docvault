export type EditorThemeMode = "light" | "dark";

export interface EditorThemePalette {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  prose: string;
}

export interface EditorThemeDefinition {
  key: string;
  label: string;
  mode: EditorThemeMode;
  accent: string;
  palette: EditorThemePalette;
}

export const editorThemes = [
  // ── Light themes ────────────────────────────────────────────
  {
    key: "docvault-light",
    label: "Classic Light",
    mode: "light",
    accent: "#8b5cf6",
    palette: {
      bg: "#f8fafc",
      surface: "#ffffff",
      surfaceMuted: "#f1f5f9",
      border: "#dbe2ea",
      text: "#1f2937",
      textMuted: "#64748b",
      prose: "#1f2937",
    },
  },
  {
    key: "claude-light",
    label: "Claude Light",
    mode: "light",
    accent: "#c96442",
    palette: {
      bg: "#faf9f7",
      surface: "#ffffff",
      surfaceMuted: "#f5f0eb",
      border: "#e8e0d6",
      text: "#1c1917",
      textMuted: "#78716c",
      prose: "#1c1917",
    },
  },
  {
    key: "notion-light",
    label: "Notion",
    mode: "light",
    accent: "#2383e2",
    palette: {
      bg: "#ffffff",
      surface: "#ffffff",
      surfaceMuted: "#f7f7f5",
      border: "#e9e9e7",
      text: "#1f1f1f",
      textMuted: "#9b9b9b",
      prose: "#1f1f1f",
    },
  },
  {
    key: "everforest-light",
    label: "Everforest Light",
    mode: "light",
    accent: "#5a8a3c",
    palette: {
      bg: "#f3ead3",
      surface: "#efe4cc",
      surfaceMuted: "#e6dcc3",
      border: "#b7b27a",
      text: "#4d3a2d",
      textMuted: "#6c5a46",
      prose: "#3f2f24",
    },
  },
  // ── Dark themes ─────────────────────────────────────────────
  {
    key: "claude-dark",
    label: "Claude Dark",
    mode: "dark",
    accent: "#c96442",
    palette: {
      bg: "#1c1917",
      surface: "#242120",
      surfaceMuted: "#2e2b29",
      border: "#3d3835",
      text: "#f5f0e8",
      textMuted: "#a8a29e",
      prose: "#f5f0e8",
    },
  },
  {
    key: "docvault-dark",
    label: "Classic Dark",
    mode: "dark",
    accent: "#8b5cf6",
    palette: {
      bg: "#0b1020",
      surface: "#111827",
      surfaceMuted: "#172033",
      border: "#2a3a53",
      text: "#e2e8f0",
      textMuted: "#94a3b8",
      prose: "#e5e7eb",
    },
  },
  {
    key: "dark-and-light",
    label: "Dark & Light",
    mode: "dark",
    accent: "#f8fafc",
    palette: {
      bg: "#090909",
      surface: "#0f0f0f",
      surfaceMuted: "#141414",
      border: "#3f3f46",
      text: "#fafafa",
      textMuted: "#a1a1aa",
      prose: "#f4f4f5",
    },
  },
  {
    key: "catppuccin-mocha-blue",
    label: "Catppuccin Mocha",
    mode: "dark",
    accent: "#89b4fa",
    palette: {
      bg: "#1e1e2e",
      surface: "#181825",
      surfaceMuted: "#313244",
      border: "#45475a",
      text: "#cdd6f4",
      textMuted: "#a6adc8",
      prose: "#cdd6f4",
    },
  },
  {
    key: "rose-pine",
    label: "Rosé Pine",
    mode: "dark",
    accent: "#eb6f92",
    palette: {
      bg: "#191724",
      surface: "#1f1d2e",
      surfaceMuted: "#26233a",
      border: "#403d52",
      text: "#e0def4",
      textMuted: "#908caa",
      prose: "#e0def4",
    },
  },
  {
    key: "linear-dark",
    label: "Linear",
    mode: "dark",
    accent: "#5e6ad2",
    palette: {
      bg: "#0f0f11",
      surface: "#161618",
      surfaceMuted: "#1e1e21",
      border: "#2e2e33",
      text: "#f0f0f2",
      textMuted: "#8a8a94",
      prose: "#f0f0f2",
    },
  },
  {
    key: "proton-carbon",
    label: "Proton Carbon",
    mode: "dark",
    accent: "#8b5cf6",
    palette: {
      bg: "#111827",
      surface: "#0f172a",
      surfaceMuted: "#1e293b",
      border: "#4338ca",
      text: "#e5e7eb",
      textMuted: "#a5b4fc",
      prose: "#e2e8f0",
    },
  },
  {
    key: "everforest-dark",
    label: "Everforest Dark",
    mode: "dark",
    accent: "#a3be8c",
    palette: {
      bg: "#2b3339",
      surface: "#2f383e",
      surfaceMuted: "#374145",
      border: "#4f5b58",
      text: "#d3c6aa",
      textMuted: "#9da9a0",
      prose: "#e1d5bc",
    },
  },
] as const satisfies ReadonlyArray<EditorThemeDefinition>;

export type EditorTheme = (typeof editorThemes)[number]["key"];

const GLOBAL_THEME_STORAGE_KEY = "doc-editor:theme:v1";

export function isEditorTheme(value: string): value is EditorTheme {
  return editorThemes.some((theme) => theme.key === value);
}

export function getEditorTheme(theme: EditorTheme): EditorThemeDefinition {
  return (
    editorThemes.find((item) => item.key === theme) ??
    editorThemes.find((item) => item.key === "docvault-light") ??
    editorThemes[0]
  );
}

export function loadGlobalEditorTheme(): EditorTheme | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(GLOBAL_THEME_STORAGE_KEY);
  if (!raw) return null;
  return isEditorTheme(raw) ? raw : null;
}

export function saveGlobalEditorTheme(theme: EditorTheme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, theme);
}
