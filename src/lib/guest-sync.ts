import { addComment, upsertDocument } from "@/lib/documents";
import {
  deleteGuestDocument,
  listGuestComments,
  listGuestDocuments,
} from "@/lib/guest-documents";

export async function syncGuestDataToServer(): Promise<void> {
  const guestDocuments = await listGuestDocuments();
  if (guestDocuments.length === 0) return;

  for (const document of guestDocuments) {
    await upsertDocument(document);

    const guestComments = await listGuestComments(document.id);
    for (const comment of guestComments) {
      await addComment(document.id, comment.content, comment.author || "Guest");
    }

    await deleteGuestDocument(document.id);
  }
}
