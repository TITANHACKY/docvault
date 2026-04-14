"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { ChevronsLeft, FileText, GitBranch, Plus, Trash2 } from "lucide-react";
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

interface EditorStats {
  words: number;
  characters: number;
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

export default function DocEditorPage() {
  const router = useRouter();
  const docId = typeof router.query.id === "string" ? router.query.id : undefined;

  const [fontStyle, setFontStyle] = useState("font-system");
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

  const activePage = useMemo(() => {
    if (!activePageId) return pages[0] ?? null;
    return pages.find((page) => page.id === activePageId) ?? pages[0] ?? null;
  }, [pages, activePageId]);

  useEffect(() => {
    if (!docId) return;

    const timeout = setTimeout(() => {
      void (async () => {
        const existingDocument = await getDocument(docId);

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

          setDocumentTitle(existingDocument.title || "Doc");
          setPages(normalizedPages);
          setActivePageId(
            normalizedPages.some((page) => page.id === existingDocument.activePageId)
              ? existingDocument.activePageId
              : normalizedPages[0].id,
          );
          setIsDocumentReady(true);
          return;
        }

        const now = Date.now();
        const firstPage = createPage("Untitled");

        await upsertDocument({
          id: docId,
          title: "Doc",
          content: firstPage.content,
          pages: [firstPage],
          activePageId: firstPage.id,
          createdAt: now,
          updatedAt: now,
        });

        setDocumentTitle("Doc");
        setPages([firstPage]);
        setActivePageId(firstPage.id);
        setIsDocumentReady(true);
      })();
    }, 0);

    return () => clearTimeout(timeout);
  }, [docId]);

  useEffect(() => {
    const pageFromQuery = typeof router.query.page === "string" ? router.query.page : null;
    if (!pageFromQuery) return;
    if (!pages.some((page) => page.id === pageFromQuery)) return;
    setActivePageId(pageFromQuery);
  }, [router.query.page, pages]);

  useEffect(() => {
    if (!docId || !activePageId) return;
    const pageFromQuery = typeof router.query.page === "string" ? router.query.page : null;
    if (pageFromQuery === activePageId) return;

    void router.replace(
      {
        pathname: `/docs/${docId}`,
        query: { page: activePageId },
      },
      undefined,
      { shallow: true },
    );
  }, [docId, activePageId, router]);

  useEffect(() => {
    if (!docId || !isDocumentReady || pages.length === 0 || !activePage) return;

    const timeout = setTimeout(() => {
      void (async () => {
        const existingDocument = await getDocument(docId);
        const now = Date.now();

        await upsertDocument({
          id: docId,
          title: documentTitle.trim() || "Doc",
          content: activePage.content,
          pages,
          activePageId: activePage.id,
          createdAt: existingDocument?.createdAt ?? now,
          updatedAt: now,
        });
      })();
    }, 400);

    return () => clearTimeout(timeout);
  }, [docId, documentTitle, pages, activePage, isDocumentReady]);

  useEffect(() => {
    if (!docId) return;

    const timeout = setTimeout(() => {
      void (async () => {
        const nextComments = await listComments(docId);
        setComments(nextComments);
      })();
    }, 0);

    return () => clearTimeout(timeout);
  }, [docId]);

  const fontSizeClass =
    fontSize === "small" ? "editor-text-sm" : fontSize === "large" ? "editor-text-lg" : "";

  const handleStatsChange = useCallback((nextStats: EditorStats) => {
    setStats(nextStats);
  }, []);

  const readingTimeMinutes = Math.max(1, Math.ceil(stats.words / 200));

  const activePanelTitle = useMemo(() => {
    const panelMap: Record<string, string> = {
      comments: "Comments",
      styles: "Page Styles",
      ai: "AI Assistant",
      templates: "Templates",
      export: "Export",
    };

    return panelMap[activePanel ?? "styles"] ?? "Page Styles";
  }, [activePanel]);

  const handleAddComment = useCallback(
    async (commentContent: string) => {
      if (!docId) return;
      setIsAddingComment(true);
      try {
        const comment = await addComment(docId, commentContent, "You");
        setComments((previous) => [...previous, comment]);
      } finally {
        setIsAddingComment(false);
      }
    },
    [docId],
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

  const handleCreatePage = useCallback(
    () => {
      const nextPage = createPage("Untitled");

      setPages((previous) => [...previous, nextPage]);
      setIsPagesSidebarOpen(true);
    },
    [],
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
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
    },
    [activePageId],
  );

  const mentionPages = useMemo(
    () =>
      pages.map((page) => ({
        id: page.id,
        title: page.title || "Untitled",
        href: `?page=${page.id}`,
      })),
    [pages],
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
      setActivePageId(pageId);
    },
    [pages],
  );

  if (!activePage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-gray-500">
        Loading document...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-white">
      {isPagesSidebarOpen ? (
        <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-gray-50 lg:block">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
            <input
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              onBlur={() => setDocumentTitle((previous) => previous.trim() || "Doc")}
              className="w-full min-w-0 rounded-md bg-transparent text-2xl font-semibold text-gray-800 outline-none"
              aria-label="Document title"
            />
            <button
              onClick={() => setIsPagesSidebarOpen(false)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Collapse pages sidebar"
            >
              <ChevronsLeft size={16} />
            </button>
          </div>

          <div className="p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Pages</p>
            <ul className="space-y-1">
              {pages.map((page) => {
                const isActive = page.id === activePage.id;
                return (
                  <li key={page.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => setActivePageId(page.id)}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isActive ? "bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      <FileText size={16} />
                      <span className="truncate">{page.title || "Untitled"}</span>
                    </button>

                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-red-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Delete page ${page.title || "Untitled"}`}
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
              className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              <Plus size={16} />
              Add page
            </button>
          </div>
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="px-4 pt-4">
          {!isPagesSidebarOpen && (
            <button
              onClick={() => setIsPagesSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <FileText size={16} />
              {pages.length > 1 ? `${pages.length} pages` : "Add page"}
            </button>
          )}
        </div>

        <div className="flex flex-1 justify-center px-8 pb-4 pt-8">
          <div className={`w-full ${pageWidth === "full" ? "max-w-none px-8" : "max-w-3xl"}`}>
            <div className="mb-8 flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-400">
              <GitBranch size={16} className="rotate-90" />
              <span className="font-medium">Link Task or Doc</span>
            </div>

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

        {showStatsOnPage && (
          <div className="border-t border-gray-100 px-8 py-2 text-xs text-gray-400">{stats.words} words</div>
        )}
      </div>

      <EditorSidebar
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        activePanelTitle={activePanelTitle}
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
      />
    </main>
  );
}
