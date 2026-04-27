"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import LinkExtension from "@tiptap/extension-link";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import ImageExtension from "@tiptap/extension-image";
import type { Editor as CoreEditor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { common, createLowlight } from "lowlight";
import { Callout } from "@/lib/Callout";
import { ActionButton } from "@/lib/ActionButton";
import { GripVertical, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import SlashMenu from "./SlashMenu";
import { getFlatItems, type SlashCommandItem } from "@/lib/slash-commands";
import EditorBubbleMenu from "./Editor/BubbleMenu";
import ButtonBuilder from "./Editor/ButtonBuilder";
import MentionPicker from "./Editor/MentionPicker";
import TableControls from "./Editor/TableControls";

const lowlight = createLowlight(common);

/* ─── Props ───────────────────────────────────────────────── */
interface TiptapEditorProps {
    onStatsChange?: (stats: { words: number; characters: number }) => void;
    title: string;
    onTitleChange: (title: string) => void;
    content: string;
    onContentChange: (content: string) => void;
    showOwners?: boolean;
    showLastModified?: boolean;
    fontClass?: string;
    onCreatePage?: () => void;
    mentionPages?: Array<{ id: string; title: string; href: string }>;
    onOpenLinkedPage?: (pageId: string) => void;
}

type ButtonAlign = "left" | "center" | "right";

interface TableUiState {
    tablePos: number;
    tableTop: number;
    tableLeft: number;
    tableWidth: number;
    tableHeight: number;
    surfaceTop: number;
    surfaceLeft: number;
    surfaceWidth: number;
    surfaceHeight: number;
    firstRowTop: number;
    firstRowHeight: number;
    cellTop: number;
    cellLeft: number;
    cellWidth: number;
    cellHeight: number;
}

/* ─── Component ───────────────────────────────────────────── */
const TiptapEditor = ({
    onStatsChange, title, onTitleChange, content, onContentChange,
    showOwners = true, showLastModified = true, fontClass = '',
    onCreatePage, mentionPages = [], onOpenLinkedPage,
}: TiptapEditorProps) => {
    /* Slash-menu state */
    const [slashMenuOpen, setSlashMenuOpen] = useState(false);
    const [slashQuery, setSlashQuery] = useState("");
    const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);
    const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);

    /* ButtonBuilder state */
    const [buttonBuilderOpen, setButtonBuilderOpen] = useState(false);
    const [buttonBuilderPos, setButtonBuilderPos] = useState<{ top: number; left: number }>({ top: 16, left: 16 });
    const [buttonTitle, setButtonTitle] = useState("Add button");
    const [buttonUrl, setButtonUrl] = useState("https://");
    const [buttonColor, setButtonColor] = useState("#7c6ee6");
    const [buttonAlign, setButtonAlign] = useState<ButtonAlign>("center");

    /* MentionPicker state */
    const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
    const [mentionPickerPos, setMentionPickerPos] = useState<{ top: number; left: number }>({ top: 16, left: 16 });
    const [mentionQuery, setMentionQuery] = useState("");
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

    /* Drag-handle state */
    const [hoveredBlock, setHoveredBlock] = useState<{ top: number; pos: number } | null>(null);
    const [dropLineY, setDropLineY] = useState<number | null>(null);
    const [tableUi, setTableUi] = useState<TableUiState | null>(null);
    const dragSourcePos = useRef<number | null>(null);
    const dropTargetRef = useRef<number | null>(null);

    /* Refs */
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const tableControlsRef = useRef<HTMLDivElement>(null);
    const onOpenLinkedPageRef = useRef(onOpenLinkedPage);

    const updateTableUi = useCallback((editorInstance: CoreEditor) => {
        if (!editorInstance.isActive('table')) { setTableUi(null); return; }

        const wrapperRect = wrapperRef.current?.getBoundingClientRect();
        if (!wrapperRect) { setTableUi(null); return; }

        const { from } = editorInstance.state.selection;
        const domAtPos = editorInstance.view.domAtPos(from);
        const baseNode = domAtPos.node;
        const baseElement = baseNode instanceof HTMLElement ? baseNode : baseNode.parentElement;
        const table = baseElement?.closest('table') as HTMLElement | null;
        if (!table) { setTableUi(null); return; }

        const tableRect = table.getBoundingClientRect();
        const tableWrapper = table.closest('.tableWrapper') as HTMLElement | null;
        const surfaceRect = tableWrapper?.getBoundingClientRect() ?? tableRect;
        const firstRow = table.querySelector('tr') as HTMLElement | null;
        const firstRowRect = firstRow?.getBoundingClientRect();

        const { $from } = editorInstance.state.selection;
        let tablePos: number | null = null;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
            if ($from.node(depth).type.name === 'table') { tablePos = $from.before(depth); break; }
        }
        if (tablePos === null) { setTableUi(null); return; }

        setTableUi({
            tablePos,
            tableTop: tableRect.top - wrapperRect.top,
            tableLeft: tableRect.left - wrapperRect.left,
            tableWidth: tableRect.width,
            tableHeight: tableRect.height,
            surfaceTop: surfaceRect.top - wrapperRect.top,
            surfaceLeft: surfaceRect.left - wrapperRect.left,
            surfaceWidth: surfaceRect.width,
            surfaceHeight: surfaceRect.height,
            firstRowTop: firstRowRect ? firstRowRect.top - wrapperRect.top : tableRect.top - wrapperRect.top,
            firstRowHeight: firstRowRect ? firstRowRect.height : Math.min(tableRect.height, 44),
            cellTop: 0, cellLeft: 0, cellWidth: 0, cellHeight: 0,
        });
    }, []);

    useEffect(() => { onOpenLinkedPageRef.current = onOpenLinkedPage; }, [onOpenLinkedPage]);

    /* ─── Editor Setup ────────────────────────────────────── */
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, codeBlock: false }),
            CodeBlockLowlight.configure({ lowlight }),
            Placeholder.configure({
                placeholder: ({ node }) => {
                    if (node.type.name === "heading") return `Heading ${node.attrs.level}`;
                    if (node.type.name === "callout") return "Type something in the callout...";
                    return " Write, press '/' for commands";
                },
                includeChildren: true,
            }),
            Underline, TextStyle, Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            LinkExtension.configure({ openOnClick: false }),
            Table.configure({ resizable: true, handleWidth: 8, cellMinWidth: 80, lastColumnResizable: true }),
            TableRow, TableHeader, TableCell,
            ImageExtension, ActionButton, Callout, TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: content || "<p></p>",
        editorProps: {
            attributes: { class: "focus:outline-none min-h-[200px]" },
            handleKeyDown: (view, event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
                    const { state } = view;
                    const { $from, from, to } = state.selection;
                    const nodeStart = $from.start();
                    const nodeEnd = $from.end();
                    if (nodeEnd > nodeStart && !(from === nodeStart && to === nodeEnd)) {
                        view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, nodeStart, nodeEnd)));
                        event.preventDefault();
                        return true;
                    }
                }
                return false;
            },
            clipboardTextSerializer: (slice) => {
                let text = '';
                slice.content.forEach((node) => {
                    if (node.type.name === 'bulletList') {
                        node.content.forEach((li) => { text += `• ${li.textContent}\n`; });
                    } else if (node.type.name === 'orderedList') {
                        let idx = 1;
                        node.content.forEach((li) => { text += `${idx}. ${li.textContent}\n`; idx++; });
                    } else if (node.type.name === 'taskList') {
                        node.content.forEach((li) => { text += `${li.attrs.checked ? '☑' : '☐'} ${li.textContent}\n`; });
                    } else {
                        text += node.textContent + '\n';
                    }
                });
                return text.trimEnd();
            },
            handleClick: (_view, _pos, event) => {
                const target = event.target as HTMLElement | null;
                const anchor = target?.closest("a");
                const openLinkedPage = onOpenLinkedPageRef.current;
                if (!anchor || !openLinkedPage) return false;
                const href = anchor.getAttribute("href");
                if (!href) return false;
                try {
                    const parsed = new URL(href, window.location.origin);
                    let pageId = parsed.searchParams.get("page");
                    if (!pageId) {
                        const segments = parsed.pathname.split("/").filter(Boolean);
                        if (segments.length >= 3 && segments[0] === "docs") pageId = decodeURIComponent(segments[2]);
                    }
                    if (!pageId) return false;
                    event.preventDefault();
                    openLinkedPage(pageId);
                    return true;
                } catch { return false; }
            },
            handlePaste: (view, event) => {
                const imageItem = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith('image'));
                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const src = e.target?.result as string;
                            const node = view.state.schema.nodes.image.create({ src });
                            view.dispatch(view.state.tr.replaceSelectionWith(node));
                        };
                        reader.readAsDataURL(file);
                        return true;
                    }
                }
                return false;
            },
            handleDrop: (view, event) => {
                const imageFile = Array.from(event.dataTransfer?.files || []).find((f) => f.type.startsWith('image'));
                if (imageFile) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const src = e.target?.result as string;
                        const node = view.state.schema.nodes.image.create({ src });
                        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        if (coordinates) view.dispatch(view.state.tr.insert(coordinates.pos, node));
                    };
                    reader.readAsDataURL(imageFile);
                    event.preventDefault();
                    return true;
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            handleSlashDetection(editor);
            updateTableUi(editor);
            const text = editor.state.doc.textContent;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            onStatsChange?.({ words, characters: text.length });
            onContentChange(editor.getHTML());
        },
        onSelectionUpdate: ({ editor }) => {
            updateTableUi(editor);
        },
    });

    useEffect(() => {
        if (!editor) return;
        const onViewportChange = () => updateTableUi(editor);
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);
        return () => {
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
        };
    }, [editor, updateTableUi]);

    /* Cmd+K shortcut to open link */
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom;
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const { from, to } = editor.state.selection;
                if (from === to) return;
                if (!editor.isActive('link')) editor.chain().focus().run();
            }
        };
        dom.addEventListener('keydown', onKeyDown);
        return () => dom.removeEventListener('keydown', onKeyDown);
    }, [editor]);

    useEffect(() => {
        if (!editor) return;
        const nextContent = content || "<p></p>";
        if (editor.getHTML() === nextContent) return;
        editor.commands.setContent(nextContent, { emitUpdate: false });
    }, [editor, content]);

    /* ─── Slash Detection ─────────────────────────────────── */
    const handleSlashDetection = (editorInstance: CoreEditor) => {
        const { state } = editorInstance;
        const { $from } = state.selection;
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
        const slashIndex = textBefore.lastIndexOf("/");
        if (slashIndex !== -1) {
            const query = textBefore.slice(slashIndex + 1);
            const from = $from.start() + slashIndex;
            const to = $from.pos;
            const coords = editorInstance.view.coordsAtPos(from);
            const rect = wrapperRef.current?.getBoundingClientRect();
            if (rect) setSlashMenuPos({ top: coords.bottom - rect.top + 4, left: coords.left - rect.left });
            setSlashQuery(query);
            setSlashRange({ from, to });
            setSlashMenuOpen(true);
        } else {
            setSlashMenuOpen(false);
        }
    };

    /* ─── Drag Handle ─────────────────────────────────────── */
    useEffect(() => {
        if (!editor) return;
        const contentEl = contentRef.current;
        if (!contentEl) return;

        const getClosestBlockAtY = (clientX: number, clientY: number): { rect: DOMRect; pos: number } | null => {
            let best: { rect: DOMRect; pos: number } | null = null;
            let bestDistance = Infinity;
            editor.state.doc.forEach((node, offset) => {
                const domNode = editor.view.nodeDOM(offset) as HTMLElement | null;
                if (!domNode) return;
                const rect = domNode.getBoundingClientRect();
                const isTable = node.type.name === 'table';
                const verticalPadding = isTable ? 20 : 0;
                if (clientY >= rect.top - verticalPadding && clientY <= rect.bottom + verticalPadding && clientX >= rect.left - 150 && clientX <= rect.right) {
                    best = { rect, pos: offset };
                    bestDistance = 0;
                    return false;
                }
                const distance = Math.abs(clientY - (rect.top + rect.bottom) / 2);
                if (distance < bestDistance) { bestDistance = distance; best = { rect, pos: offset }; }
            });
            return best;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (dragSourcePos.current !== null) return;
            if (handleRef.current?.contains(e.target as Node)) return;
            if (tableControlsRef.current?.contains(e.target as Node)) return;

            const contentRect = contentEl.getBoundingClientRect();
            if (editor.isActive('table')) updateTableUi(editor);

            const isWithinBounds =
                e.clientX >= contentRect.left - 150 && e.clientX <= contentRect.right + 100 &&
                e.clientY >= contentRect.top - 50 && e.clientY <= contentRect.bottom + 50;

            if (isWithinBounds) {
                const closestBlock = getClosestBlockAtY(e.clientX, e.clientY);
                if (closestBlock) {
                    const anchorOffset = Math.min(closestBlock.rect.height / 2, 20);
                    setHoveredBlock({ top: closestBlock.rect.top - contentRect.top + anchorOffset, pos: closestBlock.pos });
                    return;
                }
            }
            setHoveredBlock(null);
        };

        document.addEventListener("mousemove", onMouseMove);
        return () => document.removeEventListener("mousemove", onMouseMove);
    }, [editor, updateTableUi]);

    useEffect(() => {
        const onKeyDown = () => setHoveredBlock(null);
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    /* ─── Slash Command Handler ───────────────────────────── */
    const handleSlashCommand = useCallback((item: SlashCommandItem) => {
        if (!editor || !slashRange) return;
        item.action({
            editor, range: slashRange, onCreatePage,
            openMentionPagePicker: () => {
                setMentionQuery("");
                setSelectedMentionIndex(0);
                if (slashMenuPos) setMentionPickerPos(slashMenuPos);
                setMentionPickerOpen(true);
            },
            openButtonBuilder: () => {
                setButtonTitle("Add button");
                setButtonUrl("https://");
                setButtonColor("#7c6ee6");
                setButtonAlign("center");
                if (slashMenuPos) setButtonBuilderPos(slashMenuPos);
                setButtonBuilderOpen(true);
            },
        });
        setSlashMenuOpen(false);
    }, [editor, slashRange, onCreatePage, slashMenuPos]);

    const hasSlashResults = getFlatItems(slashQuery).length > 0;

    /* ─── Add Block Handler ────────────────────────────────── */
    const handleAddBlock = useCallback(() => {
        if (!editor || !hoveredBlock) return;
        try {
            const resolved = editor.state.doc.resolve(hoveredBlock.pos);
            const afterPos = resolved.after(1);
            editor.chain().insertContentAt(afterPos, { type: 'paragraph' }).setTextSelection(afterPos + 1).focus().run();
        } catch { /* ignore */ }
    }, [editor, hoveredBlock]);

    /* ─── Drag Handler ────────────────────────────────────── */
    const startBlockDrag = useCallback((sourcePos: number, e: React.MouseEvent) => {
        if (!editor) return;
        e.preventDefault();
        dragSourcePos.current = sourcePos;
        const contentEl = contentRef.current;
        if (!contentEl) return;

        const onMove = (ev: MouseEvent) => {
            const { doc } = editor.state;
            const contentRect = contentEl.getBoundingClientRect();
            const gaps: { y: number; pos: number }[] = [];
            let prevBottom: number | null = null;

            doc.forEach((node, offset) => {
                const dom = editor.view.nodeDOM(offset) as HTMLElement | null;
                if (!dom) return;
                const rect = dom.getBoundingClientRect();
                if (prevBottom === null) {
                    gaps.push({ y: rect.top - contentRect.top, pos: offset });
                } else {
                    gaps.push({ y: (prevBottom + rect.top) / 2 - contentRect.top, pos: offset });
                }
                prevBottom = rect.bottom;
            });
            if (prevBottom !== null) gaps.push({ y: prevBottom - contentRect.top, pos: doc.content.size });

            let bestGap: { y: number; pos: number } | null = null;
            let bestDist = Infinity;
            for (const gap of gaps) {
                const dist = Math.abs(ev.clientY - contentRect.top - gap.y);
                if (dist < bestDist) { bestDist = dist; bestGap = gap; }
            }

            if (bestGap) { setDropLineY(bestGap.y); dropTargetRef.current = bestGap.pos; }
            else { setDropLineY(null); dropTargetRef.current = null; }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setDropLineY(null);

            const src = dragSourcePos.current;
            const tgt = dropTargetRef.current;
            dragSourcePos.current = null;
            dropTargetRef.current = null;
            if (src === null || tgt === null) return;

            const node = editor.state.doc.nodeAt(src);
            if (!node) return;
            if (tgt >= src && tgt <= src + node.nodeSize) return;

            const { tr } = editor.state;
            tr.delete(src, src + node.nodeSize);
            const mappedTarget = tr.mapping.map(tgt);
            tr.insert(mappedTarget, node);
            const anchorPos = Math.max(1, Math.min(mappedTarget + node.nodeSize - 1, tr.doc.content.size));
            tr.setSelection(TextSelection.near(tr.doc.resolve(anchorPos), -1));
            editor.view.dispatch(tr);
            editor.commands.focus();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [editor]);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (!hoveredBlock) return;
        startBlockDrag(hoveredBlock.pos, e);
    }, [hoveredBlock, startBlockDrag]);

    /* ─── Button insert ───────────────────────────────────── */
    const insertConfiguredButton = useCallback(() => {
        if (!editor) return;
        const safeTitle = buttonTitle.trim() || "Add button";
        const rawUrl = buttonUrl.trim() || "https://";
        const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
        editor.chain().focus().setActionButton({ title: safeTitle, url: safeUrl, color: buttonColor, align: buttonAlign }).run();
        setButtonBuilderOpen(false);
    }, [editor, buttonTitle, buttonUrl, buttonColor, buttonAlign]);

    /* ─── Title auto-resize ───────────────────────────────── */
    const resizeTitle = (el: HTMLTextAreaElement) => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    };

    /* ─── Render ──────────────────────────────────────────── */
    return (
        <div className="relative" ref={wrapperRef}>
            {/* Title */}
            <textarea
                placeholder="Untitled"
                rows={1}
                value={title}
                onChange={(e) => { onTitleChange(e.target.value); resizeTitle(e.target); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editor?.chain().focus().run(); } }}
                ref={(el) => { if (el) resizeTitle(el); }}
                className={`w-full text-[1.5rem] font-semibold leading-[1.2] tracking-tight bg-transparent resize-none border-none outline-none placeholder:text-[#4b5563] mb-2 ${fontClass}`}
            />

            {/* Metadata */}
            {(showOwners || showLastModified) && (
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3" style={{ fontFamily: 'var(--font-system)' }}>
                    {showOwners && (
                        <div className="flex items-center gap-1.5">
                            <div className="relative">
                                <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold">P</div>
                                <div className="absolute -right-0.5 -bottom-0.5 w-1.5 h-1.5 bg-green-500 border border-white rounded-full" />
                            </div>
                            <span className="font-medium text-gray-500">Poonkawin</span>
                        </div>
                    )}
                    {showLastModified && (
                        <>
                            <span className="text-gray-300">&middot;</span>
                            <span suppressHydrationWarning>
                                Last updated Today at{" "}
                                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Content area */}
            <div className={`relative ${fontClass}`} ref={contentRef}>
                {/* Drag handle */}
                {hoveredBlock !== null && (!tableUi || hoveredBlock.pos !== tableUi.tablePos) && (
                    <div
                        ref={handleRef}
                        className="absolute flex items-center gap-0 z-30"
                        style={{ top: hoveredBlock.top, left: -36, transform: 'translateY(-50%)' }}
                    >
                        <button
                            className="editor-handle-btn p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                            title="Add block"
                            onMouseDown={(e) => { e.preventDefault(); handleAddBlock(); }}
                        >
                            <Plus size={13} />
                        </button>
                        <button
                            className="editor-handle-btn p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900 cursor-grab active:cursor-grabbing transition-colors"
                            title="Drag to move"
                            onMouseDown={handleDragStart}
                        >
                            <GripVertical size={13} />
                        </button>
                    </div>
                )}

                {/* Drop indicator */}
                {dropLineY !== null && (
                    <div
                        className="absolute left-0 right-0 h-0.5 z-40 pointer-events-none"
                        style={{ top: dropLineY, backgroundColor: "var(--editor-accent)" }}
                    />
                )}

                <EditorContent editor={editor} />
            </div>

            {/* Bubble menu */}
            {editor && <EditorBubbleMenu editor={editor} />}

            {/* Table controls */}
            {tableUi && hoveredBlock?.pos === tableUi.tablePos && editor && (
                <div ref={tableControlsRef}>
                    <TableControls editor={editor} tableUi={tableUi} onDragStart={startBlockDrag} />
                </div>
            )}

            {/* Button builder */}
            {buttonBuilderOpen && (
                <ButtonBuilder
                    editor={editor!}
                    position={buttonBuilderPos}
                    title={buttonTitle}
                    url={buttonUrl}
                    color={buttonColor}
                    align={buttonAlign}
                    onTitleChange={setButtonTitle}
                    onUrlChange={setButtonUrl}
                    onColorChange={setButtonColor}
                    onAlignChange={setButtonAlign}
                    onInsert={insertConfiguredButton}
                    onClose={() => setButtonBuilderOpen(false)}
                />
            )}

            {/* Mention picker */}
            {mentionPickerOpen && (
                <MentionPicker
                    editor={editor!}
                    position={mentionPickerPos}
                    query={mentionQuery}
                    selectedIndex={selectedMentionIndex}
                    pages={mentionPages}
                    onQueryChange={setMentionQuery}
                    onSelectedIndexChange={setSelectedMentionIndex}
                    onClose={() => setMentionPickerOpen(false)}
                />
            )}

            {/* Slash menu */}
            {editor && slashMenuOpen && hasSlashResults && slashMenuPos && (
                <SlashMenu
                    key={slashQuery}
                    query={slashQuery}
                    command={handleSlashCommand}
                    onClose={() => setSlashMenuOpen(false)}
                    position={slashMenuPos}
                />
            )}
        </div>
    );
};

export default memo(TiptapEditor);
