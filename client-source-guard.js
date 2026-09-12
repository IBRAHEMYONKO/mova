"use strict";

/*
 * Browser-side source guard.
 *
 * The home page now uses the server-side catalog API as its canonical
 * AniList/Jikan source. Older index.js code still contains direct calls to
 * those providers, so block those legacy browser requests instead of letting
 * provider 429/504 errors pollute the console or delay page loading.
 */
(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
        const url = typeof input === "string"
            ? input
            : input?.url || "";

        const value = String(url || "");

        if (/^https:\/\/api\.jikan\.moe\//i.test(value)) {
            return new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (/^https:\/\/graphql\.anilist\.co\/?$/i.test(value)) {
            return new Response(JSON.stringify({
                data: { Page: { media: [] } }
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        return originalFetch(input, init);
    };
})();
