import {
  getEditorTheme,
  loadGlobalEditorTheme,
  type EditorTheme,
} from "@/lib/editor-themes";

function setRootThemeVars(theme: EditorTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;
  const definition = getEditorTheme(theme);

  root.dataset.editorTheme = definition.key;
  root.dataset.editorThemeMode = definition.mode;

  root.style.setProperty("--editor-bg", definition.palette.bg);
  root.style.setProperty("--editor-surface", definition.palette.surface);
  root.style.setProperty(
    "--editor-surface-muted",
    definition.palette.surfaceMuted,
  );
  root.style.setProperty("--editor-border", definition.palette.border);
  root.style.setProperty("--editor-text", definition.palette.text);
  root.style.setProperty("--editor-text-muted", definition.palette.textMuted);
  root.style.setProperty("--editor-prose", definition.palette.prose);
  root.style.setProperty("--editor-accent", definition.accent);

  const scrollbarTrack =
    definition.mode === "dark"
      ? "rgba(148, 163, 184, 0.14)"
      : "rgba(148, 163, 184, 0.20)";
  const scrollbarThumb =
    definition.mode === "dark"
      ? "rgba(148, 163, 184, 0.44)"
      : "rgba(100, 116, 139, 0.45)";
  const scrollbarThumbHover =
    definition.mode === "dark"
      ? "rgba(148, 163, 184, 0.62)"
      : "rgba(71, 85, 105, 0.62)";

  root.style.setProperty("--editor-scrollbar-track", scrollbarTrack);
  root.style.setProperty("--editor-scrollbar-thumb", scrollbarThumb);
  root.style.setProperty("--editor-scrollbar-thumb-hover", scrollbarThumbHover);

  root.classList.toggle("editor-theme-dark", definition.mode === "dark");
  root.classList.toggle("editor-theme-light", definition.mode !== "dark");

  if (body) {
    body.dataset.editorTheme = definition.key;
    body.dataset.editorThemeMode = definition.mode;
    body.classList.toggle("editor-theme-dark", definition.mode === "dark");
    body.classList.toggle("editor-theme-light", definition.mode !== "dark");
  }
}

export function applyEditorThemeToHtml(theme: EditorTheme) {
  setRootThemeVars(theme);
}

export function hydrateEditorThemeFromStorage() {
  const theme = loadGlobalEditorTheme() ?? "docvault-light";
  setRootThemeVars(theme);
}
