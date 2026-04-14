import {
    Image,
    Smile,
    Users,
    UserPlus,
    CaseSensitive,
    Clock,
    Globe,
    GitBranch,
    ListTree,
    AlignJustify,
    FileText,
    Focus,
    ChevronsRight,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import type { StoredComment } from "@/lib/documents-types";
import { editorThemes, type EditorTheme } from "@/lib/editor-themes";

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

function Toggle({
    enabled,
    onChange,
}: {
    enabled: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            title={enabled ? "Disable option" : "Enable option"}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${enabled ? "bg-indigo-500" : "bg-gray-300"}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`}
            />
        </button>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2">
            {children}
        </p>
    );
}

function ToggleRow({
    icon: Icon,
    label,
    enabled,
    onChange,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    enabled: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2.5 text-gray-600">
                <Icon size={16} className="text-gray-400" />
                <span className="text-sm">{label}</span>
            </div>
            <Toggle enabled={enabled} onChange={onChange} />
        </div>
    );
}

export default function EditorSettingsPanel(props: EditorSettingsPanelProps) {
    const { setTheme } = props;
    const [commentDraft, setCommentDraft] = useState("");
    const [themeFilter, setThemeFilter] = useState<"all" | "dark" | "light">("all");
    const themeIndex = useMemo(
        () => editorThemes.findIndex((themeOption) => themeOption.key === props.theme),
        [props.theme],
    );

    const setThemeByIndex = useCallback(
        (nextIndex: number) => {
            const normalizedIndex = (nextIndex + editorThemes.length) % editorThemes.length;
            setTheme(editorThemes[normalizedIndex].key);
        },
        [setTheme],
    );

    const handlePreviousTheme = useCallback(() => {
        setThemeByIndex(themeIndex - 1);
    }, [setThemeByIndex, themeIndex]);

    const handleNextTheme = useCallback(() => {
        setThemeByIndex(themeIndex + 1);
    }, [setThemeByIndex, themeIndex]);

    const handlePreviousRowTheme = useCallback(() => {
        // 2-column theme grid: previous row is index - 2
        setThemeByIndex(themeIndex - 2);
    }, [setThemeByIndex, themeIndex]);

    const handleNextRowTheme = useCallback(() => {
        // 2-column theme grid: next row is index + 2
        setThemeByIndex(themeIndex + 2);
    }, [setThemeByIndex, themeIndex]);

    useEffect(() => {
        if (props.activePanel !== "themes") return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.key) {
                case "ArrowLeft":
                    event.preventDefault();
                    handlePreviousTheme();
                    break;
                case "ArrowRight":
                    event.preventDefault();
                    handleNextTheme();
                    break;
                case "ArrowUp":
                    event.preventDefault();
                    handlePreviousRowTheme();
                    break;
                case "ArrowDown":
                    event.preventDefault();
                    handleNextRowTheme();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        props.activePanel,
        handlePreviousTheme,
        handleNextTheme,
        handlePreviousRowTheme,
        handleNextRowTheme,
    ]);

    const visibleThemes = useMemo(() => {
        if (themeFilter === "all") return editorThemes;
        return editorThemes.filter((themeOption) => themeOption.mode === themeFilter);
    }, [themeFilter]);

    const fontOptions = [
        { key: "font-system", label: "System", preview: "Aa" },
        { key: "font-serif", label: "Serif", preview: "Ss" },
        { key: "font-mono", label: "Mono", preview: "00" },
    ];

    const sizeOptions: { key: "small" | "default" | "large"; label: string }[] = [
        { key: "small", label: "Small" },
        { key: "default", label: "Default" },
        { key: "large", label: "Large" },
    ];

    const handleAddComment = async () => {
        const nextValue = commentDraft.trim();
        if (!nextValue) return;
        await props.onAddComment(nextValue);
        setCommentDraft("");
    };

    const renderCommentsPanel = () => {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-3">
                    <label className="mb-2 block text-xs font-medium text-gray-500">New comment</label>
                    <textarea
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        placeholder="Add a comment..."
                        className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                    <button
                        onClick={() => {
                            void handleAddComment();
                        }}
                        disabled={props.isAddingComment || !commentDraft.trim()}
                        className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        title="Add comment"
                    >
                        {props.isAddingComment ? "Adding..." : "Add comment"}
                    </button>
                </div>

                <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Thread</p>
                    {props.comments.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                            No comments yet.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {props.comments.map((comment) => (
                                <li key={comment.id} className="rounded-lg border border-gray-200 p-3">
                                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                                        <span className="font-medium text-gray-700">{comment.author}</span>
                                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
    };

    const renderExportPanel = () => {
        return (
            <div className="space-y-3">
                <p className="text-sm text-gray-500">Export the current document to a file.</p>
                <button
                    onClick={() => props.onExport("markdown")}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    title="Export current page as Markdown"
                >
                    Export as Markdown (.md)
                </button>
                <button
                    onClick={() => props.onExport("text")}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    title="Export current page as plain text"
                >
                    Export as Plain Text (.txt)
                </button>
            </div>
        );
    };

    const renderThemesPanel = () => {
        return (
            <>
                <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 flex-1">Quick Switch (Use Arrows)</span>
                    <div className="flex gap-1">
                        <button
                            onClick={handlePreviousRowTheme}
                            className="p-1 px-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                            title="Previous row (Arrow Up)"
                        >
                            <ArrowUp size={14} />
                        </button>
                        <button
                            onClick={handleNextRowTheme}
                            className="p-1 px-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                            title="Next row (Arrow Down)"
                        >
                            <ArrowDown size={14} />
                        </button>
                        <button
                            onClick={handlePreviousTheme}
                            className="p-1 px-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                            title="Previous theme (Arrow Left)"
                        >
                            <ArrowLeft size={14} />
                        </button>
                        <button
                            onClick={handleNextTheme}
                            className="p-1 px-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                            title="Next theme (Arrow Right)"
                        >
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                <div className="mb-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                    {([
                        { key: "all", label: "All" },
                        { key: "dark", label: "Dark" },
                        { key: "light", label: "Light" },
                    ] as const).map((filterOption) => (
                        <button
                            key={filterOption.key}
                            onClick={() => setThemeFilter(filterOption.key)}
                            className={`rounded-md px-2.5 py-1 text-xs transition-colors ${themeFilter === filterOption.key
                                ? "bg-gray-900 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                                } cursor-pointer`}
                            title={`Show ${filterOption.label.toLowerCase()} themes`}
                        >
                            {filterOption.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {visibleThemes.map((themeOption) => {
                        const isActive = props.theme === themeOption.key;
                        return (
                            <button
                                key={themeOption.key}
                                onClick={() => props.setTheme(themeOption.key)}
                                title={`Use ${themeOption.label} theme`}
                                className={`rounded-xl border text-left transition-colors cursor-pointer ${isActive
                                    ? "ring-2 ring-indigo-300"
                                    : "hover:bg-gray-50"
                                    }`}
                                style={{
                                    borderColor: themeOption.accent,
                                    backgroundColor: themeOption.palette.surface,
                                }}
                            >
                                <div
                                    className="h-10 rounded-t-xl border-b"
                                    style={{
                                        backgroundColor: themeOption.palette.bg,
                                        borderBottomColor: themeOption.palette.border,
                                    }}
                                />
                                <div className="px-2 py-1.5">
                                    <p className="text-[11px] font-semibold" style={{ color: themeOption.palette.text }}>
                                        {themeOption.label}
                                    </p>
                                    <p className="text-[10px] uppercase tracking-wide" style={{ color: themeOption.palette.textMuted }}>
                                        {themeOption.mode}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </>
        );
    };

    const renderStylesPanel = () => {
        return (
            <>
                <label className="text-xs font-medium text-gray-500 block mb-2">Font style</label>
                <div className="grid grid-cols-3 gap-2 mb-5">
                    {fontOptions.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => props.setFontStyle(f.key)}
                            title={`Use ${f.label} font style`}
                            className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors ${props.fontStyle === f.key
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                                } cursor-pointer`}
                        >
                            <span className="text-lg font-medium">{f.preview}</span>
                            <span className="text-[11px]">{f.label}</span>
                        </button>
                    ))}
                </div>

                <label className="text-xs font-medium text-gray-500 block mb-2">Font size</label>
                <div className="grid grid-cols-3 gap-2 mb-5">
                    {sizeOptions.map((s) => (
                        <button
                            key={s.key}
                            onClick={() => props.setFontSize(s.key)}
                            title={`Set font size to ${s.label}`}
                            className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors ${props.fontSize === s.key
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                                } cursor-pointer`}
                        >
                            <span className={`font-medium ${s.key === "small" ? "text-sm" : s.key === "large" ? "text-xl" : "text-base"}`}>
                                Aa
                            </span>
                            <span className="text-[11px]">{s.label}</span>
                        </button>
                    ))}
                </div>

                <label className="text-xs font-medium text-gray-500 block mb-2">Page width</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {(["default", "full"] as const).map((w) => (
                        <button
                            key={w}
                            onClick={() => props.setPageWidth(w)}
                            title={`Switch page width to ${w === "default" ? "Default" : "Full width"}`}
                            className={`py-2 text-sm rounded-lg border transition-colors ${props.pageWidth === w
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                                } cursor-pointer`}
                        >
                            {w === "default" ? "Default" : "Full width"}
                        </button>
                    ))}
                </div>

                <p className="text-xs text-gray-400 mb-4 cursor-pointer hover:text-indigo-500 transition-colors">
                    Apply typography to all pages
                </p>

                <hr className="border-gray-200" />

                <SectionLabel>Header</SectionLabel>
                <ToggleRow icon={Image} label="Cover image" enabled={props.coverImage} onChange={props.setCoverImage} />
                <ToggleRow icon={Smile} label="Page icon & title" enabled={props.pageIconTitle} onChange={props.setPageIconTitle} />
                <ToggleRow icon={Users} label="Owners" enabled={props.owners} onChange={props.setOwners} />
                <ToggleRow icon={UserPlus} label="Contributors" enabled={props.contributors} onChange={props.setContributors} />
                <ToggleRow icon={CaseSensitive} label="Subtitle" enabled={props.subtitle} onChange={props.setSubtitle} />
                <ToggleRow icon={Clock} label="Last modified" enabled={props.lastModified} onChange={props.setLastModified} />

                <hr className="border-gray-200 mt-2" />

                <SectionLabel>Sections</SectionLabel>
                <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5 text-gray-600">
                        <Globe size={16} className="text-gray-400" />
                        <span className="text-sm">Subpages</span>
                    </div>
                    <span className="text-xs text-gray-400">Table &rsaquo;</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5 text-gray-600">
                        <GitBranch size={16} className="text-gray-400" />
                        <span className="text-sm">Relationships</span>
                    </div>
                    <span className="text-xs text-gray-400">Dialog &rsaquo;</span>
                </div>
                <ToggleRow icon={ListTree} label="Page outline" enabled={props.pageOutline} onChange={props.setPageOutline} />

                <hr className="border-gray-200 mt-2" />

                <SectionLabel>Focus mode</SectionLabel>
                <ToggleRow icon={AlignJustify} label="Block" enabled={props.focusBlock} onChange={props.setFocusBlock} />
                <ToggleRow icon={FileText} label="Page" enabled={props.focusPage} onChange={props.setFocusPage} />

                <hr className="border-gray-200 mt-2" />

                <SectionLabel>Stats</SectionLabel>
                <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between text-gray-600">
                        <span>Word count</span>
                        <span className="text-gray-400">{props.stats.words}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                        <span>Characters</span>
                        <span className="text-gray-400">{props.stats.characters}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                        <span>Reading time</span>
                        <span className="text-gray-400">{props.readingTimeMinutes} min</span>
                    </div>
                </div>
                <div className="mt-3">
                    <ToggleRow icon={Focus} label="Show stats on page" enabled={props.showStatsOnPage} onChange={props.setShowStatsOnPage} />
                </div>
            </>
        );
    };

    const renderPanelContent = () => {
        if (props.activePanel === "styles") return renderStylesPanel();
        if (props.activePanel === "themes") return renderThemesPanel();
        if (props.activePanel === "comments") return renderCommentsPanel();
        if (props.activePanel === "export") return renderExportPanel();

        return (
            <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                {props.activePanelTitle} panel is in progress for this POC.
            </div>
        );
    };

    return (
        <aside className="w-72 border-l border-gray-200 bg-white overflow-y-auto max-h-screen">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-800">{props.activePanelTitle}</h2>
                    <button
                        onClick={props.onClose}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 cursor-pointer"
                        title="Close panel"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>

                {renderPanelContent()}
            </div>
        </aside>
    );
}
