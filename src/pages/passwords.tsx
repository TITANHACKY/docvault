"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Check,
    Copy,
    Delete as DeleteIcon,
    Eye,
    EyeOff,
    Fingerprint,
    Globe,
    KeyRound,
    Lock,
    Plus,
    Search,
    Shield,
    Trash2,
    WandSparkles,
    X,
} from "lucide-react";
import {
    type VaultBlob, type VaultEntry,
    loadVaultBlob, saveVaultBlob,
    createVaultWithPin, createVaultWithBiometric,
    unlockWithPin, unlockWithBiometric,
    updateVaultEntries,
    hasPinUnlock, hasBiometricUnlock,
    isBiometricAvailable,
    addPinToVault,
    addBiometricToVault,
} from "@/lib/vault";
import {
    getEditorTheme,
    loadGlobalEditorTheme,
    type EditorTheme,
} from "@/lib/editor-themes";
import { applyEditorThemeToHtml } from "@/lib/html-theme";

// ── Helpers ────────────────────────────────────────────────────

const PIN_LENGTH = 4;

function generatePassword(): string {
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_-+=?";
    return Array.from(
        crypto.getRandomValues(new Uint8Array(20)),
        (v) => alpha[v % alpha.length],
    ).join("");
}

interface EntryFormState {
    id: string | null;
    site: string;
    url: string;
    username: string;
    password: string;
    notes: string;
}

function blankForm(from?: VaultEntry): EntryFormState {
    return {
        id: from?.id ?? null,
        site: from?.site ?? "",
        url: from?.url ?? "",
        username: from?.username ?? "",
        password: from?.password ?? "",
        notes: from?.notes ?? "",
    };
}

// ── PinPad ──────────────────────────────────────────────────────

function PinPad({
    value,
    onChange,
    onComplete,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    onComplete?: () => void;
    disabled?: boolean;
}) {
    const handleDigit = (d: string) => {
        if (disabled || value.length >= PIN_LENGTH) return;
        const next = value + d;
        onChange(next);
        if (next.length === PIN_LENGTH) onComplete?.();
    };
    const handleBackspace = () => { if (!disabled) onChange(value.slice(0, -1)); };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (disabled) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key >= "0" && e.key <= "9") {
                if (value.length >= PIN_LENGTH) return;
                const next = value + e.key;
                onChange(next);
                if (next.length === PIN_LENGTH) onComplete?.();
            } else if (e.key === "Backspace") {
                onChange(value.slice(0, -1));
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [value, disabled, onChange, onComplete]);

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="flex gap-3">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <div key={i} className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${i < value.length ? "border-(--editor-accent) bg-(--editor-accent) scale-110" : "border-(--editor-border) bg-transparent"}`} />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button key={n} type="button" onClick={() => handleDigit(String(n))} disabled={disabled}
                        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-(--editor-border) bg-(--editor-surface) text-lg font-semibold text-(--editor-text) shadow-sm transition-all hover:bg-(--editor-surface-muted) active:scale-95 disabled:opacity-50"
                    >{n}</button>
                ))}
                <div />
                <button type="button" onClick={() => handleDigit("0")} disabled={disabled}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-(--editor-border) bg-(--editor-surface) text-lg font-semibold text-(--editor-text) shadow-sm transition-all hover:bg-(--editor-surface-muted) active:scale-95 disabled:opacity-50"
                >0</button>
                <button type="button" onClick={handleBackspace} disabled={disabled} aria-label="Backspace"
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-(--editor-border) bg-(--editor-surface) text-(--editor-text-muted) shadow-sm transition-all hover:bg-(--editor-surface-muted) active:scale-95 disabled:opacity-50"
                ><DeleteIcon size={18} /></button>
            </div>
        </div>
    );
}

// ── Component ──────────────────────────────────────────────────

type Screen = "loading" | "setup" | "locked" | "unlocked";
type SetupStep = "pin" | "confirm" | "biometric-prompt" | "biometric-reg";

export default function PasswordsPage() {
    const [theme] = useState<EditorTheme>(() => {
        if (typeof window === "undefined") return "notesnook-light";
        return loadGlobalEditorTheme() ?? "notesnook-light";
    });

    const themeDefinition = useMemo(() => getEditorTheme(theme), [theme]);
    const isDarkTheme = themeDefinition.mode === "dark";
    const themeModeClass = isDarkTheme ? "editor-theme-dark" : "editor-theme-light";

    useEffect(() => {
        applyEditorThemeToHtml(theme);
    }, [theme]);

    // ── Auth state ───────────────────────────────────────────────
    const [screen, setScreen] = useState<Screen>("loading");
    const [setupStep, setSetupStep] = useState<SetupStep>("pin");

    // ── Vault blob + session key ──────────────────────────────────
    const [vaultBlob, setVaultBlob] = useState<VaultBlob | null>(null);
    const [vaultKey, setVaultKey] = useState<Uint8Array | null>(null);

    // ── PIN input ─────────────────────────────────────────────────
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinError, setPinError] = useState<string | null>(null);
    const [isWorking, setIsWorking] = useState(false);
    
    // ── Retrofit existing vault PIN ──────────────────────────────
    const [retroPin, setRetroPin] = useState("");
    const [retroConfirmPin, setRetroConfirmPin] = useState("");
    const [retroPinError, setRetroPinError] = useState<string | null>(null);
    const [showRetroPinSetup, setShowRetroPinSetup] = useState(false);

    // ── Biometric availability ─────────────────────────────────────
    const [bioAvailable, setBioAvailable] = useState(false);

    // ── Vault data ────────────────────────────────────────────────
    const [entries, setEntries] = useState<VaultEntry[]>([]);
    const [search, setSearch] = useState("");
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // ── Entry form ────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<EntryFormState>(blankForm());
    const [formShowPw, setFormShowPw] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // ── Initial load ──────────────────────────────────────────────

    useEffect(() => {
        void (async () => {
            const available = await isBiometricAvailable();
            setBioAvailable(available);
            const blob = await loadVaultBlob();
            if (!blob) { setScreen("setup"); setSetupStep("pin"); }
            else { setVaultBlob(blob); setScreen("locked"); }
        })();
    }, []);

    // ── Setup handlers ────────────────────────────────────────────

    const finalizeSetupPinOnly = async () => {
        setIsWorking(true);
        try {
            const { blob, vaultKey: key } = await createVaultWithPin(pin, []);
            await saveVaultBlob(blob);
            setVaultBlob(blob); setVaultKey(key); setEntries([]);
            setPin(""); setConfirmPin("");
            setScreen("unlocked");
        } finally { setIsWorking(false); }
    };

    const handleSetupConfirmComplete = async () => {
        if (confirmPin.length < PIN_LENGTH) return;
        if (pin !== confirmPin) { setPinError("PINs don't match. Try again."); setConfirmPin(""); return; }
        setPinError(null);
        if (bioAvailable) {
            setSetupStep("biometric-prompt");
        } else {
            await finalizeSetupPinOnly();
        }
    };

    const handleSetupBiometric = async () => {
        setIsWorking(true); setPinError(null);
        try {
            const { blob, vaultKey: key } = await createVaultWithPin(pin, []);
            let finalBlob = blob;
            try {
                const bioBlob = await addBiometricToVault(blob, key);
                if (bioBlob) {
                    finalBlob = bioBlob;
                } else {
                    console.warn("Biometric setup failed or was canceled. Falling back to PIN only.");
                }
            } catch (error) {
                console.error("Biometric setup failed, falling back to PIN", error);
            }
            
            await saveVaultBlob(finalBlob);
            setVaultBlob(finalBlob); setVaultKey(key); setEntries([]);
            setScreen("unlocked");
        } finally { setIsWorking(false); }
    };

    // ── Unlock handlers ────────────────────────────────────────────

    const handleUnlockPin = async () => {
        if (!vaultBlob || pin.length < PIN_LENGTH) return;
        setPinError(null); setIsWorking(true);
        try {
            const result = await unlockWithPin(vaultBlob, pin);
            if (!result) { setPinError("Incorrect PIN. Please try again."); setPin(""); return; }
            setEntries(result.entries); setVaultKey(result.vaultKey); setPin("");
            setScreen("unlocked");
        } finally { setIsWorking(false); }
    };

    const handleUnlockBiometric = async () => {
        if (!vaultBlob) return;
        setPinError(null); setIsWorking(true);
        try {
            const result = await unlockWithBiometric(vaultBlob);
            if (!result) { setPinError("Biometric verification failed."); return; }
            setEntries(result.entries); setVaultKey(result.vaultKey);
            setScreen("unlocked");
        } finally { setIsWorking(false); }
    };

    // Auto-submit PIN when complete
    useEffect(() => {
        if (screen === "locked" && pin.length === PIN_LENGTH && !isWorking) {
            void handleUnlockPin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pin, screen]);

    useEffect(() => {
        if (setupStep === "confirm" && confirmPin.length === PIN_LENGTH && !isWorking) {
            void handleSetupConfirmComplete();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [confirmPin, setupStep]);

    const handleLock = () => {
        setEntries([]); setVaultKey(null); setRevealedIds(new Set()); setSearch(""); setFormOpen(false); setPin(""); setPinError(null); setScreen("locked");
    };

    const handleRetrofitPinComplete = async () => {
        if (!vaultBlob || !vaultKey || retroConfirmPin.length < PIN_LENGTH) return;
        if (retroPin !== retroConfirmPin) {
            setRetroPinError("PINs don't match. Try again.");
            setRetroConfirmPin("");
            return;
        }
        setRetroPinError(null);
        setIsWorking(true);
        try {
            const newBlob = await addPinToVault(vaultBlob, vaultKey, retroPin);
            await saveVaultBlob(newBlob);
            setVaultBlob(newBlob);
            setShowRetroPinSetup(false);
            setRetroPin(""); setRetroConfirmPin("");
        } catch (error) {
            console.error(error);
            setRetroPinError("Failed to add PIN.");
        } finally {
            setIsWorking(false);
        }
    };

    // Auto-submit retro PIN step
    useEffect(() => {
        if (showRetroPinSetup && !retroConfirmPin && retroPin.length === PIN_LENGTH) {
            // First step complete, do nothing, let them type confirm
        }
        if (showRetroPinSetup && retroConfirmPin.length === PIN_LENGTH && !isWorking) {
            void handleRetrofitPinComplete();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retroPin, retroConfirmPin, showRetroPinSetup]);

    // ── Entry handlers ─────────────────────────────────────────────

    const saveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!form.site.trim()) { setFormError("Site name is required."); return; }
        if (!form.username.trim()) { setFormError("Username is required."); return; }
        if (!form.password) { setFormError("Password is required."); return; }
        if (!vaultBlob || !vaultKey) return;

        setIsSaving(true);
        try {
            const now = Date.now();
            let next: VaultEntry[];
            if (form.id) {
                next = entries.map((en) => en.id === form.id ? { ...en, site: form.site, url: form.url || undefined, username: form.username, password: form.password, notes: form.notes || undefined, updatedAt: now } : en);
            } else {
                const newEntry: VaultEntry = {
                    id: crypto.randomUUID(),
                    site: form.site,
                    url: form.url || undefined,
                    username: form.username,
                    password: form.password,
                    notes: form.notes || undefined,
                    createdAt: now,
                    updatedAt: now,
                };
                next = [newEntry, ...entries];
            }
            const newBlob = await updateVaultEntries(vaultBlob, next, vaultKey);
            await saveVaultBlob(newBlob);
            setVaultBlob(newBlob); setEntries(next);
            setFormOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteEntry = async (id: string) => {
        if (!window.confirm("Delete this entry permanently?")) return;
        if (!vaultBlob || !vaultKey) return;
        const next = entries.filter((en) => en.id !== id);
        const newBlob = await updateVaultEntries(vaultBlob, next, vaultKey);
        await saveVaultBlob(newBlob);
        setVaultBlob(newBlob); setEntries(next);
    };

    const copyText = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    };

    const toggleReveal = (id: string) => {
        setRevealedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const openAdd = () => { setForm(blankForm()); setFormShowPw(false); setFormError(null); setFormOpen(true); };
    const openEdit = (entry: VaultEntry) => { setForm(blankForm(entry)); setFormShowPw(false); setFormError(null); setFormOpen(true); };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter(
            (e) => e.site.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || (e.url ?? "").toLowerCase().includes(q),
        );
    }, [entries, search]);

    // ── Auth screens ──────────────────────────────────────────────

    // ── Loading ────────────────────────────────────────────────────

    if (screen === "loading") {
        return (
            <main className={`editor-theme ${themeModeClass} flex min-h-screen items-center justify-center bg-(--editor-bg)`}>
                <div className="flex flex-col items-center gap-3">
                    <Shield size={28} className="text-(--editor-accent) animate-pulse" />
                    <p className="text-sm text-(--editor-text-muted)">Loading vault…</p>
                </div>
            </main>
        );
    }

    // ── Setup ──────────────────────────────────────────────────────

    if (screen === "setup") {
        return (
            <main className={`editor-theme ${themeModeClass} flex min-h-screen flex-col items-center justify-center bg-(--editor-bg) px-4`}>
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex flex-col items-center gap-3 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-(--editor-accent)/10 ring-1 ring-(--editor-accent)/20">
                            <Shield size={30} className="text-(--editor-accent)" />
                        </div>
                        <h1 className="text-xl font-bold text-(--editor-text)">Set up Vault</h1>
                        <p className="text-sm text-(--editor-text-muted)">
                            {setupStep === "pin" && "Choose a 4-digit PIN for your vault."}
                            {setupStep === "confirm" && "Confirm your PIN to make sure it's right."}
                            {setupStep === "biometric-prompt" && "Enable quicker access?"}
                            {setupStep === "biometric-reg" && "Use your fingerprint or face to protect your vault."}
                        </p>
                    </div>

                    {setupStep === "biometric-prompt" && (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-(--editor-text-muted)">Would you like to enable Fingerprint or Face ID for faster unlocking?</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => setSetupStep("biometric-reg")} className="w-full rounded-xl bg-(--editor-accent) py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">Enable Biometric</button>
                                <button onClick={finalizeSetupPinOnly} className="w-full rounded-xl border border-(--editor-border) py-3 text-sm font-semibold text-(--editor-text-muted) hover:bg-(--editor-surface-muted) transition-colors">Skip</button>
                            </div>
                            <button type="button" onClick={() => { setConfirmPin(""); setSetupStep("pin"); setPin(""); }}
                                className="mt-4 text-sm text-(--editor-text-muted) hover:text-(--editor-text) transition-colors"
                            >← Back</button>
                        </div>
                    )}

                    {(setupStep === "pin" || setupStep === "confirm") && (
                        <div className="flex flex-col items-center gap-6">
                            <PinPad
                                value={setupStep === "pin" ? pin : confirmPin}
                                onChange={setupStep === "pin" ? setPin : setConfirmPin}
                                onComplete={setupStep === "pin" ? () => { if (pin.length >= PIN_LENGTH) { setSetupStep("confirm"); setConfirmPin(""); } } : undefined}
                                disabled={isWorking}
                            />
                            {pinError && <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">{pinError}</p>}
                            {setupStep === "confirm" && (
                                <button type="button" onClick={() => { setConfirmPin(""); setPin(""); setSetupStep("pin"); }}
                                    className="text-sm text-(--editor-text-muted) hover:text-(--editor-text) transition-colors"
                                >← Back</button>
                            )}
                        </div>
                    )}

                    {setupStep === "biometric-reg" && (
                        <div className="flex flex-col items-center gap-4">
                            <button type="button" onClick={handleSetupBiometric} disabled={isWorking}
                                className="flex h-24 w-24 items-center justify-center rounded-3xl bg-(--editor-accent)/10 ring-2 ring-(--editor-accent)/20 transition-all hover:ring-(--editor-accent)/50 active:scale-95 disabled:opacity-60"
                            >
                                <Fingerprint size={40} className="text-(--editor-accent)" />
                            </button>
                            <p className="text-center text-sm text-(--editor-text-muted)">{isWorking ? "Registering biometric…" : "Tap to register your fingerprint or Face ID"}</p>
                            {pinError && <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">{pinError}</p>}
                            <button type="button" onClick={() => { setPinError(null); setSetupStep("biometric-prompt"); }}
                                className="text-sm text-(--editor-text-muted) hover:text-(--editor-text) transition-colors"
                            >← Back</button>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <Link href="/" className="text-sm text-(--editor-text-muted) hover:text-(--editor-text) transition-colors">← Back to Docs</Link>
                    </div>
                </div>
            </main>
        );
    }

    // ── Locked ─────────────────────────────────────────────────────

    if (screen === "locked") {
        const hasPin = hasPinUnlock(vaultBlob);
        const hasBio = hasBiometricUnlock(vaultBlob);
        return (
            <main className={`editor-theme ${themeModeClass} flex min-h-screen flex-col items-center justify-center bg-(--editor-bg) px-4`}>
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex flex-col items-center gap-3 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-(--editor-accent)/10 ring-1 ring-(--editor-accent)/20">
                            <Lock size={28} className="text-(--editor-accent)" />
                        </div>
                        <h1 className="text-xl font-bold text-(--editor-text)">Vault Locked</h1>
                        <p className="text-sm text-(--editor-text-muted)">{hasPin && hasBio ? "Use your biometric or enter your 4-digit PIN to unlock." : hasPin ? "Enter your 4-digit PIN to unlock." : "Use your biometric to unlock."}</p>
                    </div>

                    {hasPin && (
                        <div className="flex flex-col items-center gap-4">
                            <PinPad value={pin} onChange={setPin} disabled={isWorking} />
                            {pinError && <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">{pinError}</p>}
                        </div>
                    )}

                    {hasBio && (
                        <div className={`flex flex-col items-center gap-3 ${hasPin ? "mt-6 pt-6 border-t border-(--editor-border)" : ""}`}>
                            {hasPin && <p className="text-xs text-(--editor-text-muted)">or</p>}
                            <button type="button" onClick={handleUnlockBiometric} disabled={isWorking}
                                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-(--editor-accent)/10 ring-2 ring-(--editor-accent)/20 transition-all hover:ring-(--editor-accent)/50 active:scale-95 disabled:opacity-60"
                            >
                                <Fingerprint size={36} className="text-(--editor-accent)" />
                            </button>
                            <p className="text-xs text-(--editor-text-muted)">{isWorking ? "Verifying…" : "Fingerprint / Face ID"}</p>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <Link href="/" className="text-sm text-(--editor-text-muted) hover:text-(--editor-text) transition-colors">← Back to Docs</Link>
                    </div>
                </div>
            </main>
        );
    }

    // ── Unlocked vault ────────────────────────────────────────────

    return (
        <main className={`editor-theme ${themeModeClass} min-h-screen bg-(--editor-bg) text-(--editor-text)`}>

            {/* ── Sticky nav ── */}
            <header className="sticky top-0 z-10 border-b border-(--editor-border) bg-(--editor-bg)/90 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
                    <div className="flex items-center gap-2.5 shrink-0">
                        <Link href="/" className="flex items-center gap-1.5 text-sm text-(--editor-text-muted) hover:text-(--editor-text) transition-colors">
                            <ArrowLeft size={14} />
                            Docs
                        </Link>
                        <span className="text-(--editor-text-muted) opacity-30">/</span>
                        <div className="flex items-center gap-1.5">
                            <Shield size={15} className="text-(--editor-accent)" />
                            <span className="text-sm font-semibold text-(--editor-text)">Vault</span>
                        </div>
                    </div>

                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--editor-text-muted)" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search vault…"
                            className="w-full rounded-lg border border-(--editor-border) bg-(--editor-surface) py-1.5 pl-8 pr-3 text-sm text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={openAdd}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-(--editor-accent) px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                        >
                            <Plus size={15} />
                            Add
                        </button>
                        <button
                            onClick={handleLock}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-(--editor-border) bg-(--editor-surface) px-3 py-2 text-sm text-(--editor-text-muted) hover:bg-(--editor-surface-muted) transition-colors"
                            title="Lock vault"
                        >
                            <Lock size={15} />
                            Lock
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Content ── */}
            <div className="mx-auto max-w-5xl px-6 py-8">

                {vaultBlob && !hasPinUnlock(vaultBlob) && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5">
                        {!showRetroPinSetup ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
                                <div className="flex items-start gap-4 text-amber-600 dark:text-amber-500">
                                    <div className="rounded-full bg-amber-500/20 p-2 shrink-0">
                                        <KeyRound size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Setup a 4-digit PIN</h3>
                                        <p className="mt-1 text-sm opacity-80">Your vault is currently only protected by biometrics. Adding a PIN ensures you can always access it.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRetroPinSetup(true)}
                                    className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-95 transition-all"
                                >
                                    Add PIN
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 flex flex-col items-center gap-4">
                                <h3 className="font-semibold text-(--editor-text)">
                                    {retroPin.length < PIN_LENGTH ? "Enter a new 4-digit PIN" : "Confirm your 4-digit PIN"}
                                </h3>
                                <div className="mt-2 text-(--editor-text)"> 
                                    <PinPad
                                        value={retroPin.length < PIN_LENGTH ? retroPin : retroConfirmPin}
                                        onChange={retroPin.length < PIN_LENGTH ? setRetroPin : setRetroConfirmPin}
                                        disabled={isWorking}
                                    />
                                </div>
                                {retroPinError && <p className="text-sm text-red-500">{retroPinError}</p>}
                                <button
                                    onClick={() => { setShowRetroPinSetup(false); setRetroPin(""); setRetroConfirmPin(""); setRetroPinError(null); }}
                                    className="mt-2 text-sm text-(--editor-text-muted) hover:text-(--editor-text)"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-5 flex items-center gap-2 text-sm text-(--editor-text-muted)">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Vault unlocked — encrypted and synced to your account
                    <span className="ml-auto text-xs opacity-60">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
                </div>

                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-(--editor-border) bg-(--editor-surface)/40 px-8 py-20 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-(--editor-surface) ring-1 ring-(--editor-border)">
                            <KeyRound size={26} className="text-(--editor-accent)" />
                        </div>
                        <p className="text-base font-semibold text-(--editor-text)">Vault is empty</p>
                        <p className="mt-1 text-sm text-(--editor-text-muted)">Add your first saved password to get started.</p>
                        <button
                            onClick={openAdd}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-(--editor-accent) px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                        >
                            <Plus size={16} />
                            Add password
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="mt-10 text-center text-sm text-(--editor-text-muted)">
                        No entries match <span className="font-medium text-(--editor-text)">&ldquo;{search}&rdquo;</span>
                    </p>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((entry) => {
                            const revealed = revealedIds.has(entry.id);
                            const initials = entry.site.slice(0, 2).toUpperCase();
                            const pwDisplay = revealed
                                ? entry.password
                                : "•".repeat(Math.min(entry.password.length, 16));

                            return (
                                <li
                                    key={entry.id}
                                    className="group relative flex flex-col gap-3 rounded-2xl border border-(--editor-border) bg-(--editor-surface) p-4 shadow-sm transition-all hover:shadow-md hover:border-(--editor-accent)/30"
                                >
                                    {/* Header row */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--editor-accent)/10 text-xs font-bold text-(--editor-accent)">
                                            {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-(--editor-text)">{entry.site}</p>
                                            {entry.url && (
                                                <a
                                                    href={entry.url.startsWith("http") ? entry.url : `https://${entry.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 truncate text-xs text-(--editor-text-muted) hover:text-(--editor-accent)"
                                                >
                                                    <Globe size={10} />
                                                    {entry.url.replace(/^https?:\/\//, "")}
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={() => openEdit(entry)}
                                                className="rounded-md px-2 py-1 text-xs text-(--editor-text-muted) hover:bg-(--editor-surface-muted) hover:text-(--editor-text)"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deleteEntry(entry.id)}
                                                className="rounded-lg p-1.5 text-(--editor-text-muted) hover:bg-red-50 hover:text-red-500"
                                                title="Delete entry"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Username row */}
                                    <div className="flex items-center justify-between gap-2 rounded-lg bg-(--editor-surface-muted) px-3 py-1.5">
                                        <span className="min-w-0 truncate text-xs text-(--editor-text-muted)">{entry.username}</span>
                                        <button
                                            onClick={() => copyText(entry.username, `${entry.id}:user`)}
                                            className="shrink-0 rounded p-1 text-(--editor-text-muted) hover:bg-(--editor-border) hover:text-(--editor-text)"
                                            title="Copy username"
                                        >
                                            {copiedKey === `${entry.id}:user`
                                                ? <Check size={12} className="text-emerald-500" />
                                                : <Copy size={12} />}
                                        </button>
                                    </div>

                                    {/* Password row */}
                                    <div className="flex items-center justify-between gap-2 rounded-lg bg-(--editor-surface-muted) px-3 py-1.5">
                                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-(--editor-text-muted) select-none">
                                            {pwDisplay}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-0.5">
                                            <button
                                                onClick={() => toggleReveal(entry.id)}
                                                className="rounded p-1 text-(--editor-text-muted) hover:bg-(--editor-border) hover:text-(--editor-text)"
                                                title={revealed ? "Hide password" : "Show password"}
                                            >
                                                {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                            <button
                                                onClick={() => copyText(entry.password, `${entry.id}:pw`)}
                                                className="rounded p-1 text-(--editor-text-muted) hover:bg-(--editor-border) hover:text-(--editor-text)"
                                                title="Copy password"
                                            >
                                                {copiedKey === `${entry.id}:pw`
                                                    ? <Check size={12} className="text-emerald-500" />
                                                    : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>

                                    {entry.notes && (
                                        <p className="line-clamp-2 text-xs text-(--editor-text-muted)">{entry.notes}</p>
                                    )}
                                </li>
                            );
                        })}

                        {/* Quick-add card */}
                        <li>
                            <button
                                onClick={openAdd}
                                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-(--editor-border) bg-(--editor-surface)/40 p-8 text-sm text-(--editor-text-muted) transition-colors hover:border-(--editor-accent)/50 hover:bg-(--editor-surface) hover:text-(--editor-accent)"
                            >
                                <Plus size={20} />
                                Add entry
                            </button>
                        </li>
                    </ul>
                )}
            </div>

            {/* ── Add / Edit modal ── */}
            {formOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-(--editor-border) bg-(--editor-surface) shadow-2xl">
                        <div className="flex items-center justify-between border-b border-(--editor-border) px-5 py-4">
                            <h2 className="text-base font-semibold text-(--editor-text)">
                                {form.id ? "Edit entry" : "Add password"}
                            </h2>
                            <button
                                onClick={() => setFormOpen(false)}
                                className="rounded-lg p-1.5 text-(--editor-text-muted) hover:bg-(--editor-surface-muted)"
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={saveEntry} className="space-y-3 p-5">
                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-(--editor-text)">
                                    Site name <span className="text-red-500">*</span>
                                </span>
                                <input
                                    required
                                    autoFocus
                                    autoComplete="off"
                                    value={form.site}
                                    onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                                    className="w-full rounded-lg border border-(--editor-border) bg-(--editor-bg) px-3 py-2 text-sm text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
                                    placeholder="e.g. GitHub"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-(--editor-text)">URL</span>
                                <input
                                    autoComplete="url"
                                    value={form.url}
                                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                                    className="w-full rounded-lg border border-(--editor-border) bg-(--editor-bg) px-3 py-2 text-sm text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
                                    placeholder="https://example.com"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-(--editor-text)">
                                    Username / Email <span className="text-red-500">*</span>
                                </span>
                                <input
                                    required
                                    autoComplete="off"
                                    value={form.username}
                                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                    className="w-full rounded-lg border border-(--editor-border) bg-(--editor-bg) px-3 py-2 text-sm text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
                                    placeholder="you@example.com"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-(--editor-text)">
                                    Password <span className="text-red-500">*</span>
                                </span>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            required
                                            autoComplete="off"
                                            type={formShowPw ? "text" : "password"}
                                            value={form.password}
                                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                            className="w-full rounded-lg border border-(--editor-border) bg-(--editor-bg) px-3 py-2 pr-9 font-mono text-sm text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
                                            placeholder="Enter or generate"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormShowPw((p) => !p)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-(--editor-text-muted) hover:bg-(--editor-surface-muted)"
                                            aria-label={formShowPw ? "Hide password" : "Show password"}
                                        >
                                            {formShowPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const pw = generatePassword();
                                            setForm((f) => ({ ...f, password: pw }));
                                            setFormShowPw(true);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-(--editor-border) bg-(--editor-surface-muted) px-3 text-xs font-medium text-(--editor-text-muted) hover:text-(--editor-text) transition-colors"
                                        title="Generate a strong password"
                                    >
                                        <WandSparkles size={13} />
                                        Generate
                                    </button>
                                </div>
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-(--editor-text)">Notes</span>
                                <textarea
                                    rows={2}
                                    autoComplete="off"
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    className="w-full resize-none rounded-lg border border-(--editor-border) bg-(--editor-bg) px-3 py-2 text-sm text-(--editor-text) placeholder:text-(--editor-text-muted) outline-none focus:border-(--editor-accent)"
                                    placeholder="Optional notes…"
                                />
                            </label>

                            {formError && (
                                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setFormOpen(false)}
                                    className="flex-1 rounded-lg border border-(--editor-border) py-2 text-sm font-medium text-(--editor-text-muted) hover:bg-(--editor-surface-muted) transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 rounded-lg bg-(--editor-accent) py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
                                >
                                    {isSaving ? "Saving…" : form.id ? "Save changes" : "Add entry"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
