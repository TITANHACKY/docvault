import { useEffect, useRef } from "react";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { Editor } from "@tiptap/core";

type ButtonAlign = "left" | "center" | "right";

interface ButtonBuilderProps {
    editor: Editor;
    position: { top: number; left: number };
    title: string;
    url: string;
    color: string;
    align: ButtonAlign;
    onTitleChange: (v: string) => void;
    onUrlChange: (v: string) => void;
    onColorChange: (v: string) => void;
    onAlignChange: (v: ButtonAlign) => void;
    onInsert: () => void;
    onClose: () => void;
}

const COLORS = [
    "#6046db", "#3f62d3", "#1f86dc", "#1da497", "#2f9f61",
    "#f2be3f", "#ee6d0a", "#e2474d", "#e03f83", "#a549bf",
    "#9a7d70", "#8d8d8d",
];

export default function ButtonBuilder({
    position, title, url, color, align,
    onTitleChange, onUrlChange, onColorChange, onAlignChange,
    onInsert, onClose,
}: ButtonBuilderProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (ref.current?.contains(event.target as Node)) return;
            onClose();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute z-60 w-115 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
            style={{ top: position.top, left: position.left }}
        >
            <div className="mb-4 inline-flex rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">/Button</div>

            <label className="mb-2 block text-sm font-medium text-gray-700">Title:</label>
            <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Button title"
                className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400"
            />

            <label className="mb-2 block text-sm font-medium text-gray-700">URL:</label>
            <input
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://"
                className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400"
            />

            <label className="mb-2 block text-sm font-medium text-gray-700">Primary color:</label>
            <div className="mb-4 flex flex-wrap gap-2">
                {COLORS.map((c) => (
                    <button
                        key={c}
                        onClick={() => onColorChange(c)}
                        className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-gray-900" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
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
                        onClick={() => onAlignChange(item.key)}
                        className={`rounded-lg p-2 ${align === item.key ? "bg-indigo-100 text-indigo-600" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        <item.icon size={20} />
                    </button>
                ))}
            </div>

            <button
                onClick={onInsert}
                className="w-full rounded-lg bg-[#7c6ee6] px-4 py-3 text-lg font-medium text-white hover:brightness-95"
            >
                Add button
            </button>
        </div>
    );
}
