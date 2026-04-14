import { useEffect } from "react";
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

const toneClasses: Record<ToastMessage["tone"], string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
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
        <div className="pointer-events-none fixed right-4 top-4 z-100 flex w-[min(92vw,22rem)] flex-col gap-2">
            {toasts.map((toast) => {
                const Icon = toneIcon[toast.tone];
                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm ${toneClasses[toast.tone]}`}
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
