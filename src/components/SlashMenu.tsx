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

    // Scroll active item into view
    useEffect(() => {
        const el = itemRefs.current.get(selectedIndex);
        el?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = useCallback(
        (index: number) => {
            const item = flatItems[index];
            if (item) command(item);
        },
        [flatItems, command]
    );

    // Build a 2D grid for proper arrow navigation in 2-column layout
    const grid = useMemo(() => {
        const rows: number[][] = [];
        let flatIdx = 0;
        for (const cat of categories) {
            for (let i = 0; i < cat.items.length; i += COLS) {
                const row: number[] = [];
                for (let c = 0; c < COLS && i + c < cat.items.length; c++) {
                    row.push(flatIdx + i + c);
                }
                rows.push(row);
            }
            flatIdx += cat.items.length;
        }
        return rows;
    }, [categories]);

    const categoryStartIndices = useMemo(() => {
        return categories.map((_, categoryIndex) => {
            return categories
                .slice(0, categoryIndex)
                .reduce((total, category) => total + category.items.length, 0);
        });
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
                e.preventDefault();
                e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                let nextRow = row + 1;
                if (nextRow >= grid.length) nextRow = 0;
                const nextCol = Math.min(col, grid[nextRow].length - 1);
                setSelectedIndex(grid[nextRow][nextCol]);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                let prevRow = row - 1;
                if (prevRow < 0) prevRow = grid.length - 1;
                const prevCol = Math.min(col, grid[prevRow].length - 1);
                setSelectedIndex(grid[prevRow][prevCol]);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                if (col + 1 < grid[row].length) {
                    setSelectedIndex(grid[row][col + 1]);
                }
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                e.stopPropagation();
                const [row, col] = findGridPos(selectedIndex);
                if (col - 1 >= 0) {
                    setSelectedIndex(grid[row][col - 1]);
                }
            } else if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                selectItem(selectedIndex);
            } else if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            }
        };

        // Use capture phase so we intercept before ProseMirror handles the key
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [selectedIndex, flatItems, selectItem, onClose, grid, findGridPos]);

    if (flatItems.length === 0) {
        return (
            <div
                className="absolute z-50 bg-white shadow-xl border border-gray-200 rounded-xl p-3 w-80"
                style={{ top: position.top, left: position.left }}
            >
                <p className="text-sm text-gray-400 text-center py-2">No results</p>
            </div>
        );
    }

    return (
        <div
            ref={menuRef}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-50 bg-white shadow-xl border border-gray-200 rounded-xl w-105 max-h-100 overflow-y-auto"
            style={{ top: position.top, left: position.left }}
        >
            {categories.map((cat, catIndex) => {
                const startIdx = categoryStartIndices[catIndex];
                return (
                    <div key={cat.name} className="px-2 pt-3 pb-1">
                        {/* Category header */}
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
                            {cat.name}
                        </p>
                        {/* 2-column grid */}
                        <div className="grid grid-cols-2 gap-0.5">
                            {cat.items.map((item, i) => {
                                const idx = startIdx + i;
                                const isSelected = idx === selectedIndex;
                                return (
                                    <button
                                        key={item.title}
                                        ref={(el) => {
                                            if (el) itemRefs.current.set(idx, el);
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            selectItem(idx);
                                        }}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${isSelected
                                            ? "bg-purple-50 text-purple-700"
                                            : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div
                                            className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${isSelected
                                                ? "bg-purple-100 text-purple-600"
                                                : "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            <item.icon size={15} />
                                        </div>
                                        <span className="text-[13px] font-medium truncate">
                                            {item.title}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            <div className="h-2" />
        </div>
    );
};

export default SlashMenu;
