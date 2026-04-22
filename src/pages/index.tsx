"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText, Search, SortAsc, Clock, LogIn, LogOut, BookOpen, Shield, ArrowLeft } from "lucide-react";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  type StoredDocument,
} from "@/lib/documents";
import ToastRegion, { type ToastMessage } from "@/components/ui/ToastRegion";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BrandLogo from "@/components/ui/BrandLogo";
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
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "name">("date");

  const [theme, setTheme] = useState<EditorTheme>("docvault-light");
  const isDarkTheme = theme.includes("dark");

  const pushToast = (tone: ToastMessage["tone"], message: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((previous) => [...previous, { id, tone, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  };

  const reload = useCallback(async (activeGuestMode: boolean) => {
    setIsLoadingDocs(true);
    try {
      const nextDocuments = activeGuestMode
        ? await listGuestDocuments()
        : await listDocuments();
      setDocuments(nextDocuments);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const currentUser = await getCurrentUser().catch(() => null);
      setUser(currentUser);
      const nextIsGuestMode = !currentUser;
      setIsGuestMode(nextIsGuestMode);
      setAuthChecked(true);

      setIsLoadingDocs(true);
      try {
        const nextDocuments = nextIsGuestMode
          ? await listGuestDocuments()
          : await listDocuments();
        setDocuments(nextDocuments);
      } catch (err) {
        console.error("Failed to initial load documents:", err);
      } finally {
        setIsLoadingDocs(false);
      }
    })();
  }, [router.asPath]);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setIsGuestMode(true);
    await reload(true);
    pushToast("success", "Logged out");
  };

  const handleCreate = async () => {
    try {
      const newDoc = isGuestMode 
        ? await createGuestDocument() 
        : await createDocument();
      pushToast("success", "Document created");
      router.push(`/docs/${newDoc.id}`);
    } catch {
      pushToast("error", "Failed to create document");
    }
  };

  const handleDelete = async (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      if (isGuestMode) {
        await deleteGuestDocument(id);
      } else {
        await deleteDocument(id);
      }
      setDocuments((previous) => previous.filter((doc) => doc.id !== id));
      pushToast("success", "Document deleted");
    } catch {
      pushToast("error", "Failed to delete document");
    }
  };

  useEffect(() => {
    const saved = loadGlobalEditorTheme();
    if (saved) {
      setTheme(saved);
      applyEditorThemeToHtml(saved);
    } else {
      setTheme("docvault-light");
      applyEditorThemeToHtml("docvault-light");
    }
  }, []);

  const filteredDocs = useMemo(() => {
    let result = [...documents];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d => 
        (d.title || "Untitled").toLowerCase().includes(q) ||
        d.pages.some(p => p.title.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      if (sort === "name") {
        return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      }
      return b.updatedAt - a.updatedAt;
    });
    return result;
  }, [documents, search, sort]);

  if (!authChecked) {
    return <LoadingScreen label="Checking session" />;
  }

  return (
    <main className={`min-h-screen bg-(--editor-bg) text-(--editor-text) ${isDarkTheme ? "dark editor-theme-dark" : ""}`}>
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
      
      <AuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSuccess={async () => {
          const currentUser = await getCurrentUser().catch(() => null);
          setUser(currentUser);
          const nextIsGuestMode = !currentUser;
          setIsGuestMode(nextIsGuestMode);
          await reload(nextIsGuestMode);
          pushToast("success", "Signed in and synced");
        }}
      />

      <header className="sticky top-0 z-10 border-b border-(--editor-border) bg-(--editor-bg)/90 backdrop-blur text-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-1.5">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-6 w-6" />
            <span className="text-base font-semibold text-(--editor-text)">Docs</span>
            <span className="text-(--editor-text-muted) opacity-30 select-none">|</span>
            <Link
              href="/passwords"
              className="flex items-center gap-1.5 text-xs text-(--editor-text-muted) hover:text-(--editor-text) transition-colors"
              title="Password Vault"
            >
              <BrandLogo className="h-4 w-4" />
              Vault
            </Link>
            {isGuestMode && (
              <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold tracking-tight text-amber-600 dark:text-amber-400 ring-1 ring-amber-200/50 dark:ring-amber-800/30 uppercase">Guest mode</span>
            )}
          </div>

          <div className="hidden sm:block relative flex-1 max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--editor-text-muted)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full rounded-lg border border-(--editor-border) bg-(--editor-surface) py-1 pl-8 pr-3 text-xs text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSort((s) => s === "date" ? "name" : "date")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--editor-border) bg-(--editor-surface) px-2 py-1 text-xs font-medium text-(--editor-text-muted) hover:bg-(--editor-surface-muted) transition-colors"
              title={sort === "date" ? "Sorted by date" : "Sorted by name"}
            >
              {sort === "date" ? <Clock size={13} /> : <SortAsc size={13} />}
              {sort === "date" ? "Recent" : "A – Z"}
            </button>

            <button
              onClick={() => void handleCreate()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-(--editor-accent) px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
              title="Create a new document"
            >
              <Plus size={15} />
              New
            </button>

            {isGuestMode ? (
              <button
                onClick={() => setIsAuthDialogOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--editor-border) bg-(--editor-surface) px-2 py-1 text-xs font-medium text-(--editor-text) hover:bg-(--editor-surface-muted) transition-colors"
                title="Sign in to sync documents"
              >
                <LogIn size={14} />
                Sign in
              </button>
            ) : (
              <button
                onClick={() => void handleLogout()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--editor-border) bg-(--editor-surface) px-2 py-1 text-xs font-medium text-(--editor-text) hover:bg-(--editor-surface-muted) transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-(--editor-text)">Your Documents</h1>
            <p className="mt-0.5 text-xs text-(--editor-text-muted)">
              {isLoadingDocs ? "Refreshing..." : `${filteredDocs.length} items`}
            </p>
          </div>
        </div>

        {isLoadingDocs && documents.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl border border-(--editor-border) bg-(--editor-surface)/50 animate-pulse" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-(--editor-border) bg-(--editor-surface)/30 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--editor-surface-muted) text-(--editor-text-muted)">
              <Search size={24} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-(--editor-text)">No documents found</h3>
            <p className="mt-1 text-xs text-(--editor-text-muted)">
              {search ? "Try adjusting your search query." : "Create your first document."}
            </p>
            {!search && (
              <button
                onClick={() => void handleCreate()}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-(--editor-accent) px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 grayscale-[0.2]"
              >
                <Plus size={16} />
                Create Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-(--editor-border) bg-(--editor-surface) p-4 shadow-sm transition-all hover:border-(--editor-accent)/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--editor-surface-muted) text-(--editor-accent) transition-colors group-hover:bg-(--editor-accent) group-hover:text-white">
                    <FileText size={18} />
                  </div>
                  <button
                    onClick={(e) => void handleDelete(e, doc.id)}
                    className="rounded-md p-1.5 text-(--editor-text-muted) hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-semibold truncate text-(--editor-text) group-hover:text-(--editor-accent) transition-colors">
                    {doc.title || "Untitled"}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-(--editor-text-muted)">
                    {doc.pages.length} {doc.pages.length === 1 ? "page" : "pages"}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-(--editor-surface-muted) pt-2.5 text-[10px] text-(--editor-text-muted)">
                   <Clock size={11} className="opacity-60" />
                   <span>{relativeTime(doc.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
