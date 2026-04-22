import { useEffect, useState } from "react";
import {
    getEditorTheme,
    isEditorTheme,
    loadGlobalEditorTheme,
    saveGlobalEditorTheme,
    type EditorTheme,
} from "@/lib/editor-themes";
import { applyEditorThemeToHtml } from "@/lib/html-theme";
import { loadEditorPreferences, saveEditorPreferences } from "@/lib/editor-preferences";

export interface EditorPreferences {
    fontStyle: string;
    theme: EditorTheme;
    fontSize: "small" | "default" | "large";
    pageWidth: "default" | "full";
    coverImage: boolean;
    pageIconTitle: boolean;
    owners: boolean;
    contributors: boolean;
    subtitle: boolean;
    lastModified: boolean;
    pageOutline: boolean;
    focusBlock: boolean;
    focusPage: boolean;
    showStatsOnPage: boolean;
    isPagesSidebarOpen: boolean;
}

export interface EditorPreferencesActions {
    setFontStyle: (v: string) => void;
    setTheme: (v: EditorTheme) => void;
    setFontSize: (v: "small" | "default" | "large") => void;
    setPageWidth: (v: "default" | "full") => void;
    setCoverImage: (v: boolean) => void;
    setPageIconTitle: (v: boolean) => void;
    setOwners: (v: boolean) => void;
    setContributors: (v: boolean) => void;
    setSubtitle: (v: boolean) => void;
    setLastModified: (v: boolean) => void;
    setPageOutline: (v: boolean) => void;
    setFocusBlock: (v: boolean) => void;
    setFocusPage: (v: boolean) => void;
    setShowStatsOnPage: (v: boolean) => void;
    setIsPagesSidebarOpen: (v: boolean) => void;
    themeDefinition: ReturnType<typeof getEditorTheme>;
    isDarkTheme: boolean;
    themeModeClass: string;
    fontSizeClass: string;
}

export function useEditorPreferences(docId: string | undefined): [EditorPreferences, EditorPreferencesActions] {
    const [fontStyle, setFontStyle] = useState("font-system");
    const [theme, setTheme] = useState<EditorTheme>(() => {
        if (typeof window === "undefined") return "docvault-light";
        return loadGlobalEditorTheme() ?? "docvault-light";
    });
    const [fontSize, setFontSize] = useState<"small" | "default" | "large">("default");
    const [pageWidth, setPageWidth] = useState<"default" | "full">("default");
    const [coverImage, setCoverImage] = useState(false);
    const [pageIconTitle, setPageIconTitle] = useState(true);
    const [owners, setOwners] = useState(true);
    const [contributors, setContributors] = useState(false);
    const [subtitle, setSubtitle] = useState(false);
    const [lastModified, setLastModified] = useState(true);
    const [pageOutline, setPageOutline] = useState(false);
    const [focusBlock, setFocusBlock] = useState(false);
    const [focusPage, setFocusPage] = useState(true);
    const [showStatsOnPage, setShowStatsOnPage] = useState(true);
    const [isPagesSidebarOpen, setIsPagesSidebarOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(false);
        if (!docId) return;
        const timeout = window.setTimeout(() => {
            const prefs = loadEditorPreferences(docId);
            if (prefs) {
                if (typeof prefs.fontStyle === "string") setFontStyle(prefs.fontStyle);
                if (typeof prefs.theme === "string" && isEditorTheme(prefs.theme)) setTheme(prefs.theme);
                if (prefs.fontSize === "small" || prefs.fontSize === "default" || prefs.fontSize === "large") setFontSize(prefs.fontSize);
                if (prefs.pageWidth === "default" || prefs.pageWidth === "full") setPageWidth(prefs.pageWidth);
                if (typeof prefs.coverImage === "boolean") setCoverImage(prefs.coverImage);
                if (typeof prefs.pageIconTitle === "boolean") setPageIconTitle(prefs.pageIconTitle);
                if (typeof prefs.owners === "boolean") setOwners(prefs.owners);
                if (typeof prefs.contributors === "boolean") setContributors(prefs.contributors);
                if (typeof prefs.subtitle === "boolean") setSubtitle(prefs.subtitle);
                if (typeof prefs.lastModified === "boolean") setLastModified(prefs.lastModified);
                if (typeof prefs.pageOutline === "boolean") setPageOutline(prefs.pageOutline);
                if (typeof prefs.focusBlock === "boolean") setFocusBlock(prefs.focusBlock);
                if (typeof prefs.focusPage === "boolean") setFocusPage(prefs.focusPage);
                if (typeof prefs.showStatsOnPage === "boolean") setShowStatsOnPage(prefs.showStatsOnPage);
                if (typeof prefs.isPagesSidebarOpen === "boolean") setIsPagesSidebarOpen(prefs.isPagesSidebarOpen);
            }
            setHydrated(true);
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [docId]);

    useEffect(() => {
        if (!hydrated) return;
        saveGlobalEditorTheme(theme);
        applyEditorThemeToHtml(theme);
    }, [hydrated, theme]);

    useEffect(() => {
        if (!docId || !hydrated) return;
        const timeout = window.setTimeout(() => {
            saveEditorPreferences(docId, {
                fontStyle, theme, fontSize, pageWidth,
                coverImage, pageIconTitle, owners, contributors,
                subtitle, lastModified, pageOutline, focusBlock,
                focusPage, showStatsOnPage, isPagesSidebarOpen,
            });
        }, 250);
        return () => window.clearTimeout(timeout);
    }, [
        docId, hydrated, fontStyle, theme, fontSize, pageWidth,
        coverImage, pageIconTitle, owners, contributors, subtitle,
        lastModified, pageOutline, focusBlock, focusPage,
        showStatsOnPage, isPagesSidebarOpen,
    ]);

    const themeDefinition = getEditorTheme(theme);
    const isDarkTheme = themeDefinition.mode === "dark";
    const themeModeClass = isDarkTheme ? "editor-theme-dark" : "editor-theme-light";
    const fontSizeClass = fontSize === "small" ? "editor-text-sm" : fontSize === "large" ? "editor-text-lg" : "";

    const prefs: EditorPreferences = {
        fontStyle, theme, fontSize, pageWidth,
        coverImage, pageIconTitle, owners, contributors,
        subtitle, lastModified, pageOutline, focusBlock,
        focusPage, showStatsOnPage, isPagesSidebarOpen,
    };

    const actions: EditorPreferencesActions = {
        setFontStyle, setTheme, setFontSize, setPageWidth,
        setCoverImage, setPageIconTitle, setOwners, setContributors,
        setSubtitle, setLastModified, setPageOutline, setFocusBlock,
        setFocusPage, setShowStatsOnPage, setIsPagesSidebarOpen,
        themeDefinition, isDarkTheme, themeModeClass, fontSizeClass,
    };

    return [prefs, actions];
}
