"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, ChevronsLeft, FileText, GitBranch, Plus, Trash2 } from "lucide-react";
import TiptapEditor from "@/components/Editor";
import EditorSidebar from "@/components/docs/EditorSidebar";
import {
  addComment,
  getDocument,
  listComments,
  upsertDocument,
  type StoredComment,
  type StoredPage,
} from "@/lib/documents";
import { downloadTextFile, htmlToMarkdown, htmlToPlainText } from "@/lib/export";
import {
  loadEncryptedDraft,
  saveEncryptedDraft,
  type EditorDraftPayload,
} from "@/lib/local-draft";
import ToastRegion, { type ToastMessage } from "@/components/ui/ToastRegion";
import { getCurrentUser, logoutUser } from "@/lib/auth-client";
import {
  addGuestComment,
  createGuestDocument,
  getGuestDocument,
  listGuestComments,
  upsertGuestDocument,
} from "@/lib/guest-documents";
import {
  loadEditorPreferences,
  saveEditorPreferences,
} from "@/lib/editor-preferences";
import LoadingScreen from "@/components/ui/LoadingScreen";
import AuthDialog from "@/components/auth/AuthDialog";
import {
  getEditorTheme,
  isEditorTheme,
  loadGlobalEditorTheme,
  saveGlobalEditorTheme,
  type EditorTheme,
} from "@/lib/editor-themes";
import { applyEditorThemeToHtml } from "@/lib/html-theme";

interface EditorStats {
  words: number;
  characters: number;
}

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

  if (trimmed.startsWith("?page=")) {
    const params = new URLSearchParams(trimmed.slice(1));
    return params.get("page");
  }

  try {
    const parsed = new URL(trimmed, "https://local.doc-editor");
    const fromQuery = parsed.searchParams.get("page");
    if (fromQuery) return fromQuery;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length >= 3 && segments[0] === "docs") {
      return decodeURIComponent(segments[2]);
    }
  } catch {
    return null;
  }

  return null;
}

function normalizePageMentions(
  html: string,
  docId: string,
  pageTitleById: Map<string, string>,
): string {
  return html.replace(
    /<a\b([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (_full, beforeHref, rawHref, afterHref, innerHtml) => {
      const pageId = getPageIdFromHref(rawHref);
      if (!pageId) {
        return `<a${beforeHref}href="${rawHref}"${afterHref}>${innerHtml}</a>`;
      }

      const canonicalHref = `/docs/${docId}/${pageId}`;
      const cleanedInnerText = stripHtmlTags(innerHtml);
      const pageTitle = pageTitleById.get(pageId) ?? "Untitled";
      const shouldRestoreLabel =
        cleanedInnerText.length === 0 ||
        cleanedInnerText === rawHref ||
        cleanedInnerText === canonicalHref ||
        cleanedInnerText === `?page=${pageId}` ||
        cleanedInnerText.includes("/docs/");

      const mentionLabel = shouldRestoreLabel ? pageTitle : cleanedInnerText;

      return `<a href="${canonicalHref}" class="page-mention" data-page-id="${pageId}">${mentionLabel}</a>`;
    },
  );
}

function createPage(title = "Untitled"): StoredPage {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    content: "<p></p>",
    createdAt: now,
    updatedAt: now,
  };
}

function isValidDraftPage(page: Partial<StoredPage>): page is StoredPage {
  return (
    typeof page?.id === "string" &&
    typeof page?.title === "string" &&
    typeof page?.content === "string" &&
    typeof page?.createdAt === "number" &&
    typeof page?.updatedAt === "number"
  );
}

function sanitizeDraft(input: EditorDraftPayload): EditorDraftPayload | null {
  const validPages = input.pages.filter((page) => isValidDraftPage(page));
  if (validPages.length === 0) return null;

  const hasActivePage = validPages.some((page) => page.id === input.activePageId);
  return {
    title: input.title,
    pages: validPages,
    activePageId: hasActivePage ? input.activePageId : validPages[0].id,
    updatedAt: input.updatedAt,
  };
}

function mergePagesByUpdatedAt(
  remotePages: StoredPage[],
  localPages: StoredPage[],
): StoredPage[] {
  const merged = new Map<string, StoredPage>();

  remotePages.forEach((page) => {
    merged.set(page.id, page);
  });

  localPages.forEach((localPage) => {
    const remotePage = merged.get(localPage.id);
    if (!remotePage || localPage.updatedAt >= remotePage.updatedAt) {
      merged.set(localPage.id, localPage);
      return;
    }

    merged.set(localPage.id, remotePage);
  });

  return [...merged.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export default function DocEditorPage() {
  const router = useRouter();
  const docId = typeof router.query.id === "string" ? router.query.id : undefined;

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
  const [stats, setStats] = useState<EditorStats>({ words: 0, characters: 0 });

  const [documentTitle, setDocumentTitle] = useState("Doc");
  const [pages, setPages] = useState<StoredPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isDocumentReady, setIsDocumentReady] = useState(!docId);
  const [isPagesSidebarOpen, setIsPagesSidebarOpen] = useState(false);

  const [comments, setComments] = useState<StoredComment[]>([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  const saveAbortControllerRef = useRef<AbortController | null>(null);
  const latestSaveTokenRef = useRef(0);
  const lastSyncedServerUpdatedAtRef = useRef(0);
  const pendingQueryPageRef = useRef<string | null>(null);
  const onOpenLinkedPageRef = useRef<((id: string) => void) | null>(null);

  const pushToast = useCallback((tone: ToastMessage["tone"], message: string) => {
    setToasts((previous) => [
      ...previous,
      { id: crypto.randomUUID(), tone, message },
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncOnlineState = () => {
      setIsOnline(window.navigator.onLine);
    };

    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);

    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  useEffect(() => {
    setPreferencesHydrated(false);
    if (!docId) return;

    const timeout = window.setTimeout(() => {
      const prefs = loadEditorPreferences(docId);
      if (prefs) {
        if (typeof prefs.fontStyle === "string") setFontStyle(prefs.fontStyle);
        if (typeof prefs.theme === "string" && isEditorTheme(prefs.theme)) {
          setTheme(prefs.theme);
        }
        if (prefs.fontSize === "small" || prefs.fontSize === "default" || prefs.fontSize === "large") {
          setFontSize(prefs.fontSize);
        }
        if (prefs.pageWidth === "default" || prefs.pageWidth === "full") {
          setPageWidth(prefs.pageWidth);
        }
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
        if (typeof prefs.isPagesSidebarOpen === "boolean") {
          setIsPagesSidebarOpen(prefs.isPagesSidebarOpen);
        }
      }

      setPreferencesHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [docId]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    saveGlobalEditorTheme(theme);
    applyEditorThemeToHtml(theme);
  }, [preferencesHydrated, theme]);

  useEffect(() => {
    if (!docId || !preferencesHydrated) return;

    const timeout = window.setTimeout(() => {
      saveEditorPreferences(docId, {
        fontStyle,
        theme,
        fontSize,
        pageWidth,
        coverImage,
        pageIconTitle,
        owners,
        contributors,
        subtitle,
        lastModified,
        pageOutline,
        focusBlock,
        focusPage,
        showStatsOnPage,
        isPagesSidebarOpen,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    docId,
    preferencesHydrated,
    fontStyle,
    theme,
    fontSize,
    pageWidth,
    coverImage,
    pageIconTitle,
    owners,
    contributors,
    subtitle,
    lastModified,
    pageOutline,
    focusBlock,
    focusPage,
    showStatsOnPage,
    isPagesSidebarOpen,
  ]);

  const activePage = useMemo(() => {
    if (!activePageId) return pages[0] ?? null;
    return pages.find((page) => page.id === activePageId) ?? pages[0] ?? null;
  }, [pages, activePageId]);

  useEffect(() => {
    if (!docId) return;

    const timeout = setTimeout(() => {
      void (async () => {
        const user = await getCurrentUser().catch(() => null);
        setIsGuestMode(!user);
        setAuthChecked(true);

        try {
          const existingDocument = user
            ? await getDocument(docId)
            : await getGuestDocument(docId);
          const localDraft = await loadEncryptedDraft(docId);

          if (existingDocument) {
            const normalizedPages =
              existingDocument.pages.length > 0
                ? existingDocument.pages
                : [
                  {
                    id: crypto.randomUUID(),
                    title: existingDocument.title || "Untitled",
                    content: existingDocument.content || "<p></p>",
                    createdAt: existingDocument.createdAt,
                    updatedAt: existingDocument.updatedAt,
                  },
                ];

            const titleById = new Map(
              normalizedPages.map((page) => [page.id, page.title || "Untitled"]),
            );

            const sanitizedPages = normalizedPages.map((page) => ({
              ...page,
              content: normalizePageMentions(
                sanitizePageLinks(page.content, docId),
                docId,
                titleById,
              ),
            }));

            const validDraft = localDraft ? sanitizeDraft(localDraft) : null;
            const isBrandNewDocument =
              existingDocument.pages.length <= 1 &&
              existingDocument.title === "Untitled" &&
              (Date.now() - existingDocument.updatedAt < 5000);

            const shouldRestoreDraft =
              !isBrandNewDocument &&
              validDraft !== null &&
              validDraft.updatedAt > existingDocument.updatedAt;

            const finalTitle = shouldRestoreDraft ? validDraft.title : existingDocument.title || "Doc";
            const draftTitleById = new Map(
              (validDraft?.pages ?? []).map((page) => [page.id, page.title || "Untitled"]),
            );
            const finalPages = shouldRestoreDraft
              ? validDraft.pages.map((page) => ({
                ...page,
                content: normalizePageMentions(
                  sanitizePageLinks(page.content, docId),
                  docId,
                  draftTitleById,
                ),
              }))
              : sanitizedPages;
            const finalActivePageId = shouldRestoreDraft
              ? validDraft.activePageId
              : sanitizedPages.some((page) => page.id === existingDocument.activePageId)
                ? existingDocument.activePageId
                : sanitizedPages[0].id;

            setDocumentTitle(finalTitle || "Doc");
            setPages(finalPages);
            setActivePageId(finalActivePageId);
            lastSyncedServerUpdatedAtRef.current = existingDocument.updatedAt;
            setIsDocumentReady(true);

            if (shouldRestoreDraft) {
              // Only toast if the draft actually adds value (different page count or title)
              const pagesChanged = validDraft.pages.length !== sanitizedPages.length;
              const titleChanged = validDraft.title !== existingDocument.title;
              if (pagesChanged || titleChanged) {
                pushToast("info", "Restored newer local draft");
              }
            }

            return;
          }

          const now = Date.now();
          const firstPage = createPage("Untitled");

          if (user) {
            await upsertDocument({
              id: docId,
              title: "Doc",
              content: firstPage.content,
              pages: [firstPage],
              activePageId: firstPage.id,
              createdAt: now,
              updatedAt: now,
            });
          } else {
            await createGuestDocument({
              id: docId,
              title: "Doc",
              content: firstPage.content,
            });
          }

          setDocumentTitle("Doc");
          setPages([firstPage]);
          setActivePageId(firstPage.id);
          lastSyncedServerUpdatedAtRef.current = now;
          setIsDocumentReady(true);
          pushToast("success", "Document initialized");
        } catch {
          setSaveState("error");
          pushToast("error", "Unable to load document");
        }
      })();
    }, 0);

    return () => clearTimeout(timeout);
  }, [docId, pushToast]);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setIsGuestMode(true);
    setComments([]);
    pushToast("info", "Signed out");
  }, [pushToast]);

  useEffect(() => {
    if (!router.isReady) return;

    const pageFromQuery = typeof router.query.page === "string" ? router.query.page : null;

    if (pendingQueryPageRef.current) {
      if (pageFromQuery === pendingQueryPageRef.current) {
        pendingQueryPageRef.current = null;
      }
      return;
    }

    if (!pageFromQuery && activePageId && pages.length > 0) {
      // Preserve internal state and let the URL-sync effect normalize the path format.
      return;
    }

    if (!pageFromQuery) return;
    if (!pages.some((page) => page.id === pageFromQuery)) return;
    if (pageFromQuery === activePageId) return;
    setActivePageId(pageFromQuery);
  }, [router.isReady, router.query.page, pages, activePageId]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!docId || !activePageId) return;
    const pageFromQuery = typeof router.query.page === "string" ? router.query.page : null;
    if (pageFromQuery === activePageId) return;

    pendingQueryPageRef.current = activePageId;

    void router.replace(`/docs/${docId}/${activePageId}`, undefined, {
      shallow: true,
    });
  }, [router.isReady, docId, activePageId, router]);

  useEffect(() => {
    if (!authChecked || !docId || !isDocumentReady || pages.length === 0 || !activePage) return;

    const timeout = window.setTimeout(() => {
      const payload: EditorDraftPayload = {
        title: documentTitle.trim() || "Doc",
        pages,
        activePageId: activePage.id,
        updatedAt: Date.now(),
      };

      void saveEncryptedDraft(docId, payload);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [authChecked, docId, documentTitle, pages, activePage, isDocumentReady]);

  useEffect(() => {
    if (!docId || !isDocumentReady || pages.length === 0 || !activePage) return;

    const timeout = window.setTimeout(() => {
      const thisSaveToken = latestSaveTokenRef.current + 1;
      latestSaveTokenRef.current = thisSaveToken;

      if (saveAbortControllerRef.current) {
        saveAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      saveAbortControllerRef.current = controller;

      const localTitle = documentTitle.trim() || "Doc";
      const localPages = pages;
      const localActivePage = activePage;
      const now = Date.now();

      if (isGuestMode) {
        const now = Date.now();
        void upsertGuestDocument({
          id: docId,
          title: localTitle,
          content: localActivePage.content,
          pages: localPages,
          activePageId: localActivePage.id,
          createdAt: now,
          updatedAt: now,
        });
        setSaveState("saved");
        return;
      }

      if (!isOnline) {
        setSaveState("idle");
        return;
      }

      setSaveState("saving");

      void (async () => {
        try {
          const remoteDocument = await getDocument(docId, { signal: controller.signal });
          if (controller.signal.aborted || latestSaveTokenRef.current !== thisSaveToken) return;

          const shouldMerge =
            remoteDocument !== null &&
            remoteDocument.updatedAt > lastSyncedServerUpdatedAtRef.current;

          const mergedPages = shouldMerge
            ? mergePagesByUpdatedAt(remoteDocument.pages, localPages)
            : localPages;

          const safeActivePageId = mergedPages.some((page) => page.id === localActivePage.id)
            ? localActivePage.id
            : mergedPages[0]?.id ?? localActivePage.id;
          const mergedActivePage =
            mergedPages.find((page) => page.id === safeActivePageId) ?? mergedPages[0] ?? localActivePage;

          const saved = await upsertDocument(
            {
              id: docId,
              title: localTitle,
              content: mergedActivePage.content,
              pages: mergedPages,
              activePageId: safeActivePageId,
              createdAt: remoteDocument?.createdAt ?? now,
              updatedAt: now,
            },
            { signal: controller.signal },
          );

          if (controller.signal.aborted || latestSaveTokenRef.current !== thisSaveToken) return;

          lastSyncedServerUpdatedAtRef.current = saved.updatedAt;
          setSaveState("saved");
        } catch (error) {
          const isAbort =
            error instanceof DOMException && error.name === "AbortError";
          if (isAbort) return;

          setSaveState("error");
          pushToast("error", "Autosave failed");
        }
      })();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [
    authChecked,
    docId,
    documentTitle,
    pages,
    activePage,
    isDocumentReady,
    pushToast,
    isOnline,
    isGuestMode,
  ]);

  useEffect(() => {
    return () => {
      if (saveAbortControllerRef.current) {
        saveAbortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!authChecked || !docId) return;

    const timeout = setTimeout(() => {
      void (async () => {
        const nextComments = isGuestMode
          ? await listGuestComments(docId)
          : await listComments(docId);
        setComments(nextComments);
      })();
    }, 0);

    return () => clearTimeout(timeout);
  }, [authChecked, docId, isGuestMode]);

  const fontSizeClass =
    fontSize === "small" ? "editor-text-sm" : fontSize === "large" ? "editor-text-lg" : "";
  const themeDefinition = useMemo(() => getEditorTheme(theme), [theme]);
  const isDarkTheme = themeDefinition.mode === "dark";
  const themeModeClass = isDarkTheme ? "editor-theme-dark" : "editor-theme-light";

  const handleStatsChange = useCallback((nextStats: EditorStats) => {
    setStats(nextStats);
  }, []);

  const readingTimeMinutes = Math.max(1, Math.ceil(stats.words / 200));
  const disabledPanelIds = useMemo(
    () => (isGuestMode ? ["ai", "templates"] : []),
    [isGuestMode],
  );

  const activePanelTitle = useMemo(() => {
    const panelMap: Record<string, string> = {
      comments: "Comments",
      styles: "Page Styles",
      themes: "Themes",
      ai: "AI Assistant",
      templates: "Templates",
      export: "Export",
    };

    return panelMap[activePanel ?? "styles"] ?? "Page Styles";
  }, [activePanel]);

  const handleAddComment = useCallback(
    async (commentContent: string) => {
      if (!authChecked || !docId) return;
      setIsAddingComment(true);
      try {
        const comment = isGuestMode
          ? await addGuestComment(docId, commentContent, "Guest")
          : await addComment(docId, commentContent, "You");
        setComments((previous) => [...previous, comment]);
        pushToast("success", "Comment added");
      } catch {
        pushToast("error", "Could not add comment");
      } finally {
        setIsAddingComment(false);
      }
    },
    [authChecked, docId, isGuestMode, pushToast],
  );

  const selectPage = useCallback((pageId: string) => {
    if (!pageId || pageId === activePageId) return;
    pendingQueryPageRef.current = pageId;
    setActivePageId(pageId);
  }, [activePageId]);

  const handleCreatePage = useCallback(
    () => {
      const nextPage = createPage("Untitled");

      setPages((previous) => [...previous, nextPage]);
      selectPage(nextPage.id);
      setIsPagesSidebarOpen(true);
      pushToast("success", "Page created");
    },
    [pushToast, selectPage],
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      const confirmed = window.confirm("Delete this page permanently?");
      if (!confirmed) return;

      setPages((previous) => {
        if (previous.length <= 1) return previous;

        const deletedIndex = previous.findIndex((page) => page.id === pageId);
        if (deletedIndex === -1) return previous;

        const filtered = previous.filter((page) => page.id !== pageId);

        if (activePageId === pageId) {
          const fallbackIndex = Math.min(deletedIndex, filtered.length - 1);
          const fallbackPage = filtered[Math.max(fallbackIndex, 0)] ?? filtered[0];
          setActivePageId(fallbackPage?.id ?? null);
        }

        return filtered;
      });

      pushToast("success", "Page deleted");
    },
    [activePageId, pushToast],
  );

  const mentionPages = useMemo(
    () =>
      pages.map((page) => ({
        id: page.id,
        title: page.title || "Untitled",
        href: docId ? `/docs/${docId}/${page.id}` : `?page=${page.id}`,
      })),
    [pages, docId],
  );

  const handlePageTitleChange = useCallback(
    (nextTitle: string) => {
      if (!activePage) return;
      setPages((previous) =>
        previous.map((page) =>
          page.id === activePage.id
            ? { ...page, title: nextTitle, updatedAt: Date.now() }
            : page,
        ),
      );
    },
    [activePage],
  );

  const handlePageContentChange = useCallback(
    (nextContent: string) => {
      if (!activePage) return;
      setPages((previous) =>
        previous.map((page) =>
          page.id === activePage.id
            ? { ...page, content: nextContent, updatedAt: Date.now() }
            : page,
        ),
      );
    },
    [activePage],
  );

  const handleOpenLinkedPage = useCallback(
    (pageId: string) => {
      if (!pages.some((page) => page.id === pageId)) return;
      selectPage(pageId);
    },
    [pages, selectPage],
  );

  const handleExport = useCallback(
    (format: "markdown" | "text") => {
      const pageTitle = activePage?.title || "untitled";
      const pageContent = activePage?.content || "<p></p>";

      const baseName =
        pageTitle
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "untitled";

      if (format === "markdown") {
        downloadTextFile(`${baseName}.md`, htmlToMarkdown(pageContent));
        return;
      }

      downloadTextFile(`${baseName}.txt`, htmlToPlainText(pageContent));
    },
    [activePage],
  );

  useEffect(() => {
    onOpenLinkedPageRef.current = handleOpenLinkedPage;
  }, [handleOpenLinkedPage]);

  if (!activePage) {
    return (
      <LoadingScreen 
        message={authChecked ? "Entering Vault" : "DocVault"} 
        label={authChecked ? "Opening document" : "Checking session"} 
      />
    );
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

      {isPagesSidebarOpen ? (
        <aside className="absolute z-40 h-screen w-72 shrink-0 overflow-y-auto border-r border-[var(--editor-border)] bg-[var(--editor-surface)] lg:static lg:block shadow-2xl lg:shadow-none">
          <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-3 py-2.5">
            <input
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              onBlur={() => setDocumentTitle((previous) => previous.trim() || "Doc")}
              className="w-full min-w-0 rounded-md bg-transparent text-2xl font-semibold text-gray-800 outline-none"
              aria-label="Document title"
            />
            <button
              onClick={() => setIsPagesSidebarOpen(false)}
              className="lg:hidden cursor-pointer rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={handleCreatePage}
              className="cursor-pointer rounded-md p-1.5 text-[var(--editor-text-muted)] hover:bg-[var(--editor-surface-muted)]"
              title="New page"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Pages</p>
            <ul className="space-y-1">
              {pages.map((page) => {
                const isActive = page.id === activePage.id;
                return (
                  <li key={page.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => selectPage(page.id)}
                      className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${isActive ? "bg-[var(--editor-surface-muted)] text-[var(--editor-text)]" : "text-[var(--editor-text-muted)] hover:bg-[var(--editor-surface-muted)]"
                        } ${isDarkTheme
                          ? isActive
                            ? "bg-white/14 text-white"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                          : ""
                        }`}
                      title={`Open page ${page.title || "Untitled"}`}
                    >
                      <FileText size={16} />
                      <span className="truncate">{page.title || "Untitled"}</span>
                    </button>

                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className={`cursor-pointer rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 ${isDarkTheme
                        ? "text-slate-400 hover:bg-white/10 hover:text-rose-300"
                        : ""
                        }`}
                      aria-label={`Delete page ${page.title || "Untitled"}`}
                      title={`Delete page ${page.title || "Untitled"}`}
                      disabled={pages.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={() => handleCreatePage()}
              className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 ${isDarkTheme
                ? "text-sky-300 hover:bg-white/10 hover:text-sky-200"
                : ""
                }`}
              title="Create a new page"
            >
              <Plus size={16} />
              Add page
            </button>
          </div>
        </aside>
      ) : null}

      <div className="flex flex-1 flex-col min-w-0 relative">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-[var(--editor-bg)]/90 px-3 py-2.5 backdrop-blur-sm border-b border-[var(--editor-border)]">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 ${isDarkTheme
                ? "border-white/20 bg-black/30 text-slate-100 hover:bg-white/10"
                : ""
                }`}
              title="Back to all documents"
            >
              <ArrowLeft size={16} />
              All docs
            </Link>

            {!isPagesSidebarOpen && (
              <button
                onClick={() => setIsPagesSidebarOpen(true)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 ${isDarkTheme
                  ? "border-white/20 bg-black/30 text-slate-100 hover:bg-white/10"
                  : ""
                  }`}
                title="Open pages sidebar"
              >
                <FileText size={16} />
                {pages.length > 1 ? `${pages.length} pages` : "Add page"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500 ${isDarkTheme
              ? "border-white/15 bg-white/10 text-slate-300"
              : ""
              }`}>
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`}
                title={isOnline ? "Network is online" : "Network is offline"}
              />
              <span>{isOnline ? "Online" : "Offline"}</span>
              <span className="text-gray-300">|</span>
              <span title="Document save status">
                {!isOnline
                  ? "Local draft"
                  : saveState === "saving"
                    ? "Saving"
                    : saveState === "error"
                      ? "Save failed"
                      : "Saved"}
              </span>
            </div>

            {isGuestMode ? (
              <button
                onClick={() => {
                  setIsAuthDialogOpen(true);
                }}
                className="inline-flex cursor-pointer items-center rounded-xl bg-(--editor-surface) px-3 py-2 text-sm font-semibold text-(--editor-text) ring-1 ring-inset ring-(--editor-border) transition-all"
                title="Sign in to sync this document"
              >
                Sign in
              </button>
            ) : (
              <button
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex cursor-pointer items-center rounded-xl bg-(--editor-surface) px-3 py-2 text-sm font-semibold text-(--editor-text) ring-1 ring-inset ring-(--editor-border) transition-all"
                title="Sign out"
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex justify-center px-4 pb-3 pt-5">
            <div className={`w-full ${pageWidth === "full" ? "max-w-none px-8" : "max-w-3xl"}`}>
              <div className={fontSizeClass}>
                <TiptapEditor
                  title={activePage.title}
                  onTitleChange={handlePageTitleChange}
                  content={activePage.content}
                  onContentChange={handlePageContentChange}
                  onStatsChange={handleStatsChange}
                  showOwners={owners}
                  showLastModified={lastModified}
                  fontClass={fontStyle}
                  onCreatePage={handleCreatePage}
                  mentionPages={mentionPages}
                  onOpenLinkedPage={handleOpenLinkedPage}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--editor-border)] px-4 py-1.5 text-xs text-[var(--editor-text-muted)] opacity-60 flex gap-4">
          <span>{stats.words} words</span>
          <span>{stats.characters} chars</span>
        </div>
      </div>

      <EditorSidebar
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        activePanelTitle={activePanelTitle}
        theme={theme}
        setTheme={setTheme}
        fontStyle={fontStyle}
        setFontStyle={setFontStyle}
        fontSize={fontSize}
        setFontSize={setFontSize}
        pageWidth={pageWidth}
        setPageWidth={setPageWidth}
        coverImage={coverImage}
        setCoverImage={setCoverImage}
        pageIconTitle={pageIconTitle}
        setPageIconTitle={setPageIconTitle}
        owners={owners}
        setOwners={setOwners}
        contributors={contributors}
        setContributors={setContributors}
        subtitle={subtitle}
        setSubtitle={setSubtitle}
        lastModified={lastModified}
        setLastModified={setLastModified}
        pageOutline={pageOutline}
        setPageOutline={setPageOutline}
        focusBlock={focusBlock}
        setFocusBlock={setFocusBlock}
        focusPage={focusPage}
        setFocusPage={setFocusPage}
        showStatsOnPage={showStatsOnPage}
        setShowStatsOnPage={setShowStatsOnPage}
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
