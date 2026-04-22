"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, WandSparkles, AlertCircle } from "lucide-react";
import { loginUser, registerUser } from "@/lib/auth-client";
import { syncGuestDataToServer } from "@/lib/guest-sync";
import {
    getEditorTheme,
    loadGlobalEditorTheme,
    type EditorTheme,
} from "@/lib/editor-themes";
import { applyEditorThemeToHtml } from "@/lib/html-theme";

export default function LoginPage() {
    const router = useRouter();
    const [theme] = useState<EditorTheme>(() => {
        if (typeof window === "undefined") return "docvault-light";
        return loadGlobalEditorTheme() ?? "docvault-light";
    });
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const themeDefinition = useMemo(() => getEditorTheme(theme), [theme]);
    const isDarkTheme = themeDefinition.mode === "dark";
    const themeModeClass = isDarkTheme ? "editor-theme-dark" : "editor-theme-light";
    useEffect(() => {
        applyEditorThemeToHtml(theme);
    }, [theme]);

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

            await router.replace("/");
        } catch (submitError) {
            const message =
                submitError instanceof Error ? submitError.message : "Authentication failed";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className={`editor-theme ${themeModeClass} flex min-h-screen items-center justify-center px-4`} style={{ background: "var(--editor-bg)" }}>
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm" style={{ background: "var(--editor-surface)", borderColor: "var(--editor-border)" }}>

                <h1 className="text-2xl font-semibold" style={{ color: "var(--editor-text)" }}>
                    {mode === "login" ? "Welcome back" : "Create your account"}
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--editor-text-muted)" }}>
                    {mode === "login"
                        ? "Sign in to access your documents."
                        : "Register to start writing and saving documents."}
                </p>

                <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
                    {mode === "register" && (
                        <label className="block">
                            <span className="mb-1 block text-sm" style={{ color: "var(--editor-text-muted)" }}>Name</span>
                            <input
                                id="name"
                                name="name"
                                autoComplete="name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                                style={{ borderColor: "var(--editor-border)", background: "var(--editor-surface)", color: "var(--editor-text)" }}
                                placeholder="Poonkawin"
                            />
                        </label>
                    )}

                    <label className="block">
                        <span className="mb-1 block text-sm" style={{ color: "var(--editor-text-muted)" }}>Email</span>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                            style={{ borderColor: "var(--editor-border)", background: "var(--editor-surface)", color: "var(--editor-text)" }}
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="block">
                        <div className="flex items-center justify-between">
                            <span className="mb-1 block text-sm" style={{ color: "var(--editor-text-muted)" }}>Password</span>
                            {mode === "login" && (
                                <Link
                                    href="/forgot-password"
                                    className="mb-1 text-xs transition-colors"
                                    style={{ color: "var(--editor-accent)" }}
                                >
                                    Forgot password?
                                </Link>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    minLength={8}
                                    required
                                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none"
                                    style={{ borderColor: "var(--editor-border)", background: "var(--editor-surface)", color: "var(--editor-text)" }}
                                    placeholder="Minimum 8 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((previous) => !previous)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1"
                                    style={{ color: "var(--editor-text-muted)" }}
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
                                    className="inline-flex items-center gap-1 rounded-lg border px-3 text-xs font-medium"
                                    style={{ borderColor: "var(--editor-border)", color: "var(--editor-text)", background: "var(--editor-surface)" }}
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
                            <span className="mb-1 block text-sm" style={{ color: "var(--editor-text-muted)" }}>Confirm password</span>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type={showPassword ? "text" : "password"}
                                minLength={8}
                                required
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                                style={{ borderColor: "var(--editor-border)", background: "var(--editor-surface)", color: "var(--editor-text)" }}
                                placeholder="Repeat your password"
                            />
                        </label>
                    )}

                    <p className="flex items-center gap-2 text-xs" style={{ color: "var(--editor-text-muted)" }}>
                        <KeyRound size={13} />
                        Works with browser password managers and autofill.
                    </p>

                    {error && (
                        <div className="flex items-center gap-2 px-1 text-rose-500 animate-in fade-in slide-in-from-top-1 mb-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="editor-accent-button mt-1 w-full cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting
                            ? "Please wait..."
                            : mode === "login"
                                ? "Sign in"
                                : "Create account"}
                    </button>
                </form>

                <div className="mt-4 flex flex-col items-center gap-3 text-sm">
                    <div className="flex w-full items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setMode((previous) => (previous === "login" ? "register" : "login"))}
                            className="cursor-pointer transition-opacity hover:opacity-75"
                            style={{ color: "var(--editor-accent)" }}
                        >
                            {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
                        </button>

                        <Link href="/" className="transition-opacity hover:opacity-75" style={{ color: "var(--editor-text-muted)" }}>
                            Home
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
