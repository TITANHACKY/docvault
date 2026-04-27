import { useCallback, useEffect, useRef, useState } from "react";
import { getDocument, upsertDocument, type StoredPage } from "@/lib/documents";
import { createGuestDocument, getGuestDocument, upsertGuestDocument } from "@/lib/guest-documents";
import { loadEncryptedDraft, saveEncryptedDraft, type EditorDraftPayload } from "@/lib/local-draft";
import { getCurrentUser } from "@/lib/auth-client";
import { saveLastOpened } from "@/lib/last-opened";

/* ─── Pure helpers (no hooks) ────────────────────────────── */

function sanitizePageLinks(html: string, docId: string): string {
    return html
        .replace(/href="\/docs\/[^"]*\?page=([^"]+)"/g, `href="/docs/${docId}/$1"`)
        .replace(/href="\?page=([^"]+)"/g, `href="/docs/${docId}/$1"`);
}

function stripHtmlTags(value: string): string {
    return value.replace(/<[^>]*>/g, "").trim();
}

function getPageIdFromHref(href: string): string | null {
    const trimmed = href.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("?page=")) return new URLSearchParams(trimmed.slice(1)).get("page");
    try {
        const parsed = new URL(trimmed, "https://local.doc-editor");
        const fromQuery = parsed.searchParams.get("page");
        if (fromQuery) return fromQuery;
        const segments = parsed.pathname.split("/").filter(Boolean);
        if (segments.length >= 3 && segments[0] === "docs") return decodeURIComponent(segments[2]);
    } catch { return null; }
    return null;
}

function normalizePageMentions(html: string, docId: string, pageTitleById: Map<string, string>): string {
    return html.replace(
        /<a\b([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
        (_full, beforeHref, rawHref, afterHref, innerHtml) => {
            const pageId = getPageIdFromHref(rawHref);
            if (!pageId) return `<a${beforeHref}href="${rawHref}"${afterHref}>${innerHtml}</a>`;
            const canonicalHref = `/docs/${docId}/${pageId}`;
            const cleanedInnerText = stripHtmlTags(innerHtml);
            const pageTitle = pageTitleById.get(pageId) ?? "Untitled";
            const shouldRestoreLabel =
                cleanedInnerText.length === 0 || cleanedInnerText === rawHref ||
                cleanedInnerText === canonicalHref || cleanedInnerText === `?page=${pageId}` ||
                cleanedInnerText.includes("/docs/");
            return `<a href="${canonicalHref}" class="page-mention" data-page-id="${pageId}">${shouldRestoreLabel ? pageTitle : cleanedInnerText}</a>`;
        },
    );
}

function createPage(title = "Untitled"): StoredPage {
    const now = Date.now();
    return { id: crypto.randomUUID(), title, content: "<p></p>", createdAt: now, updatedAt: now };
}

function isValidDraftPage(page: Partial<StoredPage>): page is StoredPage {
    return (
        typeof page?.id === "string" && typeof page?.title === "string" &&
        typeof page?.content === "string" && typeof page?.createdAt === "number" && typeof page?.updatedAt === "number"
    );
}

function sanitizeDraft(input: EditorDraftPayload): EditorDraftPayload | null {
    const validPages = input.pages.filter(isValidDraftPage);
    if (validPages.length === 0) return null;
    const hasActivePage = validPages.some((p) => p.id === input.activePageId);
    return { title: input.title, pages: validPages, activePageId: hasActivePage ? input.activePageId : validPages[0].id, updatedAt: input.updatedAt };
}

function mergePagesByUpdatedAt(remotePages: StoredPage[], localPages: StoredPage[]): StoredPage[] {
    const merged = new Map<string, StoredPage>();
    remotePages.forEach((p) => merged.set(p.id, p));
    localPages.forEach((local) => {
        const remote = merged.get(local.id);
        merged.set(local.id, (!remote || local.updatedAt >= remote.updatedAt) ? local : remote);
    });
    return [...merged.values()].sort((a, b) => a.createdAt - b.createdAt);
}

/* ─── Hook ───────────────────────────────────────────────── */

interface UseDocumentSyncOptions {
    docId: string | undefined;
    onInfo: (msg: string) => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}

export function useDocumentSync({ docId, onInfo, onSuccess, onError }: UseDocumentSyncOptions) {
    const [documentTitle, setDocumentTitle] = useState("Doc");
    const [pages, setPages] = useState<StoredPage[]>([]);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [isDocumentReady, setIsDocumentReady] = useState(!docId);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [isOnline, setIsOnline] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [isGuestMode, setIsGuestMode] = useState(false);

    const saveAbortControllerRef = useRef<AbortController | null>(null);
    const latestSaveTokenRef = useRef(0);
    const lastSyncedServerUpdatedAtRef = useRef(0);

    /* Online/offline tracking */
    useEffect(() => {
        const sync = () => setIsOnline(window.navigator.onLine);
        sync();
        window.addEventListener("online", sync);
        window.addEventListener("offline", sync);
        return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
    }, []);

    /* Initial document load */
    useEffect(() => {
        if (!docId) return;
        const timeout = setTimeout(() => {
            void (async () => {
                const user = await getCurrentUser().catch(() => null);
                setIsGuestMode(!user);
                setAuthChecked(true);
                try {
                    const existingDocument = user ? await getDocument(docId) : await getGuestDocument(docId);
                    const localDraft = await loadEncryptedDraft(docId);

                    if (existingDocument) {
                        const normalizedPages = existingDocument.pages.length > 0
                            ? existingDocument.pages
                            : [{ id: crypto.randomUUID(), title: existingDocument.title || "Untitled", content: existingDocument.content || "<p></p>", createdAt: existingDocument.createdAt, updatedAt: existingDocument.updatedAt }];

                        const titleById = new Map(normalizedPages.map((p) => [p.id, p.title || "Untitled"]));
                        const sanitizedPages = normalizedPages.map((p) => ({
                            ...p, content: normalizePageMentions(sanitizePageLinks(p.content, docId), docId, titleById),
                        }));

                        const validDraft = localDraft ? sanitizeDraft(localDraft) : null;
                        const isBrandNew = existingDocument.pages.length <= 1 && existingDocument.title === "Untitled" && (Date.now() - existingDocument.updatedAt < 5000);
                        const shouldRestoreDraft = !isBrandNew && validDraft !== null && validDraft.updatedAt > existingDocument.updatedAt;

                        const draftTitleById = new Map((validDraft?.pages ?? []).map((p) => [p.id, p.title || "Untitled"]));
                        const finalPages = shouldRestoreDraft
                            ? validDraft.pages.map((p) => ({ ...p, content: normalizePageMentions(sanitizePageLinks(p.content, docId), docId, draftTitleById) }))
                            : sanitizedPages;

                        setDocumentTitle((shouldRestoreDraft ? validDraft.title : existingDocument.title) || "Doc");
                        setPages(finalPages);
                        setActivePageId(shouldRestoreDraft
                            ? validDraft.activePageId
                            : sanitizedPages.some((p) => p.id === existingDocument.activePageId) ? existingDocument.activePageId : sanitizedPages[0].id,
                        );
                        lastSyncedServerUpdatedAtRef.current = existingDocument.updatedAt;
                        setIsDocumentReady(true);

                        if (shouldRestoreDraft) {
                            const pagesChanged = validDraft.pages.length !== sanitizedPages.length;
                            const titleChanged = validDraft.title !== existingDocument.title;
                            if (pagesChanged || titleChanged) onInfo("Restored newer local draft");
                        }
                        return;
                    }

                    const now = Date.now();
                    const firstPage = createPage("Untitled");
                    if (user) {
                        await upsertDocument({ id: docId, title: "Doc", content: firstPage.content, pages: [firstPage], activePageId: firstPage.id, createdAt: now, updatedAt: now });
                    } else {
                        await createGuestDocument({ id: docId, title: "Doc", content: firstPage.content });
                    }
                    setDocumentTitle("Doc");
                    setPages([firstPage]);
                    setActivePageId(firstPage.id);
                    lastSyncedServerUpdatedAtRef.current = now;
                    setIsDocumentReady(true);
                    onSuccess("Document initialized");
                } catch {
                    setSaveState("error");
                    onError("Unable to load document");
                }
            })();
        }, 0);
        return () => clearTimeout(timeout);
    }, [docId, onInfo, onSuccess, onError]);

    /* Auto-save encrypted draft + track last opened */
    useEffect(() => {
        if (!authChecked || !docId || !isDocumentReady || pages.length === 0) return;
        const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
        if (!activePage) return;
        const timeout = window.setTimeout(() => {
            void saveEncryptedDraft(docId, { title: documentTitle.trim() || "Doc", pages, activePageId: activePage.id, updatedAt: Date.now() });
            saveLastOpened({ docId, pageId: activePage.id, docTitle: documentTitle.trim() || "Doc", pageTitle: activePage.title || null, updatedAt: Date.now() });
        }, 250);
        return () => window.clearTimeout(timeout);
    }, [authChecked, docId, documentTitle, pages, activePageId, isDocumentReady]);

    /* Auto-save to server/guest */
    useEffect(() => {
        if (!docId || !isDocumentReady || pages.length === 0) return;
        const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
        if (!activePage) return;

        const timeout = window.setTimeout(() => {
            const thisSaveToken = latestSaveTokenRef.current + 1;
            latestSaveTokenRef.current = thisSaveToken;
            saveAbortControllerRef.current?.abort();
            const controller = new AbortController();
            saveAbortControllerRef.current = controller;
            const localTitle = documentTitle.trim() || "Doc";
            const now = Date.now();

            if (isGuestMode) {
                void upsertGuestDocument({ id: docId, title: localTitle, content: activePage.content, pages, activePageId: activePage.id, createdAt: now, updatedAt: now });
                setSaveState("saved");
                return;
            }

            if (!isOnline) { setSaveState("idle"); return; }
            setSaveState("saving");

            void (async () => {
                try {
                    const remote = await getDocument(docId, { signal: controller.signal });
                    if (controller.signal.aborted || latestSaveTokenRef.current !== thisSaveToken) return;

                    const shouldMerge = remote !== null && remote.updatedAt > lastSyncedServerUpdatedAtRef.current;
                    const mergedPages = shouldMerge ? mergePagesByUpdatedAt(remote.pages, pages) : pages;
                    const safeActiveId = mergedPages.some((p) => p.id === activePage.id) ? activePage.id : (mergedPages[0]?.id ?? activePage.id);
                    const mergedActivePage = mergedPages.find((p) => p.id === safeActiveId) ?? mergedPages[0] ?? activePage;

                    const saved = await upsertDocument(
                        { id: docId, title: localTitle, content: mergedActivePage.content, pages: mergedPages, activePageId: safeActiveId, createdAt: remote?.createdAt ?? now, updatedAt: now, isPublic: remote?.isPublic, sharedPageIds: remote?.sharedPageIds },
                        { signal: controller.signal },
                    );
                    if (controller.signal.aborted || latestSaveTokenRef.current !== thisSaveToken) return;
                    lastSyncedServerUpdatedAtRef.current = saved.updatedAt;
                    setSaveState("saved");
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                    setSaveState("error");
                    onError("Autosave failed");
                }
            })();
        }, 700);

        return () => window.clearTimeout(timeout);
    }, [authChecked, docId, documentTitle, pages, activePageId, isDocumentReady, isOnline, isGuestMode, onError]);

    useEffect(() => () => { saveAbortControllerRef.current?.abort(); }, []);

    const selectPage = useCallback((pageId: string) => {
        if (!pageId || pageId === activePageId) return;
        setActivePageId(pageId);
    }, [activePageId]);

    const handleCreatePage = useCallback(() => {
        const nextPage = createPage("Untitled");
        setPages((prev) => [...prev, nextPage]);
        setActivePageId(nextPage.id);
        onSuccess("Page created");
    }, [onSuccess]);

    const handleDeletePage = useCallback((pageId: string) => {
        if (!window.confirm("Delete this page permanently?")) return;
        setPages((prev) => {
            if (prev.length <= 1) return prev;
            const idx = prev.findIndex((p) => p.id === pageId);
            if (idx === -1) return prev;
            const filtered = prev.filter((p) => p.id !== pageId);
            if (activePageId === pageId) {
                const fallback = filtered[Math.min(idx, filtered.length - 1)] ?? filtered[0];
                setActivePageId(fallback?.id ?? null);
            }
            return filtered;
        });
        onSuccess("Page deleted");
    }, [activePageId, onSuccess]);

    const handlePageTitleChange = useCallback((nextTitle: string) => {
        setPages((prev) => prev.map((p) =>
            p.id === activePageId ? { ...p, title: nextTitle, updatedAt: Date.now() } : p,
        ));
    }, [activePageId]);

    const handlePageContentChange = useCallback((nextContent: string) => {
        setPages((prev) => prev.map((p) =>
            p.id === activePageId ? { ...p, content: nextContent, updatedAt: Date.now() } : p,
        ));
    }, [activePageId]);

    const activePage = pages.find((p) => p.id === activePageId) ?? pages[0] ?? null;

    return {
        documentTitle, setDocumentTitle,
        pages, activePage, activePageId,
        isDocumentReady, saveState, isOnline, authChecked, isGuestMode, setIsGuestMode,
        selectPage, handleCreatePage, handleDeletePage,
        handlePageTitleChange, handlePageContentChange,
    };
}
