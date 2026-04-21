import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { KeyRound, Lock, CheckCircle2, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (router.isReady && !token) {
      setError("Invalid or missing reset token.");
    }
  }, [router.isReady, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <Head>
        <title>Reset Password | DocVault</title>
      </Head>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Lock className="h-6 w-6 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          Set new password
        </h1>
        <p className="mt-1 text-sm text-gray-500 text-center mb-6">
          Almost there! Choose a strong password to secure your account.
        </p>

        {success ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 animate-bounce" />
            </div>
            <p className="text-gray-900 font-medium">Password reset successfully!</p>
            <p className="mt-2 text-sm text-gray-500">
              Redirecting you to login...
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Click here if you are not redirected
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-600 font-medium">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm outline-none focus:border-indigo-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600 font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm outline-none focus:border-indigo-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="editor-accent-button mt-2 w-full cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </div>
              ) : (
                "Reset password"
              )}
            </button>

            <div className="mt-4 flex items-center justify-center">
              <Link
                href="/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
