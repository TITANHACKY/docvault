import { useState } from "react";
import { Eye, EyeOff, KeyRound, WandSparkles } from "lucide-react";
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
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!open) return null;

    const generatePassword = () => {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_-+=?";
        const bytes = crypto.getRandomValues(new Uint8Array(18));
        const nextPassword = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
        setPassword(nextPassword);
        setConfirmPassword(nextPassword);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (mode === "register" && password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

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
                                id="dialog-name"
                                name="name"
                                autoComplete="name"
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
                            id="dialog-email"
                            name="email"
                            type="email"
                            required
                            autoComplete="username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm text-gray-600">Password</span>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    id="dialog-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    minLength={8}
                                    required
                                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm outline-none focus:border-indigo-400"
                                    placeholder="Minimum 8 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((previous) => !previous)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {mode === "register" && (
                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    title="Generate a strong password"
                                >
                                    <WandSparkles size={14} />
                                    Generate
                                </button>
                            )}
                        </div>
                    </label>

                    {mode === "register" && (
                        <label className="block">
                            <span className="mb-1 block text-sm text-gray-600">Confirm password</span>
                            <input
                                id="dialog-confirm-password"
                                name="confirm-password"
                                type={showPassword ? "text" : "password"}
                                minLength={8}
                                required
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                                placeholder="Repeat your password"
                            />
                        </label>
                    )}

                    <p className="flex items-center gap-2 text-xs text-gray-500">
                        <KeyRound size={13} />
                        Works with browser password managers and autofill.
                    </p>

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
