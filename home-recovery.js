"use strict";

/*
 * Homepage resilience layer.
 * It is intentionally independent from index.js so a third-party source
 * failure (429/504) cannot leave the whole homepage empty.
 */
(() => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function getJSON(url, options = {}, attempts = 2) {
        let lastError;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try {
                const response = await fetch(url, {
                    ...options,
                    cache: "no-store",
                    headers: { Accept: "application/json", ...(options.headers || {}) }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                lastError = error;
                if (attempt + 1 < attempts) await wait(700 * (attempt + 1));
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

    function card(item, type) {
        const title = clean(item.title || item.name || item.originalTitle || item.title_english || item.title_romaji || "بدون عنوان");
        const poster = item.poster || item.image || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || item.coverImage?.extraLarge || item.coverImage?.large || "";
        const year = clean(item.year || item.releaseDate || item.aired?.from || "").slice(0, 4) || "—";
        const rating = Number(item.rating || item.score || 0);
        const id = item.id || item.malId || item.mal_id || "";
        const watchId = type === "anime" && String(item.id || "").startsWith("anilist:")
            ? item.id
            : type === "anime" && item.malId
                ? `mal:${item.malId}`
                : id;

        return `<article class="content-card" data-id="${esc(watchId)}" tabindex="0" role="link" aria-label="فتح ${esc(title)}">
            <div class="card-poster">
                ${poster ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy" onerror="this.style.display='none'">` : `<div style="width:100%;height:100%;display:grid;place-items:center;color:#d6a84f;font-size:35px">IE</div>`}
                <span class="card-rating">★ ${Number.isFinite(rating) && rating ? rating.toFixed(1) : "—"}</span>
                <span class="card-type">${type === "movie" ? "فيلم" : type === "series" ? "مسلسل" : "أنمي"}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${esc(title)}</h3>
                <div class="card-meta"><span>${esc(year)}</span></div>
            </div>
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
            render(document.querySelector("#animeGrid"), byType("anime"), "anime");
            render(document.querySelector("#popularGrid"), movies, "movie", 24);
        } catch (error) {
            console.warn("HOME RECOVERY LOCAL:", error.message);
        }
    }

    async function recoverTVMaze() {
        try {
            const data = await getJSON("https://api.tvmaze.com/shows?page=0", {}, 2);
            const shows = Array.isArray(data) ? data.map(show => ({
                id: `tvmaze:${show.id}`,
                title: show.name,
                poster: show.image?.original || show.image?.medium || "",
                releaseDate: show.premiered || "",
                rating: show.rating?.average || 0
            })) : [];
            render(document.querySelector("#seriesGrid"), shows, "series");
        } catch (error) {
            console.warn("HOME RECOVERY TVMAZE:", error.message);
        }
    }

    async function recoverAnime() {
        const targets = [
            "https://api.jikan.moe/v4/top/anime?limit=24",
            "https://graphql.anilist.co"
        ];

        try {
            const data = await getJSON(targets[0], {}, 2);
            const anime = Array.isArray(data?.data) ? data.data : [];
            if (anime.length) {
                render(document.querySelector("#animeGrid"), anime, "anime");
                return;
            }
        } catch (error) {
            console.warn("HOME RECOVERY JIKAN:", error.message);
        }

        try {
            const query = `query { Page(page: 1, perPage: 24) { media(type: ANIME, sort: POPULARITY_DESC) { id title { romaji english native } coverImage { large extraLarge } averageScore startDate { year } } } }`;
            const data = await getJSON(targets[1], {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query })
            }, 2);
            const anime = (data?.data?.Page?.media || []).map(item => ({
                id: `anilist:${item.id}`,
                title: item.title?.english || item.title?.romaji || item.title?.native,
                poster: item.coverImage?.extraLarge || item.coverImage?.large || "",
                rating: Number(item.averageScore || 0) / 10,
                year: item.startDate?.year || ""
            }));
            render(document.querySelector("#animeGrid"), anime, "anime");
        } catch (error) {
            console.warn("HOME RECOVERY ANILIST:", error.message);
        }
    }

    async function recoverManga() {
        const mount = document.querySelector("#anime") || document.querySelector("#popular");
        if (!mount || document.querySelector("#iraqMangaRecovery")) return;

        let data;
        try {
            data = await getJSON("/api/catalog-media?page=1", {}, 2);
        } catch (error) {
            console.warn("HOME RECOVERY MANGA:", error.message);
            return;
        }

        const manga = Array.isArray(data?.manga) ? data.manga : [];
        const manhwa = Array.isArray(data?.manhwa) ? data.manhwa : [];
        if (!manga.length && !manhwa.length) return;

        const wrapper = document.createElement("section");
        wrapper.id = "iraqMangaRecovery";
        wrapper.className = "section dark-section";
        wrapper.innerHTML = `
            <div class="section-head"><div><span class="kicker">IRAQ EMPIRE MANGA</span><h2>مكتبة المانغا</h2><p class="section-description">بيانات حقيقية من المصدر المتاح.</p></div></div>
            <div class="movie-grid" id="recoveryMangaGrid"></div>
            <div class="section-head" style="margin-top:28px"><div><span class="kicker">IRAQ EMPIRE MANHWA</span><h2>مكتبة المانهوا</h2><p class="section-description">بيانات حقيقية من المصدر المتاح.</p></div></div>
            <div class="movie-grid" id="recoveryManhwaGrid"></div>
        `;
        mount.parentNode.insertBefore(wrapper, mount.nextSibling);
        render(document.querySelector("#recoveryMangaGrid"), manga.map(item => ({ ...item, id: item.id || `anilist-manga-${item.anilistId}` })), "anime");
        render(document.querySelector("#recoveryManhwaGrid"), manhwa.map(item => ({ ...item, id: item.id || `anilist-manga-${item.anilistId}` })), "anime");
    }

    function start() {
        Promise.allSettled([recoverLocal(), recoverTVMaze(), recoverAnime(), recoverManga()]);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
})();
