import { ChevronsRight } from "lucide-react";
import type { StoredComment } from "@/lib/documents-types";
import type { EditorTheme } from "@/lib/editor-themes";
import CommentsTab from "./panels/CommentsTab";
import ExportTab from "./panels/ExportTab";
import ThemesTab from "./panels/ThemesTab";
import StylesTab from "./panels/StylesTab";

interface EditorStats {
    words: number;
    characters: number;
}

interface EditorSettingsPanelProps {
    activePanelTitle: string;
    activePanel: string | null;
    onClose: () => void;
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
}

function renderPanelContent(panel: string | null, props: EditorSettingsPanelProps) {
    if (panel === "comments") {
        return <CommentsTab comments={props.comments} onAddComment={props.onAddComment} isAddingComment={props.isAddingComment} />;
    }
    if (panel === "themes") {
        return <ThemesTab activePanel={panel} theme={props.theme} setTheme={props.setTheme} />;
    }
    if (panel === "export") {
        return <ExportTab onExport={props.onExport} />;
    }
    if (panel === "styles") {
        return (
            <StylesTab
                fontStyle={props.fontStyle} setFontStyle={props.setFontStyle}
                fontSize={props.fontSize} setFontSize={props.setFontSize}
                pageWidth={props.pageWidth} setPageWidth={props.setPageWidth}
                coverImage={props.coverImage} setCoverImage={props.setCoverImage}
                pageIconTitle={props.pageIconTitle} setPageIconTitle={props.setPageIconTitle}
                owners={props.owners} setOwners={props.setOwners}
                contributors={props.contributors} setContributors={props.setContributors}
                subtitle={props.subtitle} setSubtitle={props.setSubtitle}
                lastModified={props.lastModified} setLastModified={props.setLastModified}
                pageOutline={props.pageOutline} setPageOutline={props.setPageOutline}
                focusBlock={props.focusBlock} setFocusBlock={props.setFocusBlock}
                focusPage={props.focusPage} setFocusPage={props.setFocusPage}
                showStatsOnPage={props.showStatsOnPage} setShowStatsOnPage={props.setShowStatsOnPage}
                stats={props.stats} readingTimeMinutes={props.readingTimeMinutes}
            />
        );
    }
    return (
        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
            {props.activePanelTitle} panel is in progress for this POC.
        </div>
    );
}

export default function EditorSettingsPanel(props: EditorSettingsPanelProps) {
    return (
        <aside className="w-60 border-l border-gray-200 bg-white overflow-y-auto max-h-screen">
            <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-gray-800">{props.activePanelTitle}</h2>
                    <button
                        onClick={props.onClose}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 cursor-pointer"
                        title="Close panel"
                    >
                        <ChevronsRight size={14} />
                    </button>
                </div>
                {renderPanelContent(props.activePanel, props)}
            </div>
        </aside>
    );
}
