import type { StoredComment, StoredDocument } from "@/lib/documents-types";

export type {
  StoredComment,
  StoredDocument,
  StoredPage,
} from "@/lib/documents-types";

async function requestJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function listDocuments(): Promise<StoredDocument[]> {
  const payload = await requestJson<{ documents: StoredDocument[] }>(
    "/api/documents",
  );
  return payload.documents;
}

export async function getDocument(id: string): Promise<StoredDocument | null> {
  const response = await fetch(`/api/documents/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch document ${id}`);
  }

  const payload = (await response.json()) as { document: StoredDocument };
  return payload.document;
}

export async function createDocument(): Promise<StoredDocument> {
  const payload = await requestJson<{ document: StoredDocument }>(
    "/api/documents",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  return payload.document;
}

export async function upsertDocument(
  document: StoredDocument,
): Promise<StoredDocument> {
  const payload = await requestJson<{ document: StoredDocument }>(
    `/api/documents/${document.id}`,
    {
      method: "PUT",
      body: JSON.stringify(document),
    },
  );
  return payload.document;
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete document ${id}`);
  }
}

export async function listComments(
  documentId: string,
): Promise<StoredComment[]> {
  const payload = await requestJson<{ comments: StoredComment[] }>(
    `/api/documents/${documentId}/comments`,
  );
  return payload.comments;
}

export async function addComment(
  documentId: string,
  content: string,
  author = "You",
): Promise<StoredComment> {
  const payload = await requestJson<{ comment: StoredComment }>(
    `/api/documents/${documentId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content, author }),
    },
  );
  return payload.comment;
}
