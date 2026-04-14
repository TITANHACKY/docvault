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
  {
    key: "notesnook-dark",
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
    key: "notesnook-light",
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
    key: "catppuccin-mocha-blue",
    label: "Catppuccin Mocha Blue",
    mode: "dark",
    accent: "#60a5fa",
    palette: {
      bg: "#1e1e2e",
      surface: "#181825",
      surfaceMuted: "#313244",
      border: "#45475a",
      text: "#cdd6f4",
      textMuted: "#a6adc8",
      prose: "#dbe3ff",
    },
  },
  {
    key: "bumble-dark",
    label: "Bumble Dark",
    mode: "dark",
    accent: "#facc15",
    palette: {
      bg: "#111111",
      surface: "#161616",
      surfaceMuted: "#1d1b12",
      border: "#3f3a1f",
      text: "#f9fafb",
      textMuted: "#d1d5db",
      prose: "#f3f4f6",
    },
  },
  {
    key: "pitch-black",
    label: "Pitch Black",
    mode: "dark",
    accent: "#22c55e",
    palette: {
      bg: "#020617",
      surface: "#000000",
      surfaceMuted: "#020b17",
      border: "#172554",
      text: "#dbeafe",
      textMuted: "#93c5fd",
      prose: "#e5efff",
    },
  },
  {
    key: "catppuccin-mocha-mauve",
    label: "Catppuccin Mocha Mauve",
    mode: "dark",
    accent: "#a78bfa",
    palette: {
      bg: "#1e1e2e",
      surface: "#181825",
      surfaceMuted: "#302d41",
      border: "#50466c",
      text: "#d8d4f5",
      textMuted: "#b4abdd",
      prose: "#e8e4ff",
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
    key: "blueberry",
    label: "Blueberry",
    mode: "light",
    accent: "#3b82f6",
    palette: {
      bg: "#f8fbff",
      surface: "#ffffff",
      surfaceMuted: "#eff6ff",
      border: "#bfdbfe",
      text: "#1e3a8a",
      textMuted: "#64748b",
      prose: "#1e3a8a",
    },
  },
  {
    key: "catppuccin-latte-peach",
    label: "Catppuccin Latte Peach",
    mode: "light",
    accent: "#fb923c",
    palette: {
      bg: "#fef7f2",
      surface: "#fdf6ee",
      surfaceMuted: "#fff1e6",
      border: "#fdba74",
      text: "#7c2d12",
      textMuted: "#9a3412",
      prose: "#7c2d12",
    },
  },
  {
    key: "catppuccin-mocha-green",
    label: "Catppuccin Mocha Green",
    mode: "dark",
    accent: "#86efac",
    palette: {
      bg: "#1a1b26",
      surface: "#161821",
      surfaceMuted: "#1f2231",
      border: "#2f3752",
      text: "#d4f8dd",
      textMuted: "#9bb9a4",
      prose: "#ddffe5",
    },
  },
  {
    key: "crimson-carbon",
    label: "Crimson Carbon",
    mode: "dark",
    accent: "#fb7185",
    palette: {
      bg: "#131313",
      surface: "#1a1a1a",
      surfaceMuted: "#242424",
      border: "#7f1d1d",
      text: "#f5f5f5",
      textMuted: "#d4d4d8",
      prose: "#f8fafc",
    },
  },
  {
    key: "cloud",
    label: "Cloud",
    mode: "light",
    accent: "#0ea5e9",
    palette: {
      bg: "#eef5ff",
      surface: "#dde7f3",
      surfaceMuted: "#ccdae9",
      border: "#8fb3d6",
      text: "#1e293b",
      textMuted: "#475569",
      prose: "#0f172a",
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
  {
    key: "catppuccin-latte-sky",
    label: "Catppuccin Latte Sky",
    mode: "light",
    accent: "#38bdf8",
    palette: {
      bg: "#f8fafc",
      surface: "#f6f3ea",
      surfaceMuted: "#f1eee2",
      border: "#bae6fd",
      text: "#0f172a",
      textMuted: "#475569",
      prose: "#0f172a",
    },
  },
  {
    key: "notesnook-blue",
    label: "Classic Blue",
    mode: "light",
    accent: "#2563eb",
    palette: {
      bg: "#f0f6ff",
      surface: "#ffffff",
      surfaceMuted: "#e6f0ff",
      border: "#93c5fd",
      text: "#1e3a8a",
      textMuted: "#475569",
      prose: "#1e3a8a",
    },
  },
  {
    key: "everforest-light",
    label: "Everforest Light",
    mode: "light",
    accent: "#84cc16",
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
] as const satisfies ReadonlyArray<EditorThemeDefinition>;

export type EditorTheme = (typeof editorThemes)[number]["key"];

const GLOBAL_THEME_STORAGE_KEY = "doc-editor:theme:v1";

export function isEditorTheme(value: string): value is EditorTheme {
  return editorThemes.some((theme) => theme.key === value);
}

export function getEditorTheme(theme: EditorTheme): EditorThemeDefinition {
  return (
    editorThemes.find((item) => item.key === theme) ??
    editorThemes.find((item) => item.key === "notesnook-light") ??
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
