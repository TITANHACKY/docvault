import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export interface ToastMessage {
    id: string;
    tone: "success" | "error" | "info";
    message: string;
    durationMs?: number;
}

interface ToastRegionProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

const toneStyles: Record<ToastMessage["tone"], React.CSSProperties> = {
    success: { background: "color-mix(in srgb, #22c55e 12%, var(--editor-surface))", borderColor: "color-mix(in srgb, #22c55e 30%, var(--editor-border))", color: "color-mix(in srgb, #15803d 80%, var(--editor-text))" },
    error: { background: "color-mix(in srgb, #ef4444 12%, var(--editor-surface))", borderColor: "color-mix(in srgb, #ef4444 30%, var(--editor-border))", color: "color-mix(in srgb, #b91c1c 80%, var(--editor-text))" },
    info: { background: "color-mix(in srgb, #3b82f6 12%, var(--editor-surface))", borderColor: "color-mix(in srgb, #3b82f6 30%, var(--editor-border))", color: "color-mix(in srgb, #1d4ed8 80%, var(--editor-text))" },
};

const toneIcon: Record<ToastMessage["tone"], typeof CheckCircle2> = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
};

export default function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
    useEffect(() => {
        const timers = toasts.map((toast) => {
            const timeout = window.setTimeout(
                () => onDismiss(toast.id),
                toast.durationMs ?? 2600,
            );

            return timeout;
        });

        return () => {
            timers.forEach((timeout) => window.clearTimeout(timeout));
        };
    }, [toasts, onDismiss]);

    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-2">
            {toasts.map((toast) => {
                const Icon = toneIcon[toast.tone];
                return (
                    <div
                        key={toast.id}
                        className="pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm"
                        style={toneStyles[toast.tone]}
                        role="status"
                        aria-live="polite"
                    >
                        <Icon size={16} className="mt-0.5 shrink-0" />
                        <p className="leading-5">{toast.message}</p>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            className="ml-auto rounded px-1 text-xs opacity-70 transition hover:opacity-100 cursor-pointer"
                            title="Dismiss notification"
                        >
                            Close
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
