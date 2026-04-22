interface ExportTabProps {
    onExport: (format: "markdown" | "text") => void;
}

export default function ExportTab({ onExport }: ExportTabProps) {
    return (
        <div className="space-y-3">
            <p className="text-sm text-gray-500">Export the current document to a file.</p>
            <button
                onClick={() => onExport("markdown")}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                title="Export current page as Markdown"
            >
                Export as Markdown (.md)
            </button>
            <button
                onClick={() => onExport("text")}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                title="Export current page as plain text"
            >
                Export as Plain Text (.txt)
            </button>
        </div>
    );
}
