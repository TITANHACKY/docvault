import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import "@/styles/globals.css";
import "@/styles/editor.css";
import Head from "next/head";
import { hydrateEditorThemeFromStorage } from "@/lib/html-theme";

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();

    useEffect(() => {
        hydrateEditorThemeFromStorage();
    }, [router.asPath]);

    return (
        <>
            <Head>
                <title>DocVault</title>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="alternate icon" href="/favicon.ico" type="image/x-icon" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}
