"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, ChevronsLeft, FileText, Plus, Trash2 } from "lucide-react";
import TiptapEditor from "@/components/Editor";
import EditorSidebar from "@/components/docs/EditorSidebar";
import { downloadTextFile, htmlToMarkdown, htmlToPlainText } from "@/lib/export";
import ToastRegion, { type ToastMessage } from "@/components/ui/ToastRegion";
import { logoutUser } from "@/lib/auth-client";
import LoadingScreen from "@/components/ui/LoadingScreen";
import AuthDialog from "@/components/auth/AuthDialog";
import { listComments } from "@/lib/documents";
import { useDocumentSync } from "@/hooks/useDocumentSync";
import { useEditorPreferences } from "@/hooks/useEditorPreferences";
import { useCommentSystem } from "@/hooks/useCommentSystem";

interface EditorStats {
    words: number;
    characters: number;
}

export default function DocEditorPage() {
    const router = useRouter();
    const docId = typeof router.query.id === "string" ? router.query.id : undefined;

    /* ── Toasts ─────────────────────────────────────────────── */
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const pushToast = useCallback((tone: ToastMessage["tone"], message: string) => {
        setToasts((prev) => [...prev, { id: crypto.randomUUID(), tone, message }]);
    }, []);
    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const onInfo = useCallback((msg: string) => pushToast("info", msg), [pushToast]);
    const onSuccess = useCallback((msg: string) => pushToast("success", msg), [pushToast]);
    const onError = useCallback((msg: string) => pushToast("error", msg), [pushToast]);

    /* ── Document sync ──────────────────────────────────────── */
    const {
        documentTitle, setDocumentTitle,
        pages, activePage, activePageId,
        saveState, isOnline, authChecked, isGuestMode, setIsGuestMode,
        selectPage, handleCreatePage, handleDeletePage,
        handlePageTitleChange, handlePageContentChange,
    } = useDocumentSync({ docId, onInfo, onSuccess, onError });

    /* ── Editor preferences ─────────────────────────────────── */
    const [prefs, prefActions] = useEditorPreferences(docId);

    /* ── Comments ───────────────────────────────────────────── */
    const { comments, setComments, isAddingComment, handleAddComment } = useCommentSystem({
        docId, authChecked, isGuestMode, onSuccess, onError,
    });

    /* ── UI state ───────────────────────────────────────────── */
    const [stats, setStats] = useState<EditorStats>({ words: 0, characters: 0 });
    const [activePanel, setActivePanel] = useState<string | null>(null);
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

    const onOpenLinkedPageRef = useRef<((id: string) => void) | null>(null);
    const routerReplaceRef = useRef(router.replace);
    useEffect(() => { routerReplaceRef.current = router.replace; });

    /* ── URL <-> page sync ──────────────────────────────────── */
    /* Read: URL page segment → select page in state */
    const urlPageId = router.isReady && typeof router.query.page === "string" ? router.query.page : null;
    useEffect(() => {
        if (!urlPageId || !pages.some((p) => p.id === urlPageId) || urlPageId === activePageId) return;
        selectPage(urlPageId);
    }, [urlPageId, pages, activePageId, selectPage]);

    /* Write: active page state → update URL (shallow, no navigation) */
    useEffect(() => {
        if (!router.isReady || !docId || !activePageId) return;
        if (urlPageId === activePageId) return;
        void routerReplaceRef.current(`/docs/${docId}/${activePageId}`, undefined, { shallow: true });
    // router.isReady is stable once true; urlPageId/activePageId/docId are the real deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, docId, activePageId]);

    /* ── Derived ────────────────────────────────────────────── */
    const { fontSizeClass, isDarkTheme, themeModeClass } = prefActions;
    const readingTimeMinutes = Math.max(1, Math.ceil(stats.words / 200));
    const disabledPanelIds = useMemo(() => (isGuestMode ? ["ai", "templates"] : []), [isGuestMode]);
    const activePanelTitle = useMemo(() => {
        const map: Record<string, string> = { comments: "Comments", styles: "Page Styles", themes: "Themes", ai: "AI Assistant", templates: "Templates", export: "Export" };
        return map[activePanel ?? "styles"] ?? "Page Styles";
    }, [activePanel]);

    const mentionPages = useMemo(
        () => pages.map((p) => ({ id: p.id, title: p.title || "Untitled", href: docId ? `/docs/${docId}/${p.id}` : `?page=${p.id}` })),
        [pages, docId],
    );

    const handleOpenLinkedPage = useCallback((pageId: string) => {
        if (!pages.some((p) => p.id === pageId)) return;
        selectPage(pageId);
    }, [pages, selectPage]);

    useEffect(() => { onOpenLinkedPageRef.current = handleOpenLinkedPage; }, [handleOpenLinkedPage]);

    const handleLogout = useCallback(async () => {
        await logoutUser();
        setIsGuestMode(true);
        setComments([]);
        pushToast("info", "Signed out");
    }, [pushToast, setIsGuestMode, setComments]);

    const handleExport = useCallback((format: "markdown" | "text") => {
        const pageTitle = activePage?.title || "untitled";
        const pageContent = activePage?.content || "<p></p>";
        const baseName = pageTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled";
        downloadTextFile(`${baseName}.${format === "markdown" ? "md" : "txt"}`, format === "markdown" ? htmlToMarkdown(pageContent) : htmlToPlainText(pageContent));
    }, [activePage]);

    const handleStatsChange = useCallback((nextStats: EditorStats) => setStats(nextStats), []);

    /* ── Render ─────────────────────────────────────────────── */
    if (!activePage) {
        return <LoadingScreen message={authChecked ? "Entering Vault" : "DocVault"} label={authChecked ? "Opening document" : "Checking session"} />;
    }

    return (
        <main className={`editor-theme ${themeModeClass} flex h-screen overflow-hidden bg-white`}>
            <ToastRegion toasts={toasts} onDismiss={dismissToast} />
            <AuthDialog
                open={isAuthDialogOpen}
                onClose={() => setIsAuthDialogOpen(false)}
                onSuccess={async () => {
                    setIsGuestMode(false);
                    const nextComments = docId ? await listComments(docId) : [];
                    setComments(nextComments);
                    pushToast("success", "Signed in and synced");
                }}
            />

            {/* Pages sidebar */}
            {prefs.isPagesSidebarOpen && (
                <aside className="absolute z-40 h-screen w-56 shrink-0 overflow-y-auto border-r border-(--editor-border) bg-(--editor-surface) lg:static lg:block shadow-2xl lg:shadow-none">
                    <div className="flex items-center justify-between border-b border-(--editor-border) px-2 py-1">
                        <input
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                            onBlur={() => setDocumentTitle((prev) => prev.trim() || "Doc")}
                            className="w-full min-w-0 rounded-md bg-transparent text-sm font-semibold text-gray-800 outline-none"
                            aria-label="Document title"
                        />
                        <button
                            onClick={() => prefActions.setIsPagesSidebarOpen(false)}
                            className="cursor-pointer rounded-md p-1 text-(--editor-text-muted) hover:bg-(--editor-surface-muted)"
                            title="Close pages sidebar"
                        >
                            <ChevronsLeft size={14} />
                        </button>
                        <button
                            onClick={handleCreatePage}
                            className="cursor-pointer rounded-md p-1 text-(--editor-text-muted) hover:bg-(--editor-surface-muted)"
                            title="New page"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="p-2">
                        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-400">Pages</p>
                        <ul className="space-y-0.5">
                            {pages.map((page) => {
                                const isActive = page.id === activePage.id;
                                return (
                                    <li key={page.id} className="group flex items-center gap-1">
                                        <button
                                            onClick={() => selectPage(page.id)}
                                            className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors ${isActive ? "bg-(--editor-surface-muted) text-(--editor-text)" : "text-(--editor-text-muted) hover:bg-(--editor-surface-muted)"} ${isDarkTheme ? isActive ? "bg-white/14 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white" : ""}`}
                                            title={`Open page ${page.title || "Untitled"}`}
                                        >
                                            <FileText size={13} />
                                            <span className="truncate">{page.title || "Untitled"}</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeletePage(page.id)}
                                            className={`cursor-pointer rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 ${isDarkTheme ? "text-slate-400 hover:bg-white/10 hover:text-rose-300" : ""}`}
                                            aria-label={`Delete page ${page.title || "Untitled"}`}
                                            disabled={pages.length <= 1}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <button
                            onClick={handleCreatePage}
                            className={`mt-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 ${isDarkTheme ? "text-sky-300 hover:bg-white/10 hover:text-sky-200" : ""}`}
                        >
                            <Plus size={13} />
                            Add page
                        </button>
                    </div>
                </aside>
            )}

            <div className="flex flex-1 flex-col min-w-0 relative">
                {/* Topbar */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-(--editor-bg)/90 px-3 py-1.5 backdrop-blur-sm border-b border-(--editor-border)">
                    <div className="flex min-w-0 items-center gap-2">
                        <Link
                            href="/"
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 ${isDarkTheme ? "border-white/20 bg-black/30 text-slate-300 hover:bg-white/10 hover:text-white" : ""}`}
                            title="Back to all documents"
                        >
                            <ArrowLeft size={14} />
                            All docs
                        </Link>

                        {!prefs.isPagesSidebarOpen && (
                            <button
                                onClick={() => prefActions.setIsPagesSidebarOpen(true)}
                                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 ${isDarkTheme ? "border-white/20 bg-black/30 text-slate-100 hover:bg-white/10" : ""}`}
                                title="Open pages sidebar"
                            >
                                <FileText size={14} />
                                {pages.length > 1 ? `${pages.length} pages` : "Add page"}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] text-gray-500 uppercase tracking-tight ${isDarkTheme ? "border-white/15 bg-white/10 text-slate-300" : ""}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
                            <span>{isOnline ? "Online" : "Offline"}</span>
                            <span className="text-gray-300">|</span>
                            <span>{!isOnline ? "Local draft" : saveState === "saving" ? "Saving" : saveState === "error" ? "Save failed" : "Saved"}</span>
                        </div>

                        {isGuestMode ? (
                            <button
                                onClick={() => setIsAuthDialogOpen(true)}
                                className="inline-flex cursor-pointer items-center rounded-lg bg-(--editor-surface) px-2.5 py-1.5 text-xs font-semibold text-(--editor-text) ring-1 ring-inset ring-(--editor-border) transition-all"
                                title="Sign in to sync this document"
                            >
                                Sign in
                            </button>
                        ) : (
                            <button
                                onClick={() => { void handleLogout(); }}
                                className="inline-flex cursor-pointer items-center rounded-lg bg-(--editor-surface) px-2.5 py-1.5 text-xs font-semibold text-(--editor-text) ring-1 ring-inset ring-(--editor-border) transition-all"
                                title="Sign out"
                            >
                                Sign out
                            </button>
                        )}
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex justify-center px-4 pb-2 pt-3">
                        <div className={`w-full ${prefs.pageWidth === "full" ? "max-w-none px-8" : "max-w-3xl"}`}>
                            <div className={fontSizeClass}>
                                <TiptapEditor
                                    title={activePage.title}
                                    onTitleChange={handlePageTitleChange}
                                    content={activePage.content}
                                    onContentChange={handlePageContentChange}
                                    onStatsChange={handleStatsChange}
                                    showOwners={prefs.owners}
                                    showLastModified={prefs.lastModified}
                                    fontClass={prefs.fontStyle}
                                    onCreatePage={handleCreatePage}
                                    mentionPages={mentionPages}
                                    onOpenLinkedPage={handleOpenLinkedPage}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats footer */}
                <div className="shrink-0 border-t border-(--editor-border) px-4 py-1.5 text-xs text-(--editor-text-muted) opacity-60 flex gap-4">
                    <span>{stats.words} words</span>
                    <span>{stats.characters} chars</span>
                </div>
            </div>

            <EditorSidebar
                activePanel={activePanel}
                setActivePanel={setActivePanel}
                activePanelTitle={activePanelTitle}
                theme={prefs.theme}
                setTheme={prefActions.setTheme}
                fontStyle={prefs.fontStyle}
                setFontStyle={prefActions.setFontStyle}
                fontSize={prefs.fontSize}
                setFontSize={prefActions.setFontSize}
                pageWidth={prefs.pageWidth}
                setPageWidth={prefActions.setPageWidth}
                coverImage={prefs.coverImage}
                setCoverImage={prefActions.setCoverImage}
                pageIconTitle={prefs.pageIconTitle}
                setPageIconTitle={prefActions.setPageIconTitle}
                owners={prefs.owners}
                setOwners={prefActions.setOwners}
                contributors={prefs.contributors}
                setContributors={prefActions.setContributors}
                subtitle={prefs.subtitle}
                setSubtitle={prefActions.setSubtitle}
                lastModified={prefs.lastModified}
                setLastModified={prefActions.setLastModified}
                pageOutline={prefs.pageOutline}
                setPageOutline={prefActions.setPageOutline}
                focusBlock={prefs.focusBlock}
                setFocusBlock={prefActions.setFocusBlock}
                focusPage={prefs.focusPage}
                setFocusPage={prefActions.setFocusPage}
                showStatsOnPage={prefs.showStatsOnPage}
                setShowStatsOnPage={prefActions.setShowStatsOnPage}
                stats={stats}
                readingTimeMinutes={readingTimeMinutes}
                comments={comments}
                onAddComment={handleAddComment}
                isAddingComment={isAddingComment}
                onExport={handleExport}
                disabledPanelIds={disabledPanelIds}
            />
        </main>
    );
}
