"use strict";

/* Prevent legacy browser code from calling external AniList/Jikan endpoints. */
(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input?.url || "";
        const value = String(url || "");

        if (/^https:\/\/api\.jikan\.moe\//i.test(value)) {
            return new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (/^https:\/\/graphql\.anilist\.co\/?$/i.test(value)) {
            return new Response(JSON.stringify({ data: { Page: { media: [] } } }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        return originalFetch(input, init);
    };
})();
