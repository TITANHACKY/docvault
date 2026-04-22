import { BubbleMenu as TipTapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import { useRef, useState } from "react";
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    MessageSquare, List, ChevronDown, Link, Copy, Clipboard,
    MoreHorizontal, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Check, Ban, ExternalLink, X, Type, Heading1, Heading2, Heading3,
    Heading4, Flag, CodeXml, Quote, ListOrdered, CheckSquare,
    Unlink, Pencil, Rows3, Columns3, Table2 as TableIcon, Trash2, Minus, Plus,
} from "lucide-react";

interface EditorBubbleMenuProps {
    editor: Editor;
}

export default function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
    const [turnIntoOpen, setTurnIntoOpen] = useState(false);
    const [listDropdownOpen, setListDropdownOpen] = useState(false);
    const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
    const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
    const [linkInputOpen, setLinkInputOpen] = useState(false);
    const [linkInputValue, setLinkInputValue] = useState('');
    const [linkEditMode, setLinkEditMode] = useState(false);
    const linkInputRef = useRef<HTMLInputElement>(null);

    const closeAllDropdowns = () => {
        setTurnIntoOpen(false);
        setListDropdownOpen(false);
        setColorDropdownOpen(false);
        setAlignDropdownOpen(false);
    };

    return (
        <TipTapBubbleMenu
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
                <div className="bg-white shadow-xl border border-gray-200 rounded-lg px-1 py-0.5 flex items-center gap-0.5">
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
                        { icon: Rows3, title: 'Toggle header column', action: () => editor.chain().focus().toggleHeaderColumn().run() },
                        { icon: Trash2, title: 'Delete table', action: () => editor.chain().focus().deleteTable().run(), danger: true },
                    ].map((item, index) => {
                        if ('divider' in item) {
                            return <div key={`divider-${index}`} className="h-4 w-px bg-gray-200 mx-0.5" />;
                        }
                        const Icon = item.icon;
                        return (
                            <button
                                key={`${item.title}-${index}`}
                                onMouseDown={(e) => { e.preventDefault(); item.action(); }}
                                className={`p-1 rounded transition-colors ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-100'}`}
                                title={item.title}
                            >
                                <Icon size={14} />
                            </button>
                        );
                    })}
                </div>
            ) : editor.isActive('link') ? (
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
                                onMouseDown={(e) => { e.preventDefault(); setLinkEditMode(false); editor.commands.focus(); }}
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
                                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().extendMarkRange('link').unsetLink().run(); }}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                                title="Remove link"
                            >
                                <Unlink size={15} />
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-white shadow-xl border border-gray-200 rounded-lg flex items-center px-1 py-0.5 gap-0">
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        className="flex items-center gap-1 px-1.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <MessageSquare size={13} />
                        <span className="text-[11px]">Comment</span>
                    </button>

                    <div className="w-px h-4 bg-gray-200 mx-0.5" />

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
                            className={`p-1 rounded transition-colors ${editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList') ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {editor.isActive('orderedList') ? <ListOrdered size={14} /> : editor.isActive('taskList') ? <CheckSquare size={14} /> : <List size={14} />}
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
                            className="flex items-center gap-0.5 px-1.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <span className="text-[11px] font-medium">
                                {editor.isActive('heading', { level: 1 }) ? 'H1' :
                                    editor.isActive('heading', { level: 2 }) ? 'H2' :
                                        editor.isActive('heading', { level: 3 }) ? 'H3' :
                                            editor.isActive('heading', { level: 4 }) ? 'H4' :
                                                editor.isActive('codeBlock') ? 'Code' :
                                                    editor.isActive('blockquote') ? 'Quote' : 'Text'}
                            </span>
                            <ChevronDown size={12} />
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
                                    { label: 'Banners', icon: Flag, active: false, action: () => editor.chain().focus().toggleBlockquote().run(), hasChevron: true },
                                    { label: 'Code block', icon: CodeXml, active: editor.isActive('codeBlock'), action: () => editor.chain().focus().toggleCodeBlock().run() },
                                    { label: 'Quote', icon: Quote, active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run(), hasChevron: true },
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
                                        {'hasChevron' in item && item.hasChevron && <ChevronDown size={14} className="text-gray-400 -rotate-90" />}
                                        {item.active && <Check size={16} className="text-indigo-500" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-gray-200 mx-0.5" />

                    {/* Color / Highlight */}
                    <div className="relative">
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setColorDropdownOpen(!colorDropdownOpen);
                                closeAllDropdowns();
                                setColorDropdownOpen((prev) => !prev);
                            }}
                            className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
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
                                        { color: '#ef4444', label: 'Red' }, { color: '#f97316', label: 'Orange' },
                                        { color: '#171717', label: 'Default' }, { color: '#6366f1', label: 'Indigo' },
                                        { color: '#3b82f6', label: 'Blue' }, { color: '#059669', label: 'Green' },
                                        { color: '#8b5cf6', label: 'Violet' }, { color: '#ec4899', label: 'Pink' },
                                        { color: '#6b7280', label: 'Gray' },
                                    ].map((c) => (
                                        <button
                                            key={c.color}
                                            title={c.label}
                                            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c.color).run(); }}
                                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-colors ${editor.getAttributes('textStyle').color === c.color ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'}`}
                                        >
                                            <span style={{ color: c.color }}>A</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">Text highlights</p>
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {[
                                        { color: '#fecaca', label: 'Red' }, { color: '#fed7aa', label: 'Orange' },
                                        { color: '#fef08a', label: 'Yellow' }, { color: '#bfdbfe', label: 'Blue' },
                                        { color: '#ddd6fe', label: 'Purple' }, { color: '#fbcfe8', label: 'Pink' },
                                        { color: '#d1fae5', label: 'Green' }, { color: '#e5e7eb', label: 'Gray' },
                                    ].map((c) => (
                                        <button
                                            key={c.color}
                                            title={c.label}
                                            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: c.color }).run(); }}
                                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${editor.getAttributes('highlight').color === c.color ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
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
                            className={`p-1 rounded transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <Icon size={14} />
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
                            className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors flex items-center"
                        >
                            {editor.isActive({ textAlign: 'center' }) ? <AlignCenter size={14} /> :
                                editor.isActive({ textAlign: 'right' }) ? <AlignRight size={14} /> :
                                    editor.isActive({ textAlign: 'justify' }) ? <AlignJustify size={14} /> :
                                        <AlignLeft size={14} />}
                            <ChevronDown size={10} className="ml-0.5" />
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
                                        className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: item.align }) || (item.align === 'left' && !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' })) ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <item.icon size={16} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-gray-200 mx-0.5" />

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
                            className={`p-1 rounded transition-colors ${editor.isActive('link') ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <Link size={14} />
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
                                    onMouseDown={(e) => { e.preventDefault(); setLinkInputOpen(false); editor.commands.focus(); }}
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
                        className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <Copy size={14} />
                    </button>

                    {/* Duplicate */}
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const { from, to } = editor.state.selection;
                            const slice = editor.state.doc.slice(from, to);
                            editor.chain().focus().insertContentAt(to, slice.content.toJSON()).run();
                        }}
                        className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <Clipboard size={14} />
                    </button>

                    {/* More */}
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <MoreHorizontal size={14} />
                    </button>
                </div>
            )}
        </TipTapBubbleMenu>
    );
}
