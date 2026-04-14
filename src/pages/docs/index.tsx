"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  type StoredDocument,
} from "@/lib/documents";
import ToastRegion, { type ToastMessage } from "@/components/ui/ToastRegion";
import { getCurrentUser, logoutUser, type AuthUser } from "@/lib/auth-client";
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
    await router.replace("/login");
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
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isGuestMode
                ? "Guest mode: local storage only"
                : `Signed in as ${user?.name || user?.email}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                void handleCreate();
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              title="Create a new document"
            >
              <Plus size={16} />
              New document
            </button>
            {isGuestMode ? (
              <button
                onClick={() => {
                  void router.push("/login");
                }}
                className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                title="Sign in to sync documents"
              >
                Sign in to sync
              </button>
            ) : (
              <button
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
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
          <div className="mt-8 rounded-xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <Link href={`/docs/${doc.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.title || "Untitled"}</p>
                    <p className="text-xs text-gray-500">Updated {new Date(doc.updatedAt).toLocaleString()}</p>
                  </Link>
                  <button
                    onClick={() => {
                      void handleDelete(doc.id);
                    }}
                    className="cursor-pointer rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <Trash2 size={16} />
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
