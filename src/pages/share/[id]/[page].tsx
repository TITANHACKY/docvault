import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import type { StoredPage } from "@/lib/documents-types";
import { FileText } from "lucide-react";

interface PublicDoc {
  id: string;
  sharedPageIds: string[];
  pages: StoredPage[];
  activePageId: string;
}

export default function ShareViewer() {
  const router = useRouter();
  const docId = typeof router.query.id === "string" ? router.query.id : null;
  const pageIdParam = typeof router.query.page === "string" ? router.query.page : null;

  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [activePage, setActivePage] = useState<StoredPage | null>(null);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!docId || !router.isReady) return;
    fetch(`/api/share/${docId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: PublicDoc) => {
        setDoc(data);
        const target = pageIdParam
          ? data.pages.find((p) => p.id === pageIdParam)
          : data.pages.find((p) => p.id === data.activePageId) ?? data.pages[0];
        setActivePage(target ?? data.pages[0] ?? null);
      })
      .catch(() => setNotFound(true));
  }, [docId, router.isReady, pageIdParam]);

  // Intercept page-mention link clicks — navigate within the share viewer
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !doc || !docId) return;
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      // Extract pageId from /docs/[docId]/[pageId] links
      const match = href.match(/\/docs\/[^/]+\/([^/?#]+)/);
      if (!match) return;
      const linkedPageId = decodeURIComponent(match[1]);
      const linkedPage = doc.pages.find((p) => p.id === linkedPageId);
      if (!linkedPage) return;
      e.preventDefault();
      switchPage(linkedPage);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, docId]);

  const switchPage = (page: StoredPage) => {
    setActivePage(page);
    void router.replace(`/share/${docId}/${page.id}`, undefined, { shallow: true });
  };

  if (notFound) {
    return (
      <>
        <Head><title>Not found – DocVault</title></Head>
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center space-y-2">
            <p className="text-2xl font-semibold text-gray-700">Page not found</p>
            <p className="text-sm text-gray-400">This link may have been revoked or never existed.</p>
          </div>
        </div>
      </>
    );
  }

  if (!doc || !activePage) {
    return (
      <>
        <Head><title>DocVault</title></Head>
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
        </div>
      </>
    );
  }

  const hasMultiplePages = doc.pages.length > 1;

  return (
    <>
      <Head>
        <title>{activePage.title || "Untitled"} – DocVault</title>
      </Head>
      <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
        {/* Sidebar — only shown if multiple pages */}
        {hasMultiplePages && (
          <aside className="w-52 shrink-0 overflow-y-auto border-r border-gray-200 bg-white px-2 py-3">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Pages</p>
            <ul className="space-y-0.5">
              {doc.pages.map((page) => {
                const isActive = page.id === activePage.id;
                return (
                  <li key={page.id}>
                    <button
                      onClick={() => switchPage(page)}
                      className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${isActive ? "bg-gray-100 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
                    >
                      <FileText size={12} className="shrink-0" />
                      <span className="truncate">{page.title || "Untitled"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
          {/* Slim header */}
          <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">DocVault</span>
            <span className="text-xs text-gray-400 select-none">View only</span>
          </div>

          <div className="flex justify-center px-4 py-8">
            <div className="w-full max-w-3xl">
              {/* Page title */}
              <h1 className="mb-6 text-[1.5rem] font-semibold leading-tight tracking-tight text-gray-900">
                {activePage.title || "Untitled"}
              </h1>

              {/* Read-only content */}
              <div
                ref={contentRef}
                className="ProseMirror prose-viewer"
                dangerouslySetInnerHTML={{ __html: activePage.content }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
