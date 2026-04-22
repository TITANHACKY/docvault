import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { editorThemes, type EditorTheme } from "@/lib/editor-themes";

interface ThemesTabProps {
    activePanel: string | null;
    theme: EditorTheme;
    setTheme: (v: EditorTheme) => void;
}

export default function ThemesTab({ activePanel, theme, setTheme }: ThemesTabProps) {
    const [themeFilter, setThemeFilter] = useState<"all" | "dark" | "light">("all");

    const themeIndex = useMemo(
        () => editorThemes.findIndex((t) => t.key === theme),
        [theme],
    );

    const setThemeByIndex = useCallback(
        (nextIndex: number) => {
            const normalized = (nextIndex + editorThemes.length) % editorThemes.length;
            setTheme(editorThemes[normalized].key);
        },
        [setTheme],
    );

    const handlePrev = useCallback(() => setThemeByIndex(themeIndex - 1), [setThemeByIndex, themeIndex]);
    const handleNext = useCallback(() => setThemeByIndex(themeIndex + 1), [setThemeByIndex, themeIndex]);
    const handlePrevRow = useCallback(() => setThemeByIndex(themeIndex - 2), [setThemeByIndex, themeIndex]);
    const handleNextRow = useCallback(() => setThemeByIndex(themeIndex + 2), [setThemeByIndex, themeIndex]);

    useEffect(() => {
        if (activePanel !== "themes") return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            switch (e.key) {
                case "ArrowLeft": e.preventDefault(); handlePrev(); break;
                case "ArrowRight": e.preventDefault(); handleNext(); break;
                case "ArrowUp": e.preventDefault(); handlePrevRow(); break;
                case "ArrowDown": e.preventDefault(); handleNextRow(); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activePanel, handlePrev, handleNext, handlePrevRow, handleNextRow]);

    const visibleThemes = useMemo(() => {
        if (themeFilter === "all") return editorThemes;
        return editorThemes.filter((t) => t.mode === themeFilter);
    }, [themeFilter]);

    return (
        <>
            <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-500 flex-1">Quick Switch (Use Arrows)</span>
                <div className="flex gap-1">
                    {[
                        { icon: ArrowUp, action: handlePrevRow, title: "Previous row (Arrow Up)" },
                        { icon: ArrowDown, action: handleNextRow, title: "Next row (Arrow Down)" },
                        { icon: ArrowLeft, action: handlePrev, title: "Previous theme (Arrow Left)" },
                        { icon: ArrowRight, action: handleNext, title: "Next theme (Arrow Right)" },
                    ].map(({ icon: Icon, action, title }) => (
                        <button
                            key={title}
                            onClick={action}
                            className="p-1 px-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                            title={title}
                        >
                            <Icon size={14} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                {(["all", "dark", "light"] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setThemeFilter(key)}
                        className={`rounded-md px-2.5 py-1 text-xs transition-colors cursor-pointer ${themeFilter === key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                        title={`Show ${key} themes`}
                    >
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {visibleThemes.map((t) => {
                    const isActive = theme === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTheme(t.key)}
                            title={`Use ${t.label} theme`}
                            className={`rounded-xl border text-left transition-colors cursor-pointer ${isActive ? "ring-2 ring-indigo-300" : "hover:bg-gray-50"}`}
                            style={{ borderColor: t.accent, backgroundColor: t.palette.surface }}
                        >
                            <div className="h-10 rounded-t-xl border-b" style={{ backgroundColor: t.palette.bg, borderBottomColor: t.palette.border }} />
                            <div className="px-2 py-1.5">
                                <p className="text-[11px] font-semibold" style={{ color: t.palette.text }}>{t.label}</p>
                                <p className="text-[10px] uppercase tracking-wide" style={{ color: t.palette.textMuted }}>{t.mode}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
