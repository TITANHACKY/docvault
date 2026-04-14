import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import "@/styles/globals.css";
import "@/styles/editor.css";
import { hydrateEditorThemeFromStorage } from "@/lib/html-theme";

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();

    useEffect(() => {
        hydrateEditorThemeFromStorage();
    }, [router.asPath]);

    return <Component {...pageProps} />;
}
