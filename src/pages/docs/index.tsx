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

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);

  const reload = useCallback(async () => {
    const nextDocuments = await listDocuments();
    setDocuments(nextDocuments);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void reload();
    }, 0);

    return () => clearTimeout(timeout);
  }, [reload]);

  const emptyState = useMemo(() => documents.length === 0, [documents.length]);

  const handleCreate = async () => {
    const doc = await createDocument();
    router.push(`/docs/${doc.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    await reload();
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-gray-500 mt-1">Local POC storage with autosave.</p>
          </div>
          <button
            onClick={() => {
              void handleCreate();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus size={16} />
            New document
          </button>
        </div>

        {emptyState ? (
          <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-600">No documents yet.</p>
            <button
              onClick={() => {
                void handleCreate();
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
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
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    aria-label="Delete document"
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
