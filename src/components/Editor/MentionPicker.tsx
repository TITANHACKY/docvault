import { useEffect, useMemo, useRef } from "react";
import { FileText } from "lucide-react";
import type { Editor } from "@tiptap/core";

interface MentionPage {
    id: string;
    title: string;
    href: string;
}

interface MentionPickerProps {
    editor: Editor;
    position: { top: number; left: number };
    query: string;
    selectedIndex: number;
    pages: MentionPage[];
    onQueryChange: (q: string) => void;
    onSelectedIndexChange: (i: number) => void;
    onClose: () => void;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildPageMentionMarkup(page: MentionPage): string {
    const safeTitle = escapeHtml(page.title || "Untitled");
    const safeHref = escapeHtml(page.href);
    const safePageId = escapeHtml(page.id);
    return `<a href="${safeHref}" class="page-mention" data-page-id="${safePageId}">${safeTitle}</a>`;
}

export default function MentionPicker({
    editor, position, query, selectedIndex, pages,
    onQueryChange, onSelectedIndexChange, onClose,
}: MentionPickerProps) {
    const ref = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return pages;
        return pages.filter((p) => p.title.toLowerCase().includes(normalized));
    }, [pages, query]);

    useEffect(() => {
        onSelectedIndexChange(0);
    }, [query]);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (ref.current?.contains(event.target as Node)) return;
            onClose();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") { onClose(); return; }
            if (filtered.length === 0) return;
            if (event.key === "ArrowDown") { event.preventDefault(); onSelectedIndexChange(Math.min(selectedIndex + 1, filtered.length - 1)); return; }
            if (event.key === "ArrowUp") { event.preventDefault(); onSelectedIndexChange(Math.max(selectedIndex - 1, 0)); return; }
            if (event.key === "Enter") {
                event.preventDefault();
                const page = filtered[selectedIndex];
                if (!page) return;
                editor.chain().focus().insertContent(buildPageMentionMarkup({ id: page.id, title: page.title || "Untitled", href: page.href })).run();
                onClose();
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [filtered, selectedIndex, editor, onClose, onSelectedIndexChange]);

    const insertPage = (page: MentionPage) => {
        editor.chain().focus().insertContent(buildPageMentionMarkup({ id: page.id, title: page.title || "Untitled", href: page.href })).run();
        onClose();
    };

    return (
        <div
            ref={ref}
            className="absolute z-60 w-155 rounded-2xl border border-gray-200 bg-white shadow-2xl"
            style={{ top: position.top, left: position.left }}
        >
            <div className="border-b border-gray-200 px-4 pt-3">
                <div className="mb-3 flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-500">
                    <span>/Mention a Page</span>
                    <input
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="Type page name..."
                        className="min-w-0 flex-1 bg-transparent text-gray-400 outline-none"
                    />
                </div>
                <div className="flex items-center gap-8 px-2 pb-3 text-sm text-gray-500">
                    <button className="font-medium text-gray-500">Tasks</button>
                    <button className="border-b-2 border-indigo-500 pb-1 font-medium text-indigo-600">Docs</button>
                    <button className="font-medium text-gray-500">Whiteboards</button>
                    <button className="font-medium text-gray-500">People</button>
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-gray-500">No matching pages.</p>
                ) : (
                    <ul className="space-y-1">
                        {filtered.map((page, index) => (
                            <li key={page.id}>
                                <button
                                    onMouseEnter={() => onSelectedIndexChange(index)}
                                    onClick={() => insertPage(page)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${index === selectedIndex ? "bg-gray-100 text-gray-900" : "text-gray-800 hover:bg-gray-50"}`}
                                >
                                    <FileText size={18} className="text-gray-500" />
                                    <span>{page.title || "Untitled"}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
