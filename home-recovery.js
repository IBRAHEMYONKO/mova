"use strict";

/*
 * Homepage resilience layer.
 * It never calls AniList/Jikan directly from the browser. Anime, manga,
 * manhwa and novels all come through the same cached server-side catalog API.
 */
(() => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function getJSON(url, options = {}, attempts = 2) {
        let lastError;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);
            try {
                const response = await fetch(url, {
                    ...options,
                    cache: "no-store",
                    signal: controller.signal,
                    headers: { Accept: "application/json", ...(options.headers || {}) }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                lastError = error;
                if (attempt + 1 < attempts) await wait(700 * (attempt + 1));
            } finally {
                clearTimeout(timer);
            }
        }
        throw lastError || new Error("Request failed");
    }

    const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
    const esc = value => clean(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    function typeLabel(type) {
        return ({ movie:"فيلم", series:"مسلسل", anime:"أنمي", manga:"مانغا", manhwa:"مانهوا", novel:"رواية" })[type] || "محتوى";
    }

    function card(item, type) {
        const title = clean(item.title || item.name || item.originalTitle || "بدون عنوان");
        const poster = item.poster || item.image || item.coverImage?.extraLarge || item.coverImage?.large || "";
        const year = clean(item.year || item.releaseDate || "").slice(0, 4) || "—";
        const rating = Number(item.rating || 0);
        const id = item.id || "";

        return `<article class="content-card" data-id="${esc(id)}" tabindex="0" role="link" aria-label="فتح ${esc(title)}">
            <div class="card-poster">
                ${poster ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy" onerror="this.style.display='none'">` : `<div style="width:100%;height:100%;display:grid;place-items:center;color:#d6a84f;font-size:35px">IE</div>`}
                <span class="card-rating">★ ${Number.isFinite(rating) && rating ? rating.toFixed(1) : "—"}</span>
                <span class="card-type">${typeLabel(type)}</span>
            </div>
            <div class="card-body"><h3 class="card-title">${esc(title)}</h3><div class="card-meta"><span>${esc(year)}</span></div></div>
        </article>`;
    }

    function render(grid, items, type, limit = 24) {
        if (!grid || !Array.isArray(items) || !items.length) return false;
        grid.innerHTML = items.slice(0, limit).map(item => card(item, type)).join("");
        return true;
    }

    async function recoverLocal() {
        try {
            const data = await getJSON("/api/movies?sort=popular", {}, 2);
            const movies = Array.isArray(data?.movies) ? data.movies : [];
            if (!movies.length) return;
            const byType = type => movies.filter(item => String(item?.type || "").toLowerCase() === type);
            render(document.querySelector("#movieGrid"), byType("movie"), "movie");
            render(document.querySelector("#seriesGrid"), byType("series"), "series");
            render(document.querySelector("#popularGrid"), movies, "movie", 24);
        } catch (error) {
            console.warn("HOME RECOVERY LOCAL:", error.message);
        }
    }

    async function recoverTVMaze() {
        try {
            const data = await getJSON("https://api.tvmaze.com/shows?page=0", {}, 2);
            const shows = Array.isArray(data)
                ? data.map(show => ({
                    id: `tvmaze:${show.id}`,
                    title: show.name,
                    poster: show.image?.original || show.image?.medium || "",
                    releaseDate: show.premiered || "",
                    rating: show.rating?.average || 0
                }))
                : [];
            render(document.querySelector("#seriesGrid"), shows, "series");
        } catch (error) {
            console.warn("HOME RECOVERY TVMAZE:", error.message);
        }
    }

    async function recoverMediaCatalog() {
        try {
            const data = await getJSON("/api/catalog-media?page=1&perPage=50", {}, 2);
            const anime = Array.isArray(data?.anime) ? data.anime : [];
            render(document.querySelector("#animeGrid"), anime, "anime");
        } catch (error) {
            console.warn("HOME RECOVERY MEDIA CATALOG:", error.message);
        }
    }

    function start() {
        Promise.allSettled([recoverLocal(), recoverTVMaze(), recoverMediaCatalog()]);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
    else start();
})();
