import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function ShareIndex() {
  const router = useRouter();
  const docId = typeof router.query.id === "string" ? router.query.id : null;

  useEffect(() => {
    if (!docId || !router.isReady) return;
    fetch(`/api/share/${docId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const firstPage = data.pages?.find((p: { id: string }) => p.id === data.activePageId) ?? data.pages?.[0];
        if (firstPage) void router.replace(`/share/${docId}/${firstPage.id}`);
        else void router.replace("/");
      })
      .catch(() => router.replace("/"));
  }, [docId, router.isReady, router]);

  return (
    <>
      <Head><title>DocVault</title></Head>
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
      </div>
    </>
  );
}
