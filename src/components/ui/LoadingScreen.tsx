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
        <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    {/* Ambient glow */}
                    <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
                    
                    {/* Logo container */}
                    <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
                        <Icon className="h-10 w-10 text-indigo-600 animate-pulse" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {message}
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">
                        {label}
                    </p>
                </div>
            </div>
        </main>
    );
}
