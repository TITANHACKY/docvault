import { MessageSquare, Type, Sparkles, LayoutGrid, Download } from "lucide-react";
import EditorSettingsPanel from "@/components/docs/EditorSettingsPanel";
import type { StoredComment } from "@/lib/documents-types";

interface EditorStats {
    words: number;
    characters: number;
}

interface EditorSidebarProps {
    activePanel: string | null;
    setActivePanel: (v: string | null | ((prev: string | null) => string | null)) => void;
    activePanelTitle: string;
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
}

export default function EditorSidebar(props: EditorSidebarProps) {
    const isPanelOpen = props.activePanel !== null;

    return (
        <div className="flex shrink-0">
            {isPanelOpen && (
                <EditorSettingsPanel
                    activePanelTitle={props.activePanelTitle}
                    activePanel={props.activePanel}
                    onClose={() => props.setActivePanel(null)}
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
                    { id: "ai", icon: Sparkles },
                    { id: "templates", icon: LayoutGrid },
                    { id: "export", icon: Download },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => props.setActivePanel((prev) => (prev === item.id ? null : item.id))}
                        className={`p-1.5 rounded-md transition-colors ${props.activePanel === item.id
                            ? "bg-indigo-100 text-indigo-600"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <item.icon size={17} />
                    </button>
                ))}
            </div>
        </div>
    );
}
