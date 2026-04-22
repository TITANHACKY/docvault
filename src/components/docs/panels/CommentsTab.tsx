import { useState } from "react";
import type { StoredComment } from "@/lib/documents-types";

interface CommentsTabProps {
    comments: StoredComment[];
    onAddComment: (content: string) => Promise<void>;
    isAddingComment: boolean;
}

export default function CommentsTab({ comments, onAddComment, isAddingComment }: CommentsTabProps) {
    const [draft, setDraft] = useState("");

    const handleSubmit = async () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        await onAddComment(trimmed);
        setDraft("");
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-3">
                <label className="mb-2 block text-xs font-medium text-gray-500">New comment</label>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                    onClick={() => { void handleSubmit(); }}
                    disabled={isAddingComment || !draft.trim()}
                    className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    title="Add comment"
                >
                    {isAddingComment ? "Adding..." : "Add comment"}
                </button>
            </div>

            <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Thread</p>
                {comments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                        No comments yet.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {comments.map((comment) => (
                            <li key={comment.id} className="rounded-lg border border-gray-200 p-3">
                                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                                    <span className="font-medium text-gray-700">{comment.author}</span>
                                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
