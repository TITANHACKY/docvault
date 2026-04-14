import { useState } from "react";
import { loginUser, registerUser } from "@/lib/auth-client";
import { syncGuestDataToServer } from "@/lib/guest-sync";

interface AuthDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void | Promise<void>;
}

export default function AuthDialog({ open, onClose, onSuccess }: AuthDialogProps) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!open) return null;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (mode === "register") {
                await registerUser({
                    name: name.trim() || undefined,
                    email: email.trim(),
                    password,
                });
            } else {
                await loginUser({
                    email: email.trim(),
                    password,
                });
            }

            await syncGuestDataToServer();
            await onSuccess?.();
            onClose();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Authentication failed";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/55 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {mode === "login" ? "Welcome back" : "Create your account"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                        title="Close sign in dialog"
                    >
                        Close
                    </button>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                    {mode === "login" ? "Sign in to sync your documents." : "Create an account to sync your work."}
                </p>

                <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
                    {mode === "register" && (
                        <label className="block">
                            <span className="mb-1 block text-sm text-gray-600">Name</span>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                                placeholder="Your name"
                            />
                        </label>
                    )}

                    <label className="block">
                        <span className="mb-1 block text-sm text-gray-600">Email</span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm text-gray-600">Password</span>
                        <input
                            type="password"
                            minLength={8}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                            placeholder="Minimum 8 characters"
                        />
                    </label>

                    {error && (
                        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="editor-accent-button mt-1 w-full cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                    </button>
                </form>

                <div className="mt-4 text-sm">
                    <button
                        type="button"
                        onClick={() => setMode((previous) => (previous === "login" ? "register" : "login"))}
                        className="text-indigo-600 hover:text-indigo-500"
                    >
                        {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
