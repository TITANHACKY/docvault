"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
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
import {
  createGuestDocument,
  deleteGuestDocument,
  listGuestDocuments,
} from "@/lib/guest-documents";

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [theme] = useState<EditorTheme>(() => {
    if (typeof window === "undefined") return "notesnook-light";
    return loadGlobalEditorTheme() ?? "notesnook-light";
  });

  const themeDefinition = useMemo(() => getEditorTheme(theme), [theme]);
  const isDarkTheme = themeDefinition.mode === "dark";
  const themeModeClass = isDarkTheme ? "editor-theme-dark" : "editor-theme-light";
  const themeStyle = useMemo(
    () => ({
      "--editor-bg": themeDefinition.palette.bg,
      "--editor-surface": themeDefinition.palette.surface,
      "--editor-surface-muted": themeDefinition.palette.surfaceMuted,
      "--editor-border": themeDefinition.palette.border,
      "--editor-text": themeDefinition.palette.text,
      "--editor-text-muted": themeDefinition.palette.textMuted,
      "--editor-prose": themeDefinition.palette.prose,
      "--editor-accent": themeDefinition.accent,
    } as CSSProperties),
    [themeDefinition],
  );

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
        Checking session...
      </main>
    );
  }

  return (
    <main className={`editor-theme ${themeModeClass} min-h-screen bg-(--editor-bg) text-(--editor-text)`} style={themeStyle}>
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

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-(--editor-text)">Documents</h1>
            <p className="text-base text-(--editor-text-muted) mt-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${isGuestMode ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}></span>
              {isGuestMode
                ? "Guest mode (Local only)"
                : `Signed in as ${user?.name || user?.email}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                void handleCreate();
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-(--editor-accent) px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-(--editor-accent)/10 transition-all hover:opacity-90 active:scale-95"
              title="Create a new document"
            >
              <Plus size={18} />
              New document
            </button>
            {isGuestMode ? (
              <button
                onClick={() => {
                  setIsAuthDialogOpen(true);
                }}
                className="inline-flex cursor-pointer items-center rounded-xl bg-(--editor-surface) px-4 py-2.5 text-sm font-semibold text-(--editor-text) shadow-sm ring-1 ring-inset ring-(--editor-border) transition-all hover:bg-(--editor-surface-muted)"
                title="Sign in to sync documents"
              >
                Sign in
              </button>
            ) : (
              <button
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex cursor-pointer items-center rounded-xl bg-(--editor-surface) px-4 py-2.5 text-sm font-semibold text-(--editor-text) shadow-sm ring-1 ring-inset ring-(--editor-border) transition-all hover:bg-(--editor-surface-muted)"
                title="Sign out"
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        {emptyState ? (
          <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-600">No documents yet.</p>
            <button
              onClick={() => {
                void handleCreate();
              }}
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
              title="Create your first document"
            >
              <FileText size={16} />
              Create your first document
            </button>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-(--editor-border) bg-(--editor-surface)">
            <ul className="divide-y divide-(--editor-border)">
              {documents.map((doc) => (
                <li key={doc.id} className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-(--editor-surface-muted)">
                  <Link href={`/docs/${doc.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-lg font-medium text-(--editor-text)">{doc.title || "Untitled"}</p>
                    <p className="text-sm text-(--editor-text-muted) mt-0.5">Updated {new Date(doc.updatedAt).toLocaleString()}</p>
                  </Link>
                  <button
                    onClick={() => {
                      void handleDelete(doc.id);
                    }}
                    className="cursor-pointer rounded-lg p-2.5 text-(--editor-text-muted) transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
