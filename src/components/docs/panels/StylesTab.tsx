import {
    Image, Smile, Users, UserPlus, CaseSensitive, Clock,
    Globe, GitBranch, ListTree, AlignJustify, FileText, Focus,
} from "lucide-react";

interface EditorStats {
    words: number;
    characters: number;
}

interface StylesTabProps {
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
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            title={enabled ? "Disable option" : "Enable option"}
            className={`relative w-8 h-4.5 rounded-full transition-colors shrink-0 cursor-pointer ${enabled ? "bg-indigo-500" : "bg-gray-300"}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-3.5" : "translate-x-0"}`} />
        </button>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-1">{children}</p>;
}

function ToggleRow({ icon: Icon, label, enabled, onChange }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    enabled: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-1.25">
            <div className="flex items-center gap-2 text-gray-600">
                <Icon size={13} className="text-gray-400 shrink-0" />
                <span className="text-xs">{label}</span>
            </div>
            <Toggle enabled={enabled} onChange={onChange} />
        </div>
    );
}

const FONT_OPTIONS = [
    { key: "font-system", label: "System", preview: "Aa", style: undefined },
    { key: "font-serif", label: "Serif", preview: "Ss", style: { fontFamily: "Georgia, serif" } },
    { key: "font-mono", label: "Mono", preview: "00", style: { fontFamily: "monospace" } },
];

function FontSizeIcon({ size }: { size: "small" | "default" | "large" }) {
    const textSize = size === "small" ? "text-xs" : size === "large" ? "text-base" : "text-sm";
    const lineW = size === "small" ? 8 : size === "large" ? 13 : 10;
    return (
        <div className="flex items-center gap-1">
            <span className={`font-semibold leading-none ${textSize}`}>Aa</span>
            <div className="flex flex-col gap-0.75 justify-center">
                <div className="bg-current rounded-full opacity-60" style={{ width: lineW, height: 1.5 }} />
                <div className="bg-current rounded-full opacity-40" style={{ width: lineW + 3, height: 1.5 }} />
            </div>
        </div>
    );
}

export default function StylesTab(props: StylesTabProps) {
    return (
        <>
            <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Font style</label>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
                {FONT_OPTIONS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => props.setFontStyle(f.key)}
                        title={`Use ${f.label} font style`}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-colors cursor-pointer ${props.fontStyle === f.key ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                    >
                        <span className="text-base font-semibold" style={f.style}>{f.preview}</span>
                        <span className="text-[10px]">{f.label}</span>
                    </button>
                ))}
            </div>

            <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Font size</label>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
                {(["small", "default", "large"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => props.setFontSize(s)}
                        title={`Set font size to ${s}`}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-colors cursor-pointer ${props.fontSize === s ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                    >
                        <FontSizeIcon size={s} />
                        <span className="text-[10px] capitalize">{s}</span>
                    </button>
                ))}
            </div>

            <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Page width</label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
                {(["default", "full"] as const).map((w) => (
                    <button
                        key={w}
                        onClick={() => props.setPageWidth(w)}
                        title={`Switch page width to ${w === "default" ? "Default" : "Full width"}`}
                        className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${props.pageWidth === w ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                    >
                        {w === "default" ? "Default" : "Full width"}
                    </button>
                ))}
            </div>

            <p className="text-[11px] text-gray-400 mt-2 mb-1 cursor-pointer hover:text-indigo-500 transition-colors text-center">
                Apply typography to all pages
            </p>

            <hr className="border-gray-200 mt-2" />

            <SectionLabel>Header</SectionLabel>
            <ToggleRow icon={Image} label="Cover image" enabled={props.coverImage} onChange={props.setCoverImage} />
            <ToggleRow icon={Smile} label="Page icon & title" enabled={props.pageIconTitle} onChange={props.setPageIconTitle} />
            <ToggleRow icon={Users} label="Owners" enabled={props.owners} onChange={props.setOwners} />
            <ToggleRow icon={UserPlus} label="Contributors" enabled={props.contributors} onChange={props.setContributors} />
            <ToggleRow icon={CaseSensitive} label="Subtitle" enabled={props.subtitle} onChange={props.setSubtitle} />
            <ToggleRow icon={Clock} label="Last modified" enabled={props.lastModified} onChange={props.setLastModified} />

            <hr className="border-gray-200 mt-1.5" />

            <SectionLabel>Sections</SectionLabel>
            <div className="flex items-center justify-between py-1.25">
                <div className="flex items-center gap-2 text-gray-600">
                    <Globe size={13} className="text-gray-400 shrink-0" />
                    <span className="text-xs">Subpages</span>
                </div>
                <span className="text-[11px] text-gray-400">Table &rsaquo;</span>
            </div>
            <div className="flex items-center justify-between py-1.25">
                <div className="flex items-center gap-2 text-gray-600">
                    <GitBranch size={13} className="text-gray-400 shrink-0" />
                    <span className="text-xs">Relationships</span>
                </div>
                <span className="text-[11px] text-gray-400">Dialog &rsaquo;</span>
            </div>
            <ToggleRow icon={ListTree} label="Page outline" enabled={props.pageOutline} onChange={props.setPageOutline} />

            <hr className="border-gray-200 mt-1.5" />

            <SectionLabel>Focus mode</SectionLabel>
            <ToggleRow icon={AlignJustify} label="Block" enabled={props.focusBlock} onChange={props.setFocusBlock} />
            <ToggleRow icon={FileText} label="Page" enabled={props.focusPage} onChange={props.setFocusPage} />

            <hr className="border-gray-200 mt-1.5" />

            <SectionLabel>Stats</SectionLabel>
            <div className="space-y-1">
                <div className="flex items-center justify-between text-gray-600">
                    <span className="text-xs">Word count</span>
                    <span className="text-xs text-gray-400">{props.stats.words}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                    <span className="text-xs">Characters</span>
                    <span className="text-xs text-gray-400">{props.stats.characters}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                    <span className="text-xs">Reading time</span>
                    <span className="text-xs text-gray-400">{props.readingTimeMinutes} min</span>
                </div>
            </div>
            <div className="mt-2">
                <ToggleRow icon={Focus} label="Show stats on page" enabled={props.showStatsOnPage} onChange={props.setShowStatsOnPage} />
            </div>
        </>
    );
}
