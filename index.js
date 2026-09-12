"use strict";

/* =========================================================
   IRAQ EMPIRE CINEMA
   HOME / CATALOG ENGINE
   ---------------------------------------------------------
   - يحافظ على المكتبة والفلاتر والبحث
   - البطاقات مرتبطة مباشرة بنظام watch.html الجديد
   - لا يوجد تشغيل وهمي أو مصادر وهمية
   - لا يحتاج Discord Token
========================================================= */

const API_BASE = "/api";

const CONFIG = {
    MOVIE_LIMIT: 24,
    SERIES_LIMIT: 24,
    ANIME_LIMIT: 24,
    SEARCH_LIMIT: 40,
    REQUIRE_ARABIC_METADATA: true,
    PUBLIC_SOURCES: {
        TVMAZE: true,
        JIKAN: true,
        ANILIST: true
    }
};

const state = {
    all: [],
    movies: [],
    series: [],
    anime: [],
    popular: [],
    movieCategory: "all",
    movieSort: "popular",
    seriesFilter: "all",
    animeFilter: "all",
    searchType: "all",
    searchTimer: null,
    movieLimit: CONFIG.MOVIE_LIMIT,
    sources: {
        local: false,
        tvmaze: false,
        jikan: false,
        anilist: false
    }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

const movieGrid = $("#movieGrid");
const seriesGrid = $("#seriesGrid");
const animeGrid = $("#animeGrid");
const popularGrid = $("#popularGrid");
const movieCount = $("#movieCount");
const seriesCount = $("#seriesCount");
const animeCount = $("#animeCount");
const statusText = $("#statusText");
const lastUpdate = $("#lastUpdate");
const toast = $("#toast");
const searchOverlay = $("#searchOverlay");
const searchInput = $("#searchInput");
const searchResults = $("#searchResults");
const emptyState = $("#emptyState");
const seriesEmptyState = $("#seriesEmptyState");
const animeEmptyState = $("#animeEmptyState");
const loadMore = $("#loadMore");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
    return cleanText(String(value ?? "").replace(/<[^>]*>/g, " "));
}

function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function formatRating(value) {
    const n = number(value);
    return n ? n.toFixed(1) : "—";
}

function getYear(item) {
    if (item?.year) return String(item.year);
    if (item?.releaseDate) return String(item.releaseDate).slice(0, 4);
    return "—";
}

function getTypeName(type) {
    switch (String(type || "").toLowerCase()) {
        case "movie": return "فيلم";
        case "series": return "مسلسل";
        case "anime": return "أنمي";
        default: return "محتوى";
    }
}

function getPoster(item) {
    return item?.poster ||
        item?.image ||
        item?.images?.jpg?.large_image_url ||
        item?.images?.jpg?.image_url ||
        item?.coverImage?.extraLarge ||
        item?.coverImage?.large ||
        "";
}

function getBackdrop(item) {
    return item?.backdrop ||
        item?.banner ||
        item?.coverImage?.extraLarge ||
        item?.coverImage?.large ||
        "";
}

function getGenres(item) {
    if (!Array.isArray(item?.genres)) return [];
    return item.genres
        .map(value => typeof value === "object"
            ? value?.name || value?.title || ""
            : String(value))
        .map(cleanText)
        .filter(Boolean)
        .slice(0, 8);
}

function normalizeTitle(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "");
}

function containsArabic(value) {
    return /[\u0600-\u06FF]/.test(String(value || ""));
}

function hasArabicMetadata(item) {
    if (!CONFIG.REQUIRE_ARABIC_METADATA) return true;

    const fields = [
        item?.title,
        item?.originalTitle,
        item?.englishTitle,
        item?.overview,
        ...getGenres(item)
    ];

    const language = String(item?.language || "").toLowerCase();
    return fields.some(containsArabic) ||
        ["ar", "ara", "arabic", "العربية", "عربي"].includes(language);
}

function createFallbackId(item) {
    return `${item?.type || "content"}:${normalizeTitle(item?.title || item?.originalTitle || "unknown")}:${getYear(item)}`;
}

function normalizeItem(item) {
    if (!item) return null;

    const type = String(item.type || "").toLowerCase();
    if (!["movie", "series", "anime"].includes(type)) return null;

    const normalized = {
        ...item,
        id: item.id || createFallbackId(item),
        type,
        title: cleanText(item.title || item.originalTitle || item.englishTitle || "بدون عنوان"),
        originalTitle: cleanText(item.originalTitle || ""),
        englishTitle: cleanText(item.englishTitle || ""),
        overview: cleanText(item.overview || ""),
        poster: getPoster(item),
        backdrop: getBackdrop(item),
        year: getYear(item),
        rating: number(item.rating),
        popularity: number(item.popularity),
        votes: number(item.votes),
        genres: getGenres(item),
        source: item.source || "unknown"
    };

    return hasArabicMetadata(normalized) ? normalized : null;
}

function strongKeys(item) {
    return [
        item?.tmdbId && `tmdb:${item.tmdbId}`,
        item?.imdbId && `imdb:${item.imdbId}`,
        item?.tvmazeId && `tvmaze:${item.tvmazeId}`,
        item?.malId && `mal:${item.malId}`,
        item?.anilistId && `anilist:${item.anilistId}`
    ].filter(Boolean);
}

function sameItem(a, b) {
    if (!a || !b || a.type !== b.type) return false;

    const aKeys = strongKeys(a);
    const bKeys = strongKeys(b);
    if (aKeys.some(key => bKeys.includes(key))) return true;

    const aTitles = [a.title, a.originalTitle, a.englishTitle]
        .map(normalizeTitle).filter(Boolean);
    const bTitles = [b.title, b.originalTitle, b.englishTitle]
        .map(normalizeTitle).filter(Boolean);

    if (!aTitles.some(title => bTitles.includes(title))) return false;

    const yearA = Number(getYear(a));
    const yearB = Number(getYear(b));
    return !yearA || !yearB || Math.abs(yearA - yearB) <= 1;
}

function mergeItems(a, b) {
    const merged = { ...a };

    const fields = [
        "tmdbId", "tvmazeId", "malId", "anilistId", "imdbId",
        "title", "originalTitle", "englishTitle", "overview",
        "poster", "backdrop", "releaseDate", "year", "rating",
        "votes", "popularity", "status", "language", "country",
        "runtime", "episodes", "season", "yearSeason", "sourceUrl",
        "trailer", "director", "writer", "production", "network"
    ];

    for (const field of fields) {
        const oldValue = merged[field];
        const newValue = b[field];
        if (newValue === undefined || newValue === null || newValue === "") continue;

        if (oldValue === undefined || oldValue === null || oldValue === "") {
            merged[field] = newValue;
        } else if (Array.isArray(newValue) && newValue.length > (Array.isArray(oldValue) ? oldValue.length : 0)) {
            merged[field] = newValue;
        } else if (typeof newValue === "string" && newValue.length > String(oldValue).length) {
            merged[field] = newValue;
        }
    }

    merged.genres = Array.from(new Set([
        ...getGenres(a),
        ...getGenres(b)
    ])).slice(0, 8);

    merged.sources = Array.from(new Set([
        ...(Array.isArray(a.sources) ? a.sources : [a.source]),
        ...(Array.isArray(b.sources) ? b.sources : [b.source])
    ].filter(Boolean)));

    return merged;
}

function deduplicateItems(items) {
    const output = [];

    for (const raw of Array.isArray(items) ? items : []) {
        const item = normalizeItem(raw);
        if (!item) continue;

        const index = output.findIndex(existing => sameItem(existing, item));
        if (index === -1) output.push(item);
        else output[index] = mergeItems(output[index], item);
    }

    return output;
}

function buildDate(date) {
    if (!date?.year) return "";
    const month = String(date.month || 1).padStart(2, "0");
    const day = String(date.day || 1).padStart(2, "0");
    return `${date.year}-${month}-${day}`;
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        cache: "no-store",
        headers: {
            Accept: "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function fetchLocalLibrary() {
    const data = await fetchJSON(`${API_BASE}/movies?sort=popular`);
    if (!Array.isArray(data?.movies)) throw new Error("Invalid local library");
    state.sources.local = true;
    return data.movies;
}

async function fetchTVMaze() {
    if (!CONFIG.PUBLIC_SOURCES.TVMAZE) return [];

    const results = [];
    for (const page of [0, 1]) {
        try {
            const data = await fetchJSON(`https://api.tvmaze.com/shows?page=${page}`);
            if (!Array.isArray(data)) continue;

            for (const show of data) {
                if (!show?.id || !show?.name) continue;
                results.push({
                    id: `tvmaze:${show.id}`,
                    tvmazeId: show.id,
                    source: "tvmaze",
                    type: "series",
                    title: cleanText(show.name),
                    originalTitle: cleanText(show.name),
                    overview: stripHtml(show.summary || ""),
                    poster: show.image?.original || show.image?.medium || "",
                    backdrop: show.image?.original || "",
                    releaseDate: show.premiered || "",
                    year: show.premiered ? String(show.premiered).slice(0, 4) : "",
                    rating: show.rating?.average || 0,
                    popularity: (show.rating?.average || 0) * 10,
                    genres: Array.isArray(show.genres) ? show.genres : [],
                    status: show.status || "",
                    language: show.language || "",
                    country: show.network?.country?.name || "",
                    runtime: show.runtime ? `${show.runtime} دقيقة` : "",
                    episodes: "",
                    sourceUrl: show.url || "",
                    network: show.network?.name || show.webChannel?.name || ""
                });
            }
        } catch (error) {
            console.warn("TVMAZE SOURCE ERROR:", error.message);
        }
    }

    if (results.length) state.sources.tvmaze = true;
    return results;
}

async function fetchJikan() {
    if (!CONFIG.PUBLIC_SOURCES.JIKAN) return [];

    const results = [];
    const endpoints = [
        "https://api.jikan.moe/v4/top/anime?limit=25",
        "https://api.jikan.moe/v4/anime?status=airing&limit=25",
        "https://api.jikan.moe/v4/anime?status=complete&limit=25"
    ];

    for (const endpoint of endpoints) {
        try {
            const data = await fetchJSON(endpoint);
            if (!Array.isArray(data?.data)) continue;

            for (const anime of data.data) {
                if (!anime?.mal_id) continue;
                const title = anime.title || anime.title_english || anime.title_japanese || "";
                if (!title) continue;

                results.push({
                    id: `mal:${anime.mal_id}`,
                    malId: anime.mal_id,
                    source: "jikan",
                    type: "anime",
                    title: cleanText(title),
                    originalTitle: cleanText(anime.title_japanese || title),
                    englishTitle: cleanText(anime.title_english || ""),
                    overview: cleanText(anime.synopsis || ""),
                    poster: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "",
                    backdrop: anime.images?.jpg?.large_image_url || "",
                    releaseDate: anime.aired?.from || "",
                    year: anime.aired?.from ? String(anime.aired.from).slice(0, 4) : "",
                    rating: anime.score || 0,
                    votes: anime.scored_by || 0,
                    popularity: anime.popularity ? Math.max(0, 100000 - anime.popularity) : 0,
                    genres: Array.isArray(anime.genres) ? anime.genres.map(item => item.name).filter(Boolean) : [],
                    status: anime.status || "",
                    language: "ja",
                    country: "اليابان",
                    runtime: anime.duration || "",
                    episodes: anime.episodes || "",
                    season: anime.season || "",
                    yearSeason: anime.year || "",
                    trailer: anime.trailer?.url || "",
                    sourceUrl: anime.url || ""
                });
            }
        } catch (error) {
            console.warn("JIKAN SOURCE ERROR:", error.message);
        }
    }

    if (results.length) state.sources.jikan = true;
    return results;
}

async function fetchAniList() {
    if (!CONFIG.PUBLIC_SOURCES.ANILIST) return [];

    const query = `
        query {
            Page(page: 1, perPage: 50) {
                media(type: ANIME, sort: POPULARITY_DESC) {
                    id idMal
                    title { romaji english native }
                    description
                    coverImage { large extraLarge }
                    bannerImage
                    startDate { year month day }
                    averageScore popularity episodes duration status genres countryOfOrigin season seasonYear
                    trailer { id site }
                    siteUrl
                }
            }
        }
    `;

    try {
        const data = await fetchJSON("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });

        const media = data?.data?.Page?.media;
        if (!Array.isArray(media)) return [];

        const results = media.map(anime => {
            const title = anime.title?.english || anime.title?.romaji || anime.title?.native || "";
            if (!title) return null;

            let trailer = "";
            if (anime.trailer?.site === "youtube" && anime.trailer?.id) {
                trailer = `https://www.youtube.com/watch?v=${anime.trailer.id}`;
            }

            return {
                id: `anilist:${anime.id}`,
                anilistId: anime.id,
                malId: anime.idMal || null,
                source: "anilist",
                type: "anime",
                title: cleanText(title),
                originalTitle: cleanText(anime.title?.native || anime.title?.romaji || title),
                englishTitle: cleanText(anime.title?.english || ""),
                overview: cleanText(anime.description || ""),
                poster: anime.coverImage?.extraLarge || anime.coverImage?.large || "",
                backdrop: anime.bannerImage || "",
                releaseDate: buildDate(anime.startDate),
                year: anime.startDate?.year || "",
                rating: number(anime.averageScore) / 10,
                votes: anime.popularity || 0,
                popularity: anime.popularity || 0,
                genres: Array.isArray(anime.genres) ? anime.genres : [],
                status: anime.status || "",
                language: "ja",
                country: anime.countryOfOrigin || "اليابان",
                runtime: anime.duration ? `${anime.duration} دقيقة` : "",
                episodes: anime.episodes || "",
                season: anime.season || "",
                yearSeason: anime.seasonYear || "",
                trailer,
                sourceUrl: anime.siteUrl || ""
            };
        }).filter(Boolean);

        if (results.length) state.sources.anilist = true;
        return results;
    } catch (error) {
        console.warn("ANILIST SOURCE ERROR:", error.message);
        return [];
    }
}

async function loadAll() {
    state.loading = true;

    const [local, tvmaze, jikan, anilist] = await Promise.allSettled([
        fetchLocalLibrary(),
        fetchTVMaze(),
        fetchJikan(),
        fetchAniList()
    ]);

    const values = [local, tvmaze, jikan, anilist]
        .map(result => result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [])
        .flat();

    state.all = deduplicateItems(values).slice(0, 5000);
    state.movies = state.all.filter(item => item.type === "movie");
    state.series = state.all.filter(item => item.type === "series");
    state.anime = state.all.filter(item => item.type === "anime");
    state.popular = [...state.all]
        .sort((a, b) => (number(b.popularity) || number(b.rating)) - (number(a.popularity) || number(a.rating)))
        .slice(0, 24);

    renderAll();
    state.loading = false;
}

async function loadStatus() {
    try {
        const data = await fetchJSON(`${API_BASE}/status`);
        if (statusText) {
            statusText.textContent = data?.success
                ? `المكتبة متصلة • ${number(data.total).toLocaleString("ar-IQ")} عمل`
                : "المكتبة متصلة";
        }
        if (lastUpdate) lastUpdate.textContent = data?.lastUpdate || "—";

        if (movieCount) movieCount.textContent = number(data?.movies).toLocaleString("ar-IQ");
        if (seriesCount) seriesCount.textContent = number(data?.series).toLocaleString("ar-IQ");
        if (animeCount) animeCount.textContent = number(data?.anime).toLocaleString("ar-IQ");
    } catch {
        if (statusText) statusText.textContent = "المكتبة تعمل من المصادر المتاحة";
    }
}

function setLoading(element, count = 6) {
    if (!element) return;
    element.innerHTML = Array.from({ length: count }, () => `
        <div class="loading-card">
            <div class="loading-poster"></div>
            <div class="loading-lines"><span></span><span></span></div>
        </div>
    `).join("");
}

function showEmpty(grid, empty, message) {
    if (grid) grid.innerHTML = "";
    if (!empty) return;
    empty.hidden = false;
    const title = empty.querySelector("h3");
    if (title) title.textContent = message;
}

function createWatchUrl(id) {
    const value = String(id || "").trim();
    return value ? `/watch.html?id=${encodeURIComponent(value)}` : null;
}

function openWatch(item) {
    const url = createWatchUrl(item?.id);
    if (!url) {
        showToast("تعذر فتح صفحة العمل");
        return;
    }

    window.location.assign(url);
}

function createCard(item) {
    const poster = getPoster(item);
    const genres = getGenres(item).slice(0, 3);
    const type = getTypeName(item.type);

    return `
        <article class="content-card" data-id="${escapeHtml(item.id)}" tabindex="0" role="link" aria-label="فتح ${escapeHtml(item.title)}">
            <div class="card-poster">
                ${poster ? `
                    <img src="${escapeHtml(poster)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.style.display='none'">
                ` : `
                    <div style="width:100%;height:100%;display:grid;place-items:center;color:#d6a84f;font-size:35px">IE</div>
                `}
                <span class="card-rating">★ ${escapeHtml(formatRating(item.rating))}</span>
                <span class="card-type">${escapeHtml(type)}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <div class="card-meta">
                    <span>${escapeHtml(getYear(item))}</span>
                    ${item.runtime ? `<span>${escapeHtml(item.runtime)}</span>` : ""}
                    ${item.episodes ? `<span>${escapeHtml(item.episodes)} حلقة</span>` : ""}
                </div>
                ${genres.length ? `<div class="card-genres">${genres.map(genre => `<span class="card-genre">${escapeHtml(genre)}</span>`).join("")}</div>` : ""}
            </div>
        </article>
    `;
}

function renderPopular() {
    if (!popularGrid) return;
    if (!state.popular.length) {
        setLoading(popularGrid, 6);
        return;
    }
    popularGrid.innerHTML = state.popular.map(createCard).join("");
}

function renderMovies() {
    if (!movieGrid) return;

    let items = [...state.movies];
    if (state.movieCategory !== "all") {
        items = items.filter(item => getGenres(item).some(genre => normalizeTitle(genre).includes(normalizeTitle(state.movieCategory))));
    }

    if (state.movieSort === "rating") {
        items.sort((a, b) => number(b.rating) - number(a.rating));
    } else if (state.movieSort === "new") {
        items.sort((a, b) => String(b.releaseDate || b.year).localeCompare(String(a.releaseDate || a.year)));
    } else {
        items.sort((a, b) => (number(b.popularity) || number(b.rating)) - (number(a.popularity) || number(a.rating)));
    }

    if (!items.length) {
        showEmpty(movieGrid, emptyState, "لم نجد أفلاماً مطابقة");
        return;
    }

    if (emptyState) emptyState.hidden = true;
    movieGrid.innerHTML = items.slice(0, state.movieLimit).map(createCard).join("");
}

function renderSeries() {
    if (!seriesGrid) return;

    let items = [...state.series];
    if (state.seriesFilter === "popular") {
        items.sort((a, b) => number(b.popularity) - number(a.popularity));
    } else if (state.seriesFilter === "rating") {
        items.sort((a, b) => number(b.rating) - number(a.rating));
    }

    if (!items.length) {
        showEmpty(seriesGrid, seriesEmptyState, "لا توجد مسلسلات حالياً");
        return;
    }

    if (seriesEmptyState) seriesEmptyState.hidden = true;
    seriesGrid.innerHTML = items.slice(0, CONFIG.SERIES_LIMIT).map(createCard).join("");
}

function renderAnime() {
    if (!animeGrid) return;

    let items = [...state.anime];
    if (state.animeFilter === "airing") {
        items = items.filter(item => {
            const status = String(item.status || "").toLowerCase();
            return status.includes("airing") || status.includes("currently") || status.includes("يعرض");
        });
    } else if (state.animeFilter === "rating") {
        items.sort((a, b) => number(b.rating) - number(a.rating));
    }

    if (!items.length) {
        showEmpty(animeGrid, animeEmptyState, "لا يوجد أنمي مطابق حالياً");
        return;
    }

    if (animeEmptyState) animeEmptyState.hidden = true;
    animeGrid.innerHTML = items.slice(0, CONFIG.ANIME_LIMIT).map(createCard).join("");
}

function renderAll() {
    renderPopular();
    renderMovies();
    renderSeries();
    renderAnime();
}

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function findItemById(id) {
    return state.all.find(item => String(item.id) === String(id));
}

function setupNavigation() {
    $$(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            $$(".nav-link").forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });

    const sections = ["#home", "#movies", "#series", "#anime", "#popular", "#categories"]
        .map(selector => document.querySelector(selector))
        .filter(Boolean);

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const id = entry.target.id;
            $$(".nav-link").forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${id}`));
        }
    }, { threshold: 0.35 });

    sections.forEach(section => observer.observe(section));
}

function setupMovieFilters() {
    $$("#movieFilters .filter").forEach(button => {
        button.addEventListener("click", () => {
            $$("#movieFilters .filter").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            state.movieCategory = button.dataset.category || "all";
            state.movieLimit = CONFIG.MOVIE_LIMIT;
            renderMovies();
        });
    });

    const select = $("#movieSortSelect");
    if (select) {
        select.addEventListener("change", () => {
            state.movieSort = select.value;
            state.movieLimit = CONFIG.MOVIE_LIMIT;
            renderMovies();
        });
    }

    if (loadMore) {
        loadMore.addEventListener("click", () => {
            state.movieLimit += CONFIG.MOVIE_LIMIT;
            renderMovies();
        });
    }
}

function setupSeriesFilters() {
    $$("#seriesFilters .content-tab").forEach(button => {
        button.addEventListener("click", () => {
            $$("#seriesFilters .content-tab").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            state.seriesFilter = button.dataset.seriesFilter || "all";
            renderSeries();
        });
    });
}

function setupAnimeFilters() {
    $$("#animeFilters .content-tab").forEach(button => {
        button.addEventListener("click", () => {
            $$("#animeFilters .content-tab").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            state.animeFilter = button.dataset.animeFilter || "all";
            renderAnime();
        });
    });
}

function setupCategories() {
    $$(".category-card").forEach(button => {
        button.addEventListener("click", () => {
            const category = button.dataset.category;
            if (!category) return;

            state.movieCategory = category;
            state.movieLimit = CONFIG.MOVIE_LIMIT;
            $$("#movieFilters .filter").forEach(filter => filter.classList.toggle("active", filter.dataset.category === category));
            location.hash = "movies";
            renderMovies();
        });
    });
}

function setupWatchNavigation() {
    document.addEventListener("click", event => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;

        const card = target.closest(".content-card, .search-result");
        if (!card) return;
        if (target.closest("a, button, input, select, textarea")) return;

        const item = findItemById(card.dataset.id);
        if (!item) return;

        event.preventDefault();
        openWatch(item);
    }, true);

    document.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const target = event.target instanceof Element ? event.target : null;
        const card = target?.closest(".content-card");
        if (!card) return;

        const item = findItemById(card.dataset.id);
        if (!item) return;
        event.preventDefault();
        openWatch(item);
    });
}

function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => searchInput?.focus(), 100);
}

function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.hidden = true;
    document.body.style.overflow = "";
}

async function performSearch(query) {
    const text = cleanText(query);
    if (!searchResults) return;

    if (!text) {
        searchResults.innerHTML = "";
        return;
    }

    searchResults.innerHTML = `<div class="search-empty">جاري البحث...</div>`;

    try {
        const normalized = normalizeTitle(text);
        let items = state.all.filter(item => [item.title, item.originalTitle, item.englishTitle, item.overview]
            .filter(Boolean)
            .map(normalizeTitle)
            .some(value => value.includes(normalized)));

        if (!items.length) {
            const type = state.searchType === "all" ? "" : `&type=${encodeURIComponent(state.searchType)}`;
            const data = await fetchJSON(`${API_BASE}/movies?search=${encodeURIComponent(text)}&sort=popular${type}`);
            items = deduplicateItems(data?.movies || []);
        }

        if (state.searchType !== "all") items = items.filter(item => item.type === state.searchType);
        renderSearchResults(items.slice(0, CONFIG.SEARCH_LIMIT));
    } catch (error) {
        console.warn("SEARCH ERROR:", error.message);
        searchResults.innerHTML = `<div class="search-empty">تعذر تنفيذ البحث حالياً.</div>`;
    }
}

function renderSearchResults(items) {
    if (!searchResults) return;

    if (!items.length) {
        searchResults.innerHTML = `<div class="search-empty">لم نجد نتيجة مطابقة.</div>`;
        return;
    }

    searchResults.innerHTML = items.map(item => {
        const poster = getPoster(item);
        return `
            <div class="search-result" data-id="${escapeHtml(item.id)}" role="link" tabindex="0">
                ${poster
                    ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(item.title)}" loading="lazy">`
                    : `<div style="width:48px;height:65px;display:grid;place-items:center;border-radius:7px;background:#151515;color:#d6a84f">IE</div>`}
                <div class="search-result-info">
                    <div class="search-result-title">${escapeHtml(item.title)}</div>
                    <div class="search-result-meta">${escapeHtml(getTypeName(item.type))} • ${escapeHtml(getYear(item))} • ★ ${escapeHtml(formatRating(item.rating))}</div>
                </div>
            </div>
        `;
    }).join("");
}

function setupSearch() {
    $("#openSearch")?.addEventListener("click", openSearch);
    $("#heroSearch")?.addEventListener("click", openSearch);
    $("#closeSearch")?.addEventListener("click", closeSearch);

    searchOverlay?.addEventListener("click", event => {
        if (event.target === searchOverlay) closeSearch();
    });

    searchInput?.addEventListener("input", () => {
        clearTimeout(state.searchTimer);
        state.searchTimer = setTimeout(() => performSearch(searchInput.value), 300);
    });

    $$(".search-type").forEach(button => {
        button.addEventListener("click", () => {
            $$(".search-type").forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            state.searchType = button.dataset.searchType || "all";
            if (searchInput?.value.trim()) performSearch(searchInput.value);
        });
    });
}

function setupKeyboard() {
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeSearch();
    });
}

function setupBranding() {
    document.title = "IRAQ EMPIRE CINEMA | عراق إمباير سينما";
}

async function init() {
    setupBranding();

    setLoading(popularGrid, 6);
    setLoading(movieGrid, 8);
    setLoading(seriesGrid, 6);
    setLoading(animeGrid, 6);

    setupNavigation();
    setupMovieFilters();
    setupSeriesFilters();
    setupAnimeFilters();
    setupCategories();
    setupWatchNavigation();
    setupSearch();
    setupKeyboard();

    await Promise.allSettled([
        loadStatus(),
        loadAll()
    ]);

    console.log("IRAQ EMPIRE CINEMA → READY / WATCH SYSTEM CONNECTED");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
