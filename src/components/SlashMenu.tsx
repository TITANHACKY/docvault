import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    SlashCommandItem,
    getSlashCommandCategories,
    getFlatItems,
} from "@/lib/slash-commands";

interface SlashMenuProps {
    query: string;
    command: (item: SlashCommandItem) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

const COLS = 2;

const SlashMenu = ({ query, command, onClose, position }: SlashMenuProps) => {
    const categories = useMemo(() => getSlashCommandCategories(query), [query]);
    const flatItems = useMemo(() => getFlatItems(query), [query]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    useEffect(() => {
        itemRefs.current.get(selectedIndex)?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = useCallback(
        (index: number) => { const item = flatItems[index]; if (item) command(item); },
        [flatItems, command]
    );

    // 2D grid per category for arrow-key navigation
    const grid = useMemo(() => {
        const rows: number[][] = [];
        let flatIdx = 0;
        for (const cat of categories) {
            for (let i = 0; i < cat.items.length; i += COLS) {
                const row: number[] = [];
                for (let c = 0; c < COLS && i + c < cat.items.length; c++) row.push(flatIdx + i + c);
                rows.push(row);
            }
            flatIdx += cat.items.length;
        }
        return rows;
    }, [categories]);

    const findGridPos = useCallback((idx: number): [number, number] => {
        for (let r = 0; r < grid.length; r++) {
            const c = grid[r].indexOf(idx);
            if (c !== -1) return [r, c];
        }
        return [0, 0];
    }, [grid]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault(); e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                const nextRow = (row + 1) % grid.length;
                setSelectedIndex(grid[nextRow][Math.min(col, grid[nextRow].length - 1)]);
            } else if (e.key === "ArrowUp") {
                e.preventDefault(); e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                const prevRow = (row - 1 + grid.length) % grid.length;
                setSelectedIndex(grid[prevRow][Math.min(col, grid[prevRow].length - 1)]);
            } else if (e.key === "ArrowRight") {
                e.preventDefault(); e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                if (col + 1 < grid[row].length) setSelectedIndex(grid[row][col + 1]);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault(); e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                if (col - 1 >= 0) setSelectedIndex(grid[row][col - 1]);
            } else if (e.key === "Enter") {
                e.preventDefault(); e.stopPropagation();
                selectItem(selectedIndex);
            } else if (e.key === "Escape") {
                e.stopPropagation(); onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [selectedIndex, selectItem, onClose, grid, findGridPos]);

    const categoryStartIndices = useMemo(() =>
        categories.map((_, i) => categories.slice(0, i).reduce((s, c) => s + c.items.length, 0)),
    [categories]);

    if (flatItems.length === 0) {
        return (
            <div
                className="absolute z-50 rounded-lg border border-(--editor-border) bg-(--editor-surface) shadow-xl p-2 w-72"
                style={{ top: position.top, left: position.left }}
            >
                <p className="text-xs text-(--editor-text-muted) text-center py-1.5">No results</p>
            </div>
        );
    }

    return (
        <div
            ref={menuRef}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-50 rounded-lg border border-(--editor-border) bg-(--editor-surface) shadow-xl w-72 max-h-72 overflow-y-auto"
            style={{ top: position.top, left: position.left }}
        >
            <div className="p-1">
                {categories.map((cat, catIndex) => {
                    const startIdx = categoryStartIndices[catIndex];
                    return (
                        <div key={cat.name}>
                            <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-(--editor-text-muted)">
                                {cat.name}
                            </p>
                            <div className="grid grid-cols-2 gap-0.5">
                                {cat.items.map((item, i) => {
                                    const idx = startIdx + i;
                                    const isSelected = idx === selectedIndex;
                                    return (
                                        <button
                                            key={item.title}
                                            ref={(el) => { if (el) itemRefs.current.set(idx, el); }}
                                            onMouseDown={(e) => { e.preventDefault(); selectItem(idx); }}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors ${
                                                isSelected
                                                    ? "bg-(--editor-accent)/10 text-(--editor-accent)"
                                                    : "text-(--editor-text) hover:bg-(--editor-surface-muted)"
                                            }`}
                                        >
                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                                                isSelected ? "text-(--editor-accent)" : "text-(--editor-text-muted)"
                                            }`}>
                                                <item.icon size={13} />
                                            </span>
                                            <span className="text-xs font-medium truncate">{item.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SlashMenu;
