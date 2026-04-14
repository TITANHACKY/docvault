"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { loginUser, registerUser } from "@/lib/auth-client";
import { addComment, upsertDocument } from "@/lib/documents";
import {
    deleteGuestDocument,
    listGuestComments,
    listGuestDocuments,
} from "@/lib/guest-documents";

async function syncGuestDataToServer(): Promise<void> {
    const guestDocuments = await listGuestDocuments();
    if (guestDocuments.length === 0) return;

    for (const document of guestDocuments) {
        await upsertDocument(document);

        const guestComments = await listGuestComments(document.id);
        for (const comment of guestComments) {
            await addComment(document.id, comment.content, comment.author || "Guest");
        }

        await deleteGuestDocument(document.id);
    }
}

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

            await router.replace("/docs");
        } catch (submitError) {
            const message =
                submitError instanceof Error ? submitError.message : "Authentication failed";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-900">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {mode === "login"
                        ? "Sign in to access your documents."
                        : "Register to start writing and saving documents."}
                </p>

                <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
                    {mode === "register" && (
                        <label className="block">
                            <span className="mb-1 block text-sm text-gray-600">Name</span>
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                                placeholder="Poonkawin"
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
                        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-1 w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting
                            ? "Please wait..."
                            : mode === "login"
                                ? "Sign in"
                                : "Create account"}
                    </button>
                </form>

                <div className="mt-4 flex items-center justify-between text-sm">
                    <button
                        type="button"
                        onClick={() => setMode((previous) => (previous === "login" ? "register" : "login"))}
                        className="cursor-pointer text-indigo-600 hover:text-indigo-500"
                    >
                        {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
                    </button>

                    <Link href="/" className="text-gray-500 hover:text-gray-700">
                        Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
