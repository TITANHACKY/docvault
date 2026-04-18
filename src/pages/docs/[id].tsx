"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { getCurrentUser } from "@/lib/auth-client";
import { getDocument, upsertDocument, type StoredPage } from "@/lib/documents";
import { createGuestDocument, getGuestDocument } from "@/lib/guest-documents";
import { applyEditorThemeToHtml, hydrateEditorThemeFromStorage } from "@/lib/html-theme";
import { loadGlobalEditorTheme } from "@/lib/editor-themes";

function createInitialPage(): StoredPage {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "<p></p>",
    createdAt: now,
    updatedAt: now,
  };
}

export default function DocRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const theme = loadGlobalEditorTheme() ?? "notesnook-light";
    applyEditorThemeToHtml(theme);
  }, []);

  useEffect(() => {
    hydrateEditorThemeFromStorage();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const docId = typeof router.query.id === "string" ? router.query.id : null;
    if (!docId) return;

    let cancelled = false;

    void (async () => {
      const user = await getCurrentUser().catch(() => null);
      const existing = user
        ? await getDocument(docId)
        : await getGuestDocument(docId);

      if (cancelled) return;

      if (existing && existing.activePageId) {
        void router.replace(`/docs/${docId}/${existing.activePageId}`);
        return;
      }

      const now = Date.now();
      const firstPage = createInitialPage();

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

        if (!cancelled) {
          void router.replace(`/docs/${docId}/${firstPage.id}`);
        }
        return;
      }

      const createdGuestDoc = await createGuestDocument({
        id: docId,
        title: "Doc",
        content: firstPage.content,
      });

      if (!cancelled) {
        void router.replace(`/docs/${docId}/${createdGuestDoc.activePageId}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="editor-theme min-h-screen bg-(--editor-bg) text-(--editor-text) flex items-center justify-center text-sm text-(--editor-text-muted)">
      Opening document...
    </main>
  );
}
