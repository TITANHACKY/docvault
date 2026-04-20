"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText, Search, SortAsc, Clock, LogIn, LogOut, BookOpen, Shield } from "lucide-react";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  type StoredDocument,
} from "@/lib/documents";
import ToastRegion, { type ToastMessage } from "@/components/ui/ToastRegion";
import { getCurrentUser, logoutUser, type AuthUser } from "@/lib/auth-client";
import AuthDialog from "@/components/auth/AuthDialog";
import {
  getEditorTheme,
  loadGlobalEditorTheme,
  type EditorTheme,
} from "@/lib/editor-themes";
import { applyEditorThemeToHtml } from "@/lib/html-theme";
import {
  createGuestDocument,
  deleteGuestDocument,
  listGuestDocuments,
} from "@/lib/guest-documents";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "name">("date");
  const [theme] = useState<EditorTheme>(() => {
    if (typeof window === "undefined") return "docvault-light";
    return loadGlobalEditorTheme() ?? "docvault-light";
  });

  const themeDefinition = useMemo(() => getEditorTheme(theme), [theme]);
  const isDarkTheme = themeDefinition.mode === "dark";
  const themeModeClass = isDarkTheme ? "editor-theme-dark" : "editor-theme-light";
  useEffect(() => {
    applyEditorThemeToHtml(theme);
  }, [theme]);

  const pushToast = useCallback((tone: ToastMessage["tone"], message: string) => {
    setToasts((previous) => [
      ...previous,
      { id: crypto.randomUUID(), tone, message },
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const reload = useCallback(async () => {
    const nextDocuments = isGuestMode
      ? await listGuestDocuments()
      : await listDocuments();
    setDocuments(nextDocuments);
  }, [isGuestMode]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void (async () => {
        const currentUser = await getCurrentUser().catch(() => null);
        setUser(currentUser);
        const nextIsGuestMode = !currentUser;
        setIsGuestMode(nextIsGuestMode);
        setAuthChecked(true);

        const nextDocuments = nextIsGuestMode
          ? await listGuestDocuments()
          : await listDocuments();
        setDocuments(nextDocuments);
      })();
    }, 0);

    return () => clearTimeout(timeout);
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setIsGuestMode(true);
    const nextDocuments = await listGuestDocuments();
    setDocuments(nextDocuments);
    pushToast("info", "Signed out");
  };

  const emptyState = useMemo(() => documents.length === 0, [documents.length]);

  const visibleDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? documents.filter((d) => (d.title || "Untitled").toLowerCase().includes(q))
      : documents;
    return [...filtered].sort((a, b) =>
      sort === "name"
        ? (a.title || "Untitled").localeCompare(b.title || "Untitled")
        : b.updatedAt - a.updatedAt,
    );
  }, [documents, search, sort]);

  const handleCreate = async () => {
    try {
      const doc = isGuestMode
        ? await createGuestDocument()
        : await createDocument();
      pushToast("success", "Document created");
      router.push(`/docs/${doc.id}`);
    } catch {
      pushToast("error", "Could not create document");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this document permanently?");
    if (!confirmed) return;

    try {
      if (isGuestMode) {
        await deleteGuestDocument(id);
      } else {
        await deleteDocument(id);
      }
      await reload();
      pushToast("success", "Document deleted");
    } catch {
      pushToast("error", "Could not delete document");
    }
  };

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Checking session…
      </main>
    );
  }

  return (
    <main className={`editor-theme ${themeModeClass} min-h-screen bg-(--editor-bg) text-(--editor-text)`}>
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
      <AuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSuccess={async () => {
          const currentUser = await getCurrentUser().catch(() => null);
          setUser(currentUser);
          setIsGuestMode(!currentUser);
          await reload();
          pushToast("success", "Signed in and synced");
        }}
      />

      {/* ── Top nav bar ───────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-(--editor-border) bg-(--editor-bg)/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <BookOpen size={20} className="text-(--editor-accent)" />
            <span className="text-base font-semibold text-(--editor-text)">Docs</span>
            <span className="text-(--editor-text-muted) opacity-30 select-none">|</span>
            <Link
              href="/passwords"
              className="flex items-center gap-1.5 text-sm text-(--editor-text-muted) hover:text-(--editor-text) transition-colors"
              title="Password Vault"
            >
              <Shield size={15} />
              Vault
            </Link>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--editor-text-muted)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full rounded-lg border border-(--editor-border) bg-(--editor-surface) py-2 pl-9 pr-3 text-sm text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <button
              onClick={() => setSort((s) => s === "date" ? "name" : "date")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--editor-border) bg-(--editor-surface) px-3 py-2 text-xs font-medium text-(--editor-text-muted) hover:bg-(--editor-surface-muted) transition-colors"
              title={sort === "date" ? "Sorted by date — click to sort by name" : "Sorted by name — click to sort by date"}
            >
              {sort === "date" ? <Clock size={14} /> : <SortAsc size={14} />}
              {sort === "date" ? "Recent" : "A – Z"}
            </button>

            <button
              onClick={() => void handleCreate()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-(--editor-accent) px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
              title="Create a new document"
            >
              <Plus size={16} />
              New
            </button>

            {isGuestMode ? (
              <button
                onClick={() => setIsAuthDialogOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--editor-border) bg-(--editor-surface) px-3 py-2 text-sm font-medium text-(--editor-text) hover:bg-(--editor-surface-muted) transition-colors"
                title="Sign in to sync documents"
              >
                <LogIn size={15} />
                Sign in
              </button>
            ) : (
              <button
                onClick={() => void handleLogout()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--editor-border) bg-(--editor-surface) px-3 py-2 text-sm font-medium text-(--editor-text) hover:bg-(--editor-surface-muted) transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Identity row */}
        <div className="mb-6 flex items-center gap-2 text-sm text-(--editor-text-muted)">
          <span className={`h-2 w-2 rounded-full ${isGuestMode ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          {isGuestMode
            ? "Guest mode — documents are stored locally"
            : `Signed in as ${user?.name || user?.email}`}
          <span className="ml-auto text-xs opacity-60">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </span>
        </div>

        {/* Empty state */}
        {emptyState ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-(--editor-border) bg-(--editor-surface)/40 px-8 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-(--editor-surface) shadow-sm ring-1 ring-(--editor-border)">
              <FileText size={26} className="text-(--editor-accent)" />
            </div>
            <p className="text-base font-semibold text-(--editor-text)">No documents yet</p>
            <p className="mt-1 text-sm text-(--editor-text-muted)">Create your first document to get started.</p>
            <button
              onClick={() => void handleCreate()}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-(--editor-accent) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <Plus size={16} />
              Create document
            </button>
          </div>
        ) : visibleDocuments.length === 0 ? (
          /* No search results */
          <div className="mt-8 text-center text-sm text-(--editor-text-muted)">
            No documents match <span className="font-medium text-(--editor-text)">&ldquo;{search}&rdquo;</span>
          </div>
        ) : (
          /* Card grid */
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDocuments.map((doc) => {
              const pageCount = doc.pages?.length ?? 1;
              return (
                <li key={doc.id} className="group relative flex flex-col rounded-2xl border border-(--editor-border) bg-(--editor-surface) shadow-sm transition-all hover:shadow-md hover:border-(--editor-accent)/40 hover:-translate-y-0.5">
                  <Link
                    href={`/docs/${doc.id}/${doc.activePageId}`}
                    className="flex flex-1 flex-col gap-2 p-5"
                  >
                    {/* Doc icon + title */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--editor-accent)/10">
                        <FileText size={16} className="text-(--editor-accent)" />
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-(--editor-text)">
                        {doc.title || "Untitled"}
                      </p>
                    </div>

                    {/* Meta row */}
                    <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-(--editor-text-muted)">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {relativeTime(doc.updatedAt)}
                      </span>
                      <span className="ml-auto rounded-full bg-(--editor-surface-muted) px-2 py-0.5 font-medium">
                        {pageCount} {pageCount === 1 ? "page" : "pages"}
                      </span>
                    </div>
                  </Link>

                  {/* Delete — appears on hover, positioned top-right */}
                  <button
                    onClick={() => void handleDelete(doc.id)}
                    className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-(--editor-text-muted) opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}

            {/* New-doc card */}
            <li>
              <button
                onClick={() => void handleCreate()}
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-(--editor-border) bg-(--editor-surface)/40 p-8 text-sm text-(--editor-text-muted) transition-colors hover:border-(--editor-accent)/50 hover:bg-(--editor-surface) hover:text-(--editor-accent)"
              >
                <Plus size={20} />
                New document
              </button>
            </li>
          </ul>
        )}
      </div>
    </main>
  );
}
