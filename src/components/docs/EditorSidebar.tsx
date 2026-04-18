import { memo } from "react";
import { MessageSquare, Type, Sparkles, LayoutGrid, Download, Palette, Moon, Sun } from "lucide-react";
import EditorSettingsPanel from "@/components/docs/EditorSettingsPanel";
import type { StoredComment } from "@/lib/documents-types";
import { editorThemes, getEditorTheme, type EditorTheme } from "@/lib/editor-themes";

interface EditorStats {
    words: number;
    characters: number;
}

interface EditorSidebarProps {
    activePanel: string | null;
    setActivePanel: (v: string | null | ((prev: string | null) => string | null)) => void;
    activePanelTitle: string;
    theme: EditorTheme;
    setTheme: (v: EditorTheme) => void;
    fontStyle: string;
    setFontStyle: (v: string) => void;
    fontSize: "small" | "default" | "large";
    setFontSize: (v: "small" | "default" | "large") => void;
    pageWidth: "default" | "full";
    setPageWidth: (v: "default" | "full") => void;
    coverImage: boolean;
    setCoverImage: (v: boolean) => void;
    pageIconTitle: boolean;
    setPageIconTitle: (v: boolean) => void;
    owners: boolean;
    setOwners: (v: boolean) => void;
    contributors: boolean;
    setContributors: (v: boolean) => void;
    subtitle: boolean;
    setSubtitle: (v: boolean) => void;
    lastModified: boolean;
    setLastModified: (v: boolean) => void;
    pageOutline: boolean;
    setPageOutline: (v: boolean) => void;
    focusBlock: boolean;
    setFocusBlock: (v: boolean) => void;
    focusPage: boolean;
    setFocusPage: (v: boolean) => void;
    showStatsOnPage: boolean;
    setShowStatsOnPage: (v: boolean) => void;
    stats: EditorStats;
    readingTimeMinutes: number;
    comments: StoredComment[];
    onAddComment: (content: string) => Promise<void>;
    isAddingComment: boolean;
    onExport: (format: "markdown" | "text") => void;
    disabledPanelIds?: string[];
}

function EditorSidebar(props: EditorSidebarProps) {
    const isPanelOpen = props.activePanel !== null;
    const disabledPanelIds = props.disabledPanelIds ?? [];
    const activeTheme = getEditorTheme(props.theme);

    return (
        <div className="flex shrink-0">
            {isPanelOpen && (
                <EditorSettingsPanel
                    activePanelTitle={props.activePanelTitle}
                    activePanel={props.activePanel}
                    onClose={() => props.setActivePanel(null)}
                    theme={props.theme}
                    setTheme={props.setTheme}
                    fontStyle={props.fontStyle}
                    setFontStyle={props.setFontStyle}
                    fontSize={props.fontSize}
                    setFontSize={props.setFontSize}
                    pageWidth={props.pageWidth}
                    setPageWidth={props.setPageWidth}
                    coverImage={props.coverImage}
                    setCoverImage={props.setCoverImage}
                    pageIconTitle={props.pageIconTitle}
                    setPageIconTitle={props.setPageIconTitle}
                    owners={props.owners}
                    setOwners={props.setOwners}
                    contributors={props.contributors}
                    setContributors={props.setContributors}
                    subtitle={props.subtitle}
                    setSubtitle={props.setSubtitle}
                    lastModified={props.lastModified}
                    setLastModified={props.setLastModified}
                    pageOutline={props.pageOutline}
                    setPageOutline={props.setPageOutline}
                    focusBlock={props.focusBlock}
                    setFocusBlock={props.setFocusBlock}
                    focusPage={props.focusPage}
                    setFocusPage={props.setFocusPage}
                    showStatsOnPage={props.showStatsOnPage}
                    setShowStatsOnPage={props.setShowStatsOnPage}
                    stats={props.stats}
                    readingTimeMinutes={props.readingTimeMinutes}
                    comments={props.comments}
                    onAddComment={props.onAddComment}
                    isAddingComment={props.isAddingComment}
                    onExport={props.onExport}
                />
            )}

            <div className="w-10 border-l border-gray-200 bg-white flex flex-col items-center py-3 gap-1">
                {[
                    { id: "comments", icon: MessageSquare },
                    { id: "styles", icon: Type },
                    { id: "themes", icon: Palette },
                    { id: "ai", icon: Sparkles },
                    { id: "templates", icon: LayoutGrid },
                    { id: "export", icon: Download },
                ].map((item) => {
                    const isDisabled = disabledPanelIds.includes(item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (isDisabled) return;
                                props.setActivePanel((prev) => (prev === item.id ? null : item.id));
                            }}
                            title={isDisabled ? `Available after sign in` : `Open ${item.id} panel`}
                            disabled={isDisabled}
                            className={`p-1.5 rounded-md transition-colors ${props.activePanel === item.id
                                ? "bg-indigo-100 text-indigo-600"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                } cursor-pointer disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                            <item.icon size={17} />
                        </button>
                    );
                }
                )}

                <div className="mt-auto pb-1 flex flex-col items-center gap-1">
                    <button
                        onClick={() => {
                            const currentMode = activeTheme.mode;
                            const nextMode = currentMode === "light" ? "dark" : "light";
                            const modeThemes = editorThemes.filter((themeOption) => themeOption.mode === nextMode);
                            if (modeThemes.length === 0) return;

                            // Keep the relative index when switching mode for a predictable toggle.
                            const currentModeThemes = editorThemes.filter((themeOption) => themeOption.mode === currentMode);
                            const currentIndexInMode = currentModeThemes.findIndex((themeOption) => themeOption.key === props.theme);
                            const nextIndexInMode = currentIndexInMode >= 0
                                ? currentIndexInMode % modeThemes.length
                                : 0;

                            props.setTheme(modeThemes[nextIndexInMode].key);
                        }}
                        title={activeTheme.mode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        {activeTheme.mode === "light" ? <Moon size={17} /> : <Sun size={17} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

function sameDisabledPanels(previous?: string[], next?: string[]) {
    const prev = previous ?? [];
    const curr = next ?? [];
    if (prev.length !== curr.length) return false;
    return prev.every((value, index) => value === curr[index]);
}

export default memo(EditorSidebar, (prev, next) => {
    // When the settings panel is open, always rerender to keep controls/live values fresh.
    if (prev.activePanel !== null || next.activePanel !== null) {
        return false;
    }

    // With the panel closed, keep the slim rail stable while typing in the editor.
    return (
        prev.activePanel === next.activePanel &&
        prev.theme === next.theme &&
        sameDisabledPanels(prev.disabledPanelIds, next.disabledPanelIds)
    );
});
