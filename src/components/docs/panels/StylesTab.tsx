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
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${enabled ? "bg-indigo-500" : "bg-gray-300"}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
        </button>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-1.5">{children}</p>;
}

function ToggleRow({ icon: Icon, label, enabled, onChange }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    enabled: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 text-gray-600">
                <Icon size={14} className="text-gray-400" />
                <span className="text-xs">{label}</span>
            </div>
            <Toggle enabled={enabled} onChange={onChange} />
        </div>
    );
}

const FONT_OPTIONS = [
    { key: "font-system", label: "System", preview: "Aa" },
    { key: "font-serif", label: "Serif", preview: "Ss" },
    { key: "font-mono", label: "Mono", preview: "00" },
];

const SIZE_OPTIONS: { key: "small" | "default" | "large"; label: string }[] = [
    { key: "small", label: "Small" },
    { key: "default", label: "Default" },
    { key: "large", label: "Large" },
];

export default function StylesTab(props: StylesTabProps) {
    return (
        <>
            <label className="text-xs font-medium text-gray-500 block mb-2">Font style</label>
            <div className="grid grid-cols-3 gap-2 mb-5">
                {FONT_OPTIONS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => props.setFontStyle(f.key)}
                        title={`Use ${f.label} font style`}
                        className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors cursor-pointer ${props.fontStyle === f.key ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                    >
                        <span className="text-lg font-medium">{f.preview}</span>
                        <span className="text-[11px]">{f.label}</span>
                    </button>
                ))}
            </div>

            <label className="text-xs font-medium text-gray-500 block mb-2">Font size</label>
            <div className="grid grid-cols-3 gap-2 mb-5">
                {SIZE_OPTIONS.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => props.setFontSize(s.key)}
                        title={`Set font size to ${s.label}`}
                        className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors cursor-pointer ${props.fontSize === s.key ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                    >
                        <span className={`font-medium ${s.key === "small" ? "text-sm" : s.key === "large" ? "text-xl" : "text-base"}`}>Aa</span>
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
                        className={`py-2 text-sm rounded-lg border transition-colors cursor-pointer ${props.pageWidth === w ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
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
}
