import { useCallback, useEffect, useState } from "react";
import { addComment, listComments, type StoredComment } from "@/lib/documents";
import { addGuestComment, listGuestComments } from "@/lib/guest-documents";

interface UseCommentSystemOptions {
    docId: string | undefined;
    authChecked: boolean;
    isGuestMode: boolean;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}

export function useCommentSystem({ docId, authChecked, isGuestMode, onSuccess, onError }: UseCommentSystemOptions) {
    const [comments, setComments] = useState<StoredComment[]>([]);
    const [isAddingComment, setIsAddingComment] = useState(false);

    useEffect(() => {
        if (!authChecked || !docId) return;
        const timeout = setTimeout(() => {
            void (async () => {
                const next = isGuestMode ? await listGuestComments(docId) : await listComments(docId);
                setComments(next);
            })();
        }, 0);
        return () => clearTimeout(timeout);
    }, [authChecked, docId, isGuestMode]);

    const handleAddComment = useCallback(async (content: string) => {
        if (!authChecked || !docId) return;
        setIsAddingComment(true);
        try {
            const comment = isGuestMode
                ? await addGuestComment(docId, content, "Guest")
                : await addComment(docId, content, "You");
            setComments((prev) => [...prev, comment]);
            onSuccess("Comment added");
        } catch {
            onError("Could not add comment");
        } finally {
            setIsAddingComment(false);
        }
    }, [authChecked, docId, isGuestMode, onSuccess, onError]);

    return { comments, setComments, isAddingComment, handleAddComment };
}
