import { Plus, GripVertical } from "lucide-react";
import type { Editor } from "@tiptap/core";

interface TableUi {
    tablePos: number;
    surfaceTop: number;
    surfaceLeft: number;
    surfaceWidth: number;
    surfaceHeight: number;
    firstRowTop: number;
    firstRowHeight: number;
}

interface TableControlsProps {
    editor: Editor;
    tableUi: TableUi;
    onDragStart: (pos: number, e: React.MouseEvent) => void;
}

export default function TableControls({ editor, tableUi, onDragStart }: TableControlsProps) {
    return (
        <div className="absolute inset-0 z-50 pointer-events-none">
            {/* Drag handle aligned to first row */}
            <div
                className="absolute flex items-center gap-0 pointer-events-none"
                style={{
                    top: tableUi.firstRowTop + tableUi.firstRowHeight / 2,
                    left: tableUi.surfaceLeft - 44,
                    transform: 'translateY(-50%)',
                }}
            >
                <button
                    className="editor-handle-btn p-0.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors pointer-events-auto"
                    title="Add block below table"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const tableNode = editor.state.doc.nodeAt(tableUi.tablePos);
                        if (!tableNode) return;
                        const insertPos = tableUi.tablePos + tableNode.nodeSize;
                        editor.chain().focus().insertContentAt(insertPos, { type: 'paragraph' }).setTextSelection(insertPos + 1).run();
                    }}
                >
                    <Plus size={18} />
                </button>
                <button
                    className="editor-handle-btn p-0.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 cursor-grab active:cursor-grabbing transition-colors pointer-events-auto"
                    title="Drag table"
                    onMouseDown={(e) => onDragStart(tableUi.tablePos, e)}
                >
                    <GripVertical size={18} />
                </button>
            </div>

            {/* Add column button (right edge) */}
            <button
                className="editor-table-edge-btn absolute w-5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 pointer-events-auto"
                style={{
                    top: tableUi.surfaceTop,
                    left: tableUi.surfaceLeft + tableUi.surfaceWidth + 8,
                    height: tableUi.surfaceHeight,
                }}
                title="Add column"
                onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().addColumnAfter().run();
                }}
            >
                <Plus size={16} className="mx-auto" />
            </button>

            {/* Add row button (bottom edge) */}
            <button
                className="editor-table-edge-btn absolute h-4 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 pointer-events-auto"
                style={{
                    top: tableUi.surfaceTop + tableUi.surfaceHeight + 6,
                    left: tableUi.surfaceLeft,
                    width: tableUi.surfaceWidth,
                }}
                title="Add row"
                onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().addRowAfter().run();
                }}
            >
                <Plus size={14} className="mx-auto" />
            </button>
        </div>
    );
}
