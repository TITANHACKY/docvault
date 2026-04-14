"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
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
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    GripVertical,
    Plus,
    MessageSquare,
    List,
    ChevronDown,
    Link,
    Copy,
    Clipboard,
    MoreHorizontal,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Check,
    Ban,
    ExternalLink,
    X,
    Type,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Flag,
    CodeXml,
    Quote,
    ListOrdered,
    CheckSquare,
    Unlink,
    Pencil,
    FileText,
    Rows3,
    Columns3,
    Table2 as TableIcon,
    Trash2,
    Minus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SlashMenu from "./SlashMenu";
import { getFlatItems, type SlashCommandItem } from "@/lib/slash-commands";

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

/* ─── Component ───────────────────────────────────────────── */
const TiptapEditor = ({ onStatsChange, title, onTitleChange, content, onContentChange, showOwners = true, showLastModified = true, fontClass = '', onCreatePage, mentionPages = [], onOpenLinkedPage }: TiptapEditorProps) => {
    /* Slash-menu state */
    const [slashMenuOpen, setSlashMenuOpen] = useState(false);
    const [slashQuery, setSlashQuery] = useState("");
    const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);
    const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);

    /* Bubble-menu state */
    const [turnIntoOpen, setTurnIntoOpen] = useState(false);
    const [listDropdownOpen, setListDropdownOpen] = useState(false);
    const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
    const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
    const [linkInputOpen, setLinkInputOpen] = useState(false);
    const [linkInputValue, setLinkInputValue] = useState('');
    const [linkEditMode, setLinkEditMode] = useState(false);
    const linkInputRef = useRef<HTMLInputElement>(null);
    const [buttonBuilderOpen, setButtonBuilderOpen] = useState(false);
    const [buttonBuilderPos, setButtonBuilderPos] = useState<{ top: number; left: number }>({ top: 16, left: 16 });
    const [buttonTitle, setButtonTitle] = useState("Add button");
    const [buttonUrl, setButtonUrl] = useState("https://");
    const [buttonColor, setButtonColor] = useState("#7c6ee6");
    const [buttonAlign, setButtonAlign] = useState<ButtonAlign>("center");
    const buttonBuilderRef = useRef<HTMLDivElement>(null);
    const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
    const [mentionPickerPos, setMentionPickerPos] = useState<{ top: number; left: number }>({ top: 16, left: 16 });
    const [mentionQuery, setMentionQuery] = useState("");
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const mentionPickerRef = useRef<HTMLDivElement>(null);

    /* Drag-handle state */
    const [hoveredBlock, setHoveredBlock] = useState<{ top: number; pos: number } | null>(null);
    const [dropLineY, setDropLineY] = useState<number | null>(null);
    const [tableUi, setTableUi] = useState<{
        tablePos: number;
        tableTop: number;
        tableLeft: number;
        tableWidth: number;
        tableHeight: number;
        firstRowTop: number;
        firstRowHeight: number;
        cellTop: number;
        cellLeft: number;
        cellWidth: number;
        cellHeight: number;
    } | null>(null);
    const dragSourcePos = useRef<number | null>(null);
    const dropTargetRef = useRef<number | null>(null);

    /* Refs */
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const onOpenLinkedPageRef = useRef(onOpenLinkedPage);

    const updateTableUi = useCallback((editorInstance: CoreEditor) => {
        if (!editorInstance.isActive('table')) {
            setTableUi(null);
            return;
        }

        const wrapperRect = wrapperRef.current?.getBoundingClientRect();
        if (!wrapperRect) {
            setTableUi(null);
            return;
        }

        const { from } = editorInstance.state.selection;
        const domAtPos = editorInstance.view.domAtPos(from);
        const baseNode = domAtPos.node;
        const baseElement = baseNode instanceof HTMLElement ? baseNode : baseNode.parentElement;
        const table = baseElement?.closest('table') as HTMLElement | null;

        if (!table) {
            setTableUi(null);
            return;
        }

        const tableRect = table.getBoundingClientRect();
        const firstRow = table.querySelector('tr') as HTMLElement | null;
        const firstRowRect = firstRow?.getBoundingClientRect();

        const { $from } = editorInstance.state.selection;
        let tablePos: number | null = null;

        for (let depth = $from.depth; depth > 0; depth -= 1) {
            if ($from.node(depth).type.name === 'table') {
                tablePos = $from.before(depth);
                break;
            }
        }

        if (tablePos === null) {
            setTableUi(null);
            return;
        }

        setTableUi({
            tablePos,
            tableTop: tableRect.top - wrapperRect.top,
            tableLeft: tableRect.left - wrapperRect.left,
            tableWidth: tableRect.width,
            tableHeight: tableRect.height,
            firstRowTop: firstRowRect ? firstRowRect.top - wrapperRect.top : tableRect.top - wrapperRect.top,
            firstRowHeight: firstRowRect ? firstRowRect.height : Math.min(tableRect.height, 44),
            // Use fallback values since we don't need active cell specific measurement for the left control handle
            cellTop: 0,
            cellLeft: 0,
            cellWidth: 0,
            cellHeight: 0,
        });
    }, []);

    useEffect(() => {
        onOpenLinkedPageRef.current = onOpenLinkedPage;
    }, [onOpenLinkedPage]);

    /* ─── Editor Setup ────────────────────────────────────── */
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                codeBlock: false,
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Placeholder.configure({
                placeholder: ({ node }) => {
                    if (node.type.name === "heading") return `Heading ${node.attrs.level}`;
                    if (node.type.name === "callout") return "Type something in the callout...";
                    return "Write, press 'space' for AI, '/' for commands";
                },
                includeChildren: true,
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            LinkExtension.configure({ openOnClick: false }),
            Table.configure({
                resizable: true,
                handleWidth: 8,
                cellMinWidth: 80,
                lastColumnResizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            ImageExtension,
            ActionButton,
            Callout,
            TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: content || "<p></p>",
        editorProps: {
            attributes: {
                class: "focus:outline-none min-h-[200px]",
            },
            handleKeyDown: (view, event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
                    const { state } = view;
                    const { $from, from, to } = state.selection;
                    const nodeStart = $from.start();
                    const nodeEnd = $from.end();
                    // If the node has content and isn't already fully selected, select just this node
                    if (nodeEnd > nodeStart && !(from === nodeStart && to === nodeEnd)) {
                        const tr = state.tr.setSelection(
                            TextSelection.create(state.doc, nodeStart, nodeEnd)
                        );
                        view.dispatch(tr);
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
                        node.content.forEach((li) => {
                            text += `• ${li.textContent}\n`;
                        });
                    } else if (node.type.name === 'orderedList') {
                        let idx = 1;
                        node.content.forEach((li) => {
                            text += `${idx}. ${li.textContent}\n`;
                            idx++;
                        });
                    } else if (node.type.name === 'taskList') {
                        node.content.forEach((li) => {
                            const checked = li.attrs.checked ? '☑' : '☐';
                            text += `${checked} ${li.textContent}\n`;
                        });
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
                    const pageId = parsed.searchParams.get("page");
                    if (!pageId) return false;

                    event.preventDefault();
                    openLinkedPage(pageId);
                    return true;
                } catch {
                    return false;
                }
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
            const { from, to } = editor.state.selection;
            if (from === to) {
                setTurnIntoOpen(false);
                setListDropdownOpen(false);
                setColorDropdownOpen(false);
                setAlignDropdownOpen(false);
                setLinkEditMode(false);
            }
        },
    });

    useEffect(() => {
        if (!editor) return;

        const onViewportChange = () => {
            updateTableUi(editor);
        };

        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);

        return () => {
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
        };
    }, [editor, updateTableUi]);

    /* ─── Cmd/Ctrl+K to open link input ────────────────── */
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom;
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const { from, to } = editor.state.selection;
                if (from === to) return;
                if (editor.isActive('link')) {
                    editor.chain().focus().unsetLink().run();
                } else {
                    setLinkInputOpen(true);
                    setLinkInputValue('');
                    setTimeout(() => linkInputRef.current?.focus(), 0);
                }
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
            if (rect) {
                setSlashMenuPos({
                    top: coords.bottom - rect.top + 4,
                    left: coords.left - rect.left,
                });
            }
            setSlashQuery(query);
            setSlashRange({ from, to });
            setSlashMenuOpen(true);
        } else {
            setSlashMenuOpen(false);
        }
    };

    /* ─── Drag Handle: track mouse over CONTENT area ─────── */
    useEffect(() => {
        if (!editor) return;
        const contentEl = contentRef.current;
        if (!contentEl) return;

        const getClosestBlockAtY = (
            clientX: number,
            clientY: number,
        ): { rect: DOMRect; pos: number } | null => {
            let best: { rect: DOMRect; pos: number } | null = null;
            let bestDistance = Infinity;

            editor.state.doc.forEach((node, offset) => {
                const domNode = editor.view.nodeDOM(offset) as HTMLElement | null;
                if (!domNode) return;
                const rect = domNode.getBoundingClientRect();

                // For tables, we increase the vertical search distance so top/bottom edges are more responsive
                const isTable = node.type.name === 'table';
                const verticalPadding = isTable ? 20 : 0;

                // Check if mouse is within this block's coordinates (including horizontal gutter)
                if (
                    clientY >= rect.top - verticalPadding &&
                    clientY <= rect.bottom + verticalPadding &&
                    clientX >= rect.left - 150 &&
                    clientX <= rect.right
                ) {
                    best = { rect, pos: offset };
                    bestDistance = 0;
                    return false; // break forEach
                }

                const centerY = (rect.top + rect.bottom) / 2;
                const distance = Math.abs(clientY - centerY);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = { rect, pos: offset };
                }
            });

            return best;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (dragSourcePos.current !== null) return;
            // Don't clear hovered block when mouse is over the drag handle buttons
            if (handleRef.current?.contains(e.target as Node)) return;

            const contentRect = contentEl.getBoundingClientRect();

            // Re-calculate table UI positions on mouse move if inside a table to handle scrolling
            if (editor.isActive('table')) {
                updateTableUi(editor);
            }

            // 1. Check if mouse is within the content area horizontally with some gutter padding
            // We increase the bounds slightly to make hovering near edges feel more responsive
            const isWithinHorizontalBounds =
                e.clientX >= contentRect.left - 150 && e.clientX <= contentRect.right + 100;
            const isWithinVerticalBounds =
                e.clientY >= contentRect.top - 50 && e.clientY <= contentRect.bottom + 50;

            if (isWithinHorizontalBounds && isWithinVerticalBounds) {
                const closestBlock = getClosestBlockAtY(e.clientX, e.clientY);
                if (closestBlock) {
                    const anchorOffset = Math.min(closestBlock.rect.height / 2, 20);
                    setHoveredBlock({
                        top: closestBlock.rect.top - contentRect.top + anchorOffset,
                        pos: closestBlock.pos,
                    });
                    return;
                }
            }

            setHoveredBlock(null);
        };

        document.addEventListener("mousemove", onMouseMove);
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
        };
    }, [editor, updateTableUi]);

    /* ─── Clear hovered block on keyboard activity ─────── */
    useEffect(() => {
        const onKeyDown = () => setHoveredBlock(null);
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    /* ─── Slash Command Handler ───────────────────────────── */
    const handleSlashCommand = useCallback(
        (item: SlashCommandItem) => {
            if (!editor || !slashRange) return;
            item.action({
                editor,
                range: slashRange,
                onCreatePage,
                openMentionPagePicker: () => {
                    setMentionQuery("");
                    setSelectedMentionIndex(0);
                    if (slashMenuPos) {
                        setMentionPickerPos(slashMenuPos);
                    }
                    setMentionPickerOpen(true);
                },
                openButtonBuilder: () => {
                    setButtonTitle("Add button");
                    setButtonUrl("https://");
                    setButtonColor("#7c6ee6");
                    setButtonAlign("center");
                    if (slashMenuPos) {
                        setButtonBuilderPos(slashMenuPos);
                    }
                    setButtonBuilderOpen(true);
                },
            });
            setSlashMenuOpen(false);
        },
        [editor, slashRange, onCreatePage, slashMenuPos],
    );

    const hasSlashResults = getFlatItems(slashQuery).length > 0;

    /* ─── Add Block Handler ────────────────────────────────── */
    const handleAddBlock = useCallback(() => {
        if (!editor || !hoveredBlock) return;
        try {
            const resolved = editor.state.doc.resolve(hoveredBlock.pos);
            const afterPos = resolved.after(1);
            editor.chain()
                .insertContentAt(afterPos, { type: 'paragraph' })
                .setTextSelection(afterPos + 1)
                .focus()
                .run();
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

            // Collect one drop target per gap (before first, between blocks, after last)
            const gaps: { y: number; pos: number }[] = [];
            let prevBottom: number | null = null;

            doc.forEach((node, offset) => {
                const dom = editor.view.nodeDOM(offset) as HTMLElement | null;
                if (!dom) return;
                const rect = dom.getBoundingClientRect();

                if (prevBottom === null) {
                    // Before the first block
                    gaps.push({ y: rect.top - contentRect.top, pos: offset });
                } else {
                    // Between blocks — use midpoint of gap
                    const midY = (prevBottom + rect.top) / 2;
                    gaps.push({ y: midY - contentRect.top, pos: offset });
                }
                prevBottom = rect.bottom;
            });

            // After the last block
            if (prevBottom !== null) {
                gaps.push({ y: prevBottom - contentRect.top, pos: doc.content.size });
            }

            // Find closest gap to mouse
            let bestGap: { y: number; pos: number } | null = null;
            let bestDist = Infinity;
            for (const gap of gaps) {
                const dist = Math.abs(ev.clientY - contentRect.top - gap.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestGap = gap;
                }
            }

            if (bestGap) {
                setDropLineY(bestGap.y);
                dropTargetRef.current = bestGap.pos;
            } else {
                setDropLineY(null);
                dropTargetRef.current = null;
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setDropLineY(null);

            const sourcePos = dragSourcePos.current;
            const targetPos = dropTargetRef.current;
            dragSourcePos.current = null;
            dropTargetRef.current = null;

            if (sourcePos === null || targetPos === null) return;

            const node = editor.state.doc.nodeAt(sourcePos);
            if (!node) return;

            // Don't move if dropping on itself
            if (targetPos >= sourcePos && targetPos <= sourcePos + node.nodeSize) return;

            const { tr } = editor.state;
            tr.delete(sourcePos, sourcePos + node.nodeSize);
            const mappedTarget = tr.mapping.map(targetPos);
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

    /* ─── Title auto-resize ───────────────────────────────── */
    const resizeTitle = (el: HTMLTextAreaElement) => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    };

    useEffect(() => {
        if (!buttonBuilderOpen) return;

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonBuilderRef.current?.contains(target)) return;
            setButtonBuilderOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setButtonBuilderOpen(false);
            }
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [buttonBuilderOpen]);

    const filteredMentionPages = useMemo(() => {
        const normalizedQuery = mentionQuery.trim().toLowerCase();
        if (!normalizedQuery) return mentionPages;

        return mentionPages.filter((page) =>
            page.title.toLowerCase().includes(normalizedQuery),
        );
    }, [mentionPages, mentionQuery]);

    useEffect(() => {
        setSelectedMentionIndex(0);
    }, [mentionQuery, mentionPickerOpen]);

    useEffect(() => {
        if (!mentionPickerOpen) return;

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (mentionPickerRef.current?.contains(target)) return;
            setMentionPickerOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMentionPickerOpen(false);
                return;
            }

            if (filteredMentionPages.length === 0) return;

            if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedMentionIndex((previous) =>
                    Math.min(previous + 1, filteredMentionPages.length - 1),
                );
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedMentionIndex((previous) => Math.max(previous - 1, 0));
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                const selectedPage = filteredMentionPages[selectedMentionIndex];
                if (!editor || !selectedPage) return;
                const safeTitle = selectedPage.title || "Untitled";
                const safeHref = `?page=${selectedPage.id}`;
                editor
                    .chain()
                    .focus()
                    .insertContent(`<a href="${safeHref}">${safeTitle}</a>`)
                    .run();
                setMentionPickerOpen(false);
            }
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [mentionPickerOpen, filteredMentionPages, selectedMentionIndex, editor]);

    const insertConfiguredButton = () => {
        if (!editor) return;

        const safeTitle = buttonTitle.trim() || "Add button";
        const rawUrl = buttonUrl.trim() || "https://";
        const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

        editor
            .chain()
            .focus()
            .setActionButton({
                title: safeTitle,
                url: safeUrl,
                color: buttonColor,
                align: buttonAlign,
            })
            .run();

        setButtonBuilderOpen(false);
    };

    /* ─── Render ──────────────────────────────────────────── */
    return (
        <div className="relative" ref={wrapperRef}>
            {/* ── Title ─────────────────────────────────────── */}
            <textarea
                placeholder="Untitled"
                rows={1}
                value={title}
                onChange={(e) => {
                    onTitleChange(e.target.value);
                    resizeTitle(e.target);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        editor?.chain().focus().run();
                    }
                }}
                ref={(el) => {
                    if (el) resizeTitle(el);
                }}
                className={`w-full text-[2.75rem] font-semibold leading-[1.15] tracking-tight bg-transparent resize-none border-none outline-none placeholder:text-[#4b5563] mb-1 ${fontClass}`}
            />

            {/* ── Metadata (between title and content) ───── */}
            {(showOwners || showLastModified) && (
                <div className="flex items-center gap-3 text-sm text-gray-400 mb-3" style={{ fontFamily: 'var(--font-system)' }}>
                    {showOwners && (
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                    P
                                </div>
                                <div className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                            </div>
                            <span className="font-medium text-gray-600">Poonkawin</span>
                        </div>
                    )}
                    {showLastModified && (
                        <>
                            <span className="text-gray-300">&middot;</span>
                            <span suppressHydrationWarning>
                                Last updated Today at{" "}
                                {new Date().toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                }).toLowerCase()}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* ── Content area ──────────────────────────────── */}
            <div className={`relative ${fontClass}`} ref={contentRef}>
                {/* Drag-handle icons */}
                {hoveredBlock !== null && (!tableUi || hoveredBlock.pos !== tableUi.tablePos) && (
                    <div
                        ref={handleRef}
                        className="absolute flex items-center gap-0 z-30"
                        style={{ top: hoveredBlock.top, left: -44, transform: 'translateY(-50%)' }}
                    >
                        <button
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                            title="Add block"
                            onMouseDown={(e) => { e.preventDefault(); handleAddBlock(); }}
                        >
                            <Plus size={18} />
                        </button>
                        <button
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 cursor-grab active:cursor-grabbing transition-colors"
                            title="Drag to move"
                            onMouseDown={handleDragStart}
                        >
                            <GripVertical size={18} />
                        </button>
                    </div>
                )}

                {/* Drop indicator */}
                {dropLineY !== null && (
                    <div
                        className="absolute left-0 right-0 h-0.5 bg-blue-500 z-40 pointer-events-none"
                        style={{ top: dropLineY }}
                    />
                )}

                {/* ProseMirror editor */}
                <EditorContent editor={editor} />
            </div>

            {/* ── Bubble Toolbar ───────────────────────────── */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    options={{
                        placement: 'top-start',
                        offset: 8,
                        flip: { fallbackPlacements: ['bottom-start'] },
                        shift: { padding: 8 },
                    }}
                    getReferencedVirtualElement={() => {
                        const { from, to } = editor.state.selection;
                        const start = editor.view.coordsAtPos(from);
                        const end = editor.view.coordsAtPos(to);
                        const rect = new DOMRect(
                            start.left,
                            Math.min(start.top, end.top),
                            0,
                            Math.max(end.bottom, start.bottom) - Math.min(start.top, end.top),
                        );
                        return {
                            getBoundingClientRect: () => rect,
                            getClientRects: () => [rect],
                        };
                    }}
                >
                    {editor.isActive('table') ? (
                        <div className="bg-white shadow-xl border border-gray-200 rounded-xl px-1.5 py-1 flex items-center gap-1">
                            {[
                                { icon: Rows3, title: 'Add row above', action: () => editor.chain().focus().addRowBefore().run() },
                                { icon: Plus, title: 'Add row below', action: () => editor.chain().focus().addRowAfter().run() },
                                { icon: Minus, title: 'Delete row', action: () => editor.chain().focus().deleteRow().run() },
                                { divider: true },
                                { icon: Columns3, title: 'Add column left', action: () => editor.chain().focus().addColumnBefore().run() },
                                { icon: Plus, title: 'Add column right', action: () => editor.chain().focus().addColumnAfter().run() },
                                { icon: Minus, title: 'Delete column', action: () => editor.chain().focus().deleteColumn().run() },
                                { divider: true },
                                { icon: TableIcon, title: 'Toggle header row', action: () => editor.chain().focus().toggleHeaderRow().run() },
                                { icon: FileText, title: 'Toggle header column', action: () => editor.chain().focus().toggleHeaderColumn().run() },
                                { icon: Trash2, title: 'Delete table', action: () => editor.chain().focus().deleteTable().run(), danger: true },
                            ].map((item, index) => {
                                if ('divider' in item) {
                                    return <div key={`divider-${index}`} className="h-5 w-px bg-gray-200 mx-0.5" />;
                                }

                                const Icon = item.icon;
                                return (
                                    <button
                                        key={`${item.title}-${index}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            item.action();
                                        }}
                                        className={`p-1.5 rounded-lg transition-colors ${item.danger
                                            ? 'text-red-600 hover:bg-red-50'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        title={item.title}
                                    >
                                        <Icon size={16} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : editor.isActive('link') ? (
                        /* ── Link-specific menu ────────────────────── */
                        <div className="bg-white shadow-xl border border-gray-200 rounded-xl flex items-center px-1.5 py-1 gap-0">
                            {linkEditMode ? (
                                <div className="flex items-center gap-2 px-2 py-1 w-72">
                                    <input
                                        ref={linkInputRef}
                                        type="text"
                                        value={linkInputValue}
                                        onChange={(e) => setLinkInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (linkInputValue.trim()) {
                                                    const url = linkInputValue.trim().match(/^https?:\/\//) ? linkInputValue.trim() : `https://${linkInputValue.trim()}`;
                                                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                                                }
                                                setLinkEditMode(false);
                                            } else if (e.key === 'Escape') {
                                                setLinkEditMode(false);
                                                editor.commands.focus();
                                            }
                                        }}
                                        placeholder="Edit link URL"
                                        className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
                                    />
                                    <button
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setLinkEditMode(false);
                                            editor.commands.focus();
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <a
                                        href={editor.getAttributes('link').href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-blue-600 hover:text-blue-800 truncate max-w-50 transition-colors"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink size={14} className="shrink-0" />
                                        <span className="truncate text-[13px]">{editor.getAttributes('link').href}</span>
                                    </a>

                                    <div className="w-px h-5 bg-gray-200 mx-0.5" />

                                    <button
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            const currentHref = editor.getAttributes('link').href || '';
                                            setLinkInputValue(currentHref);
                                            setLinkEditMode(true);
                                            setTimeout(() => linkInputRef.current?.focus(), 0);
                                        }}
                                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                                        title="Edit link"
                                    >
                                        <Pencil size={15} />
                                    </button>

                                    <button
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            editor.chain().focus().extendMarkRange('link').unsetLink().run();
                                        }}
                                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                                        title="Remove link"
                                    >
                                        <Unlink size={15} />
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white shadow-xl border border-gray-200 rounded-xl flex items-center px-1.5 py-1 gap-0">
                            {/* Comment */}
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                <MessageSquare size={15} />
                                <span className="text-[13px]">Comment</span>
                            </button>

                            <div className="w-px h-5 bg-gray-200 mx-0.5" />

                            {/* List dropdown */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setListDropdownOpen(!listDropdownOpen);
                                        setTurnIntoOpen(false);
                                        setColorDropdownOpen(false);
                                        setAlignDropdownOpen(false);
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')
                                        ? 'bg-gray-200 text-gray-900'
                                        : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {editor.isActive('orderedList') ? <ListOrdered size={16} /> :
                                        editor.isActive('taskList') ? <CheckSquare size={16} /> :
                                            <List size={16} />}
                                </button>

                                {listDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 bg-white shadow-xl border border-gray-200 rounded-xl p-1.5 z-60 flex gap-1">
                                        {[
                                            { label: 'Bullet list', icon: List, active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
                                            { label: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
                                            { label: 'Checklist', icon: CheckSquare, active: editor.isActive('taskList'), action: () => editor.chain().focus().toggleTaskList().run() },
                                        ].map((item) => (
                                            <button
                                                key={item.label}
                                                title={item.label}
                                                onMouseDown={(e) => { e.preventDefault(); item.action(); setListDropdownOpen(false); }}
                                                className={`p-2 rounded-lg transition-colors ${item.active ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                <item.icon size={16} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Turn Into dropdown */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setTurnIntoOpen(!turnIntoOpen);
                                        setListDropdownOpen(false);
                                        setColorDropdownOpen(false);
                                        setAlignDropdownOpen(false);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    <span className="text-[13px] font-medium">
                                        {editor.isActive('heading', { level: 1 }) ? 'Heading 1' :
                                            editor.isActive('heading', { level: 2 }) ? 'Heading 2' :
                                                editor.isActive('heading', { level: 3 }) ? 'Heading 3' :
                                                    editor.isActive('heading', { level: 4 }) ? 'Heading 4' :
                                                        editor.isActive('codeBlock') ? 'Code block' :
                                                            editor.isActive('blockquote') ? 'Quote' : 'Text'}
                                    </span>
                                    <ChevronDown size={14} />
                                </button>

                                {turnIntoOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-56 bg-white shadow-xl border border-gray-200 rounded-xl py-2 z-60">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 mb-1">Turn Into</p>
                                        {[
                                            { label: 'Text', icon: Type, active: editor.isActive('paragraph'), action: () => editor.chain().focus().setParagraph().run() },
                                            { label: 'Heading 1', icon: Heading1, active: editor.isActive('heading', { level: 1 }), action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), shortcut: '⌥⌘1' },
                                            { label: 'Heading 2', icon: Heading2, active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), shortcut: '⌥⌘2' },
                                            { label: 'Heading 3', icon: Heading3, active: editor.isActive('heading', { level: 3 }), action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), shortcut: '⌥⌘3' },
                                            { label: 'Heading 4', icon: Heading4, active: editor.isActive('heading', { level: 4 }), action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), shortcut: '⌥⌘4' },
                                        ].map((item) => (
                                            <button
                                                key={item.label}
                                                onMouseDown={(e) => { e.preventDefault(); item.action(); setTurnIntoOpen(false); }}
                                                className={`flex items-center justify-between w-full px-4 py-2 text-left text-sm transition-colors ${item.active ? 'text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon size={16} className={item.active ? 'text-indigo-500' : 'text-gray-400'} />
                                                    <span className="font-medium">{item.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.shortcut && <span className="text-xs text-gray-400">{item.shortcut}</span>}
                                                    {item.active && <Check size={16} className="text-indigo-500" />}
                                                </div>
                                            </button>
                                        ))}
                                        <div className="border-t border-gray-100 my-1" />
                                        {[
                                            { label: 'Banners', icon: Flag, active: false, action: () => { editor.chain().focus().toggleBlockquote().run(); }, hasChevron: true },
                                            { label: 'Code block', icon: CodeXml, active: editor.isActive('codeBlock'), action: () => editor.chain().focus().toggleCodeBlock().run() },
                                            { label: 'Quote', icon: Quote, active: editor.isActive('blockquote'), action: () => { editor.chain().focus().toggleBlockquote().run(); }, hasChevron: true },
                                        ].map((item) => (
                                            <button
                                                key={item.label}
                                                onMouseDown={(e) => { e.preventDefault(); item.action(); setTurnIntoOpen(false); }}
                                                className={`flex items-center justify-between w-full px-4 py-2 text-left text-sm transition-colors ${item.active ? 'text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon size={16} className={item.active ? 'text-indigo-500' : 'text-gray-400'} />
                                                    <span className="font-medium">{item.label}</span>
                                                </div>
                                                {item.hasChevron && <ChevronDown size={14} className="text-gray-400 -rotate-90" />}
                                                {item.active && <Check size={16} className="text-indigo-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-5 bg-gray-200 mx-0.5" />

                            {/* Color / Highlight */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setColorDropdownOpen(!colorDropdownOpen);
                                        setTurnIntoOpen(false);
                                        setListDropdownOpen(false);
                                        setAlignDropdownOpen(false);
                                    }}
                                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-bold leading-none" style={{ color: editor.getAttributes('textStyle').color || 'inherit' }}>A</span>
                                        <div className="w-3.5 h-1 rounded-sm mt-0" style={{ backgroundColor: editor.getAttributes('highlight').color || '#6366f1' }} />
                                    </div>
                                </button>

                                {colorDropdownOpen && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 bg-white shadow-xl border border-gray-200 rounded-xl p-4 z-60">
                                        <p className="text-xs font-semibold text-gray-500 mb-2">Text colors</p>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {[
                                                { color: '#ef4444', label: 'Red' },
                                                { color: '#f97316', label: 'Orange' },
                                                { color: '#171717', label: 'Default' },
                                                { color: '#6366f1', label: 'Indigo' },
                                                { color: '#3b82f6', label: 'Blue' },
                                                { color: '#059669', label: 'Green' },
                                                { color: '#8b5cf6', label: 'Violet' },
                                                { color: '#ec4899', label: 'Pink' },
                                                { color: '#6b7280', label: 'Gray' },
                                            ].map((c) => (
                                                <button
                                                    key={c.color}
                                                    title={c.label}
                                                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c.color).run(); }}
                                                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-colors ${editor.getAttributes('textStyle').color === c.color ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'
                                                        }`}
                                                >
                                                    <span style={{ color: c.color }}>A</span>
                                                </button>
                                            ))}
                                        </div>

                                        <p className="text-xs font-semibold text-gray-500 mb-2">Text highlights</p>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {[
                                                { color: '#fecaca', label: 'Red' },
                                                { color: '#fed7aa', label: 'Orange' },
                                                { color: '#fef08a', label: 'Yellow' },
                                                { color: '#bfdbfe', label: 'Blue' },
                                                { color: '#ddd6fe', label: 'Purple' },
                                                { color: '#fbcfe8', label: 'Pink' },
                                                { color: '#d1fae5', label: 'Green' },
                                                { color: '#e5e7eb', label: 'Gray' },
                                            ].map((c) => (
                                                <button
                                                    key={c.color}
                                                    title={c.label}
                                                    onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: c.color }).run(); }}
                                                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${editor.getAttributes('highlight').color === c.color ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                                                        }`}
                                                    style={{ backgroundColor: c.color }}
                                                />
                                            ))}
                                            <button
                                                title="Remove highlight"
                                                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); }}
                                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
                                            >
                                                <Ban size={14} />
                                            </button>
                                        </div>

                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().unsetHighlight().run(); setColorDropdownOpen(false); }}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <Ban size={14} /> Remove color
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Format buttons */}
                            {[
                                { fn: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), Icon: Bold },
                                { fn: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), Icon: Italic },
                                { fn: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), Icon: UnderlineIcon },
                                { fn: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), Icon: Strikethrough },
                                { fn: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), Icon: CodeXml },
                            ].map(({ fn, active, Icon }, i) => (
                                <button
                                    key={i}
                                    onMouseDown={(e) => { e.preventDefault(); fn(); }}
                                    className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    <Icon size={16} />
                                </button>
                            ))}

                            {/* Alignment dropdown */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setAlignDropdownOpen(!alignDropdownOpen);
                                        setTurnIntoOpen(false);
                                        setListDropdownOpen(false);
                                        setColorDropdownOpen(false);
                                    }}
                                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex items-center"
                                >
                                    {editor.isActive({ textAlign: 'center' }) ? <AlignCenter size={16} /> :
                                        editor.isActive({ textAlign: 'right' }) ? <AlignRight size={16} /> :
                                            editor.isActive({ textAlign: 'justify' }) ? <AlignJustify size={16} /> :
                                                <AlignLeft size={16} />}
                                    <ChevronDown size={12} className="ml-0.5" />
                                </button>

                                {alignDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 bg-white shadow-xl border border-gray-200 rounded-xl p-1.5 z-60 flex gap-1">
                                        {[
                                            { align: 'left' as const, icon: AlignLeft, label: 'Left' },
                                            { align: 'center' as const, icon: AlignCenter, label: 'Center' },
                                            { align: 'right' as const, icon: AlignRight, label: 'Right' },
                                            { align: 'justify' as const, icon: AlignJustify, label: 'Justify' },
                                        ].map((item) => (
                                            <button
                                                key={item.align}
                                                title={item.label}
                                                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign(item.align).run(); setAlignDropdownOpen(false); }}
                                                className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: item.align }) || (item.align === 'left' && !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' }))
                                                    ? 'bg-indigo-100 text-indigo-600'
                                                    : 'text-gray-500 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <item.icon size={16} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-5 bg-gray-200 mx-0.5" />

                            {/* Link */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (editor.isActive('link')) {
                                            editor.chain().focus().unsetLink().run();
                                        } else {
                                            setLinkInputOpen(true);
                                            setLinkInputValue('');
                                            setTimeout(() => linkInputRef.current?.focus(), 0);
                                        }
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors ${editor.isActive('link') ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    <Link size={16} />
                                </button>

                                {linkInputOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white shadow-xl border border-gray-200 rounded-xl px-3 py-2 z-60 flex items-center gap-2 w-72">
                                        <input
                                            ref={linkInputRef}
                                            type="text"
                                            value={linkInputValue}
                                            onChange={(e) => setLinkInputValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (linkInputValue.trim()) {
                                                        const url = linkInputValue.trim().match(/^https?:\/\//) ? linkInputValue.trim() : `https://${linkInputValue.trim()}`;
                                                        editor.chain().focus().setLink({ href: url }).run();
                                                    }
                                                    setLinkInputOpen(false);
                                                } else if (e.key === 'Escape') {
                                                    setLinkInputOpen(false);
                                                    editor.commands.focus();
                                                }
                                            }}
                                            placeholder="Paste a link then press enter"
                                            className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
                                        />
                                        <button
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setLinkInputOpen(false);
                                                editor.commands.focus();
                                            }}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Copy */}
                            <button
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const { from, to } = editor.state.selection;
                                    const text = editor.state.doc.textBetween(from, to, ' ');
                                    navigator.clipboard.writeText(text);
                                }}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                <Copy size={16} />
                            </button>

                            {/* Duplicate */}
                            <button
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const { from, to } = editor.state.selection;
                                    const slice = editor.state.doc.slice(from, to);
                                    editor.chain().focus().insertContentAt(to, slice.content.toJSON()).run();
                                }}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                <Clipboard size={16} />
                            </button>

                            {/* More */}
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    )}
                </BubbleMenu>
            )}

            {tableUi && hoveredBlock?.pos === tableUi.tablePos && (
                <>
                    <div
                        className="absolute flex items-center gap-0 z-50 pointer-events-none"
                        style={{
                            top: tableUi.firstRowTop + tableUi.firstRowHeight / 2,
                            left: tableUi.tableLeft - 44,
                            transform: 'translateY(-50%)',
                        }}
                    >
                        <button
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors pointer-events-auto"
                            title="Add block below table"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const tableNode = editor.state.doc.nodeAt(tableUi.tablePos);
                                if (!tableNode) return;
                                const insertPos = tableUi.tablePos + tableNode.nodeSize;
                                editor
                                    .chain()
                                    .focus()
                                    .insertContentAt(insertPos, { type: 'paragraph' })
                                    .setTextSelection(insertPos + 1)
                                    .run();
                            }}
                        >
                            <Plus size={18} />
                        </button>
                        <button
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 cursor-grab active:cursor-grabbing transition-colors pointer-events-auto"
                            title="Drag table"
                            onMouseDown={(e) => startBlockDrag(tableUi.tablePos, e)}
                        >
                            <GripVertical size={18} />
                        </button>
                    </div>
                </>
            )}

            {/* ── Slash Menu ────────────────────────────────── */}
            {buttonBuilderOpen && (
                <div
                    ref={buttonBuilderRef}
                    className="absolute z-60 w-115 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
                    style={{ top: buttonBuilderPos.top, left: buttonBuilderPos.left }}
                >
                    <div className="mb-4 inline-flex rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">/Button</div>

                    <label className="mb-2 block text-sm font-medium text-gray-700">Title:</label>
                    <input
                        value={buttonTitle}
                        onChange={(event) => setButtonTitle(event.target.value)}
                        placeholder="Button title"
                        className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400"
                    />

                    <label className="mb-2 block text-sm font-medium text-gray-700">URL:</label>
                    <input
                        value={buttonUrl}
                        onChange={(event) => setButtonUrl(event.target.value)}
                        placeholder="https://"
                        className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400"
                    />

                    <label className="mb-2 block text-sm font-medium text-gray-700">Primary color:</label>
                    <div className="mb-4 flex flex-wrap gap-2">
                        {[
                            "#6046db",
                            "#3f62d3",
                            "#1f86dc",
                            "#1da497",
                            "#2f9f61",
                            "#f2be3f",
                            "#ee6d0a",
                            "#e2474d",
                            "#e03f83",
                            "#a549bf",
                            "#9a7d70",
                            "#8d8d8d",
                        ].map((color) => (
                            <button
                                key={color}
                                onClick={() => setButtonColor(color)}
                                className={`h-8 w-8 rounded-full border-2 ${buttonColor === color ? "border-gray-900" : "border-transparent"}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>

                    <label className="mb-2 block text-sm font-medium text-gray-700">Align:</label>
                    <div className="mb-6 flex gap-2">
                        {([
                            { key: "left", icon: AlignLeft },
                            { key: "center", icon: AlignCenter },
                            { key: "right", icon: AlignRight },
                        ] as const).map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setButtonAlign(item.key)}
                                className={`rounded-lg p-2 ${buttonAlign === item.key ? "bg-indigo-100 text-indigo-600" : "text-gray-600 hover:bg-gray-100"}`}
                            >
                                <item.icon size={20} />
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={insertConfiguredButton}
                        className="w-full rounded-lg bg-[#7c6ee6] px-4 py-3 text-lg font-medium text-white hover:brightness-95"
                    >
                        Add button
                    </button>
                </div>
            )}

            {mentionPickerOpen && (
                <div
                    ref={mentionPickerRef}
                    className="absolute z-60 w-155 rounded-2xl border border-gray-200 bg-white shadow-2xl"
                    style={{ top: mentionPickerPos.top, left: mentionPickerPos.left }}
                >
                    <div className="border-b border-gray-200 px-4 pt-3">
                        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-500">
                            <span>/Mention a Page</span>
                            <input
                                value={mentionQuery}
                                onChange={(event) => setMentionQuery(event.target.value)}
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
                        {filteredMentionPages.length === 0 ? (
                            <p className="px-2 py-2 text-sm text-gray-500">No matching pages.</p>
                        ) : (
                            <ul className="space-y-1">
                                {filteredMentionPages.map((page, index) => {
                                    const isActive = index === selectedMentionIndex;
                                    return (
                                        <li key={page.id}>
                                            <button
                                                onMouseEnter={() => setSelectedMentionIndex(index)}
                                                onClick={() => {
                                                    if (!editor) return;
                                                    const safeTitle = page.title || "Untitled";
                                                    const safeHref = `?page=${page.id}`;
                                                    editor
                                                        .chain()
                                                        .focus()
                                                        .insertContent(`<a href="${safeHref}">${safeTitle}</a>`)
                                                        .run();
                                                    setMentionPickerOpen(false);
                                                }}
                                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${isActive ? "bg-gray-100 text-gray-900" : "text-gray-800 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <FileText size={18} className="text-gray-500" />
                                                <span>{page.title || "Untitled"}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}

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

export default TiptapEditor;
