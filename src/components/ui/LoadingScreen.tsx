import { BookOpen, LucideIcon } from "lucide-react";

interface LoadingScreenProps {
    message?: string;
    label?: string;
    icon?: LucideIcon;
}

export default function LoadingScreen({ 
    message = "DocVault", 
    label = "Initializing",
    icon: Icon = BookOpen
}: LoadingScreenProps) {
    return (
        <main className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--editor-bg)" }}>
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-2xl blur-xl animate-pulse" style={{ background: "color-mix(in srgb, var(--editor-accent) 18%, transparent)" }} />
                    <div className="relative border p-4 rounded-2xl shadow-sm" style={{ background: "var(--editor-surface)", borderColor: "var(--editor-border)" }}>
                        <Icon className="h-10 w-10 animate-pulse" style={{ color: "var(--editor-accent)" }} />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--editor-text)" }}>
                        {message}
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse" style={{ color: "var(--editor-text-muted)" }}>
                        {label}
                    </p>
                </div>
            </div>
        </main>
    );
}
