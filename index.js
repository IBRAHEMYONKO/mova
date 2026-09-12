"use strict";

/* =========================================================
   IRAQ EMPIRE CINEMA
   MULTI SOURCE FRONTEND ENGINE
   ---------------------------------------------------------
   - يجمع البيانات من API الموقع
   - يدعم مصادر إضافية عامة
   - إزالة التكرار
   - فلترة المحتوى غير العربي
   - أفلام + مسلسلات + أنمي
   - بحث
   - تصنيفات
   - مودال
   - بدون Discord Token
========================================================= */

const API_BASE = "/api";

const CONFIG = {
    MAX_DIRECT_SOURCE_ITEMS: 80,
    MAX_FINAL_ITEMS: 5000,
    SEARCH_LIMIT: 40,
    MOVIE_LIMIT: 24,
    SERIES_LIMIT: 24,
    ANIME_LIMIT: 24,

    // إذا كان true فلن يظهر العمل إذا لم تتوفر له
    // معلومات عربية كافية.
    REQUIRE_ARABIC_METADATA: true,

    // مصادر عامة لا تحتاج API Key.
    PUBLIC_SOURCES: {
        TVMAZE: true,
        JIKAN: true,
        ANILIST: true
    }
};


/* =========================================================
   STATE
========================================================= */

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

    currentItem: null,

    movieLimit: CONFIG.MOVIE_LIMIT,

    loading: false,

    sources: {
        local: false,
        tvmaze: false,
        jikan: false,
        anilist: false
    }

};


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    Array.from(
        document.querySelectorAll(selector)
    );


/* =========================================================
   ELEMENTS
========================================================= */

const movieGrid = $("#movieGrid");
const seriesGrid = $("#seriesGrid");
const animeGrid = $("#animeGrid");
const popularGrid = $("#popularGrid");

const movieCount = $("#movieCount");
const seriesCount = $("#seriesCount");
const animeCount = $("#animeCount");

const statusText = $("#statusText");
const toast = $("#toast");

const searchOverlay = $("#searchOverlay");
const searchInput = $("#searchInput");
const searchResults = $("#searchResults");

const movieModal = $("#movieModal");
const modalTitle = $("#modalTitle");
const modalPoster = $("#modalPoster");
const modalBackdrop = $("#modalBackdrop");
const modalOverview = $("#modalOverview");
const modalMeta = $("#modalMeta");
const modalGenres = $("#modalGenres");
const modalType = $("#modalType");
const modalExtra = $("#modalExtra");
const modalWatch = $("#modalWatch");

const emptyState = $("#emptyState");
const seriesEmptyState = $("#seriesEmptyState");
const animeEmptyState = $("#animeEmptyState");

const loadMore = $("#loadMore");


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   NUMBER
========================================================= */

function number(value) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : 0;

}


function formatNumber(value) {

    const n = number(value);

    if (!n) {
        return "—";
    }

    return n.toLocaleString("ar-IQ");

}


function formatRating(value) {

    const n = number(value);

    if (!n) {
        return "—";
    }

    return n.toFixed(1);

}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value) {
        return "غير معروف";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(
        "ar-IQ",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

}


/* =========================================================
   YEAR
========================================================= */

function getYear(item) {

    if (item?.year) {
        return String(item.year);
    }

    if (item?.releaseDate) {
        return String(
            item.releaseDate
        ).slice(0, 4);
    }

    return "—";

}


/* =========================================================
   TYPE
========================================================= */

function getTypeName(type) {

    switch (String(type || "").toLowerCase()) {

        case "movie":
            return "فيلم";

        case "series":
            return "مسلسل";

        case "anime":
            return "أنمي";

        default:
            return "محتوى";

    }

}


/* =========================================================
   POSTER
========================================================= */

function getPoster(item) {

    return (
        item?.poster ||
        item?.image ||
        item?.images?.jpg?.large_image_url ||
        item?.images?.jpg?.image_url ||
        item?.coverImage?.large ||
        ""
    );

}


/* =========================================================
   BACKDROP
========================================================= */

function getBackdrop(item) {

    return (
        item?.backdrop ||
        item?.banner ||
        item?.images?.jpg?.large_image_url ||
        item?.coverImage?.extraLarge ||
        ""
    );

}


/* =========================================================
   GENRES
========================================================= */

function getGenres(item) {

    if (
        Array.isArray(item?.genres)
    ) {

        return item.genres
            .filter(Boolean)
            .map(value => {

                if (
                    typeof value === "object"
                ) {
                    return (
                        value.name ||
                        value.title ||
                        ""
                    );
                }

                return String(value);

            })
            .filter(Boolean)
            .slice(0, 5);

    }

    return [];

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(
        showToast.timer
    );

    showToast.timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
    element,
    count = 8
) {

    if (!element) {
        return;
    }

    element.innerHTML =
        Array.from(
            { length: count },
            () => `
                <div class="loading-card">
                    <div class="loading-poster"></div>

                    <div class="loading-lines">
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `
        ).join("");

}


/* =========================================================
   API FETCH
========================================================= */

async function fetchJSON(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                ...options,
                headers: {
                    Accept:
                        "application/json",
                    ...(options.headers || {})
                },
                cache: "no-store"
            }
        );

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }

    return response.json();

}


/* =========================================================
   LOCAL API
========================================================= */

async function fetchLocalLibrary() {

    const data =
        await fetchJSON(
            `${API_BASE}/movies?sort=popular`
        );

    if (
        !data ||
        !Array.isArray(
            data.movies
        )
    ) {

        throw new Error(
            "Invalid local library"
        );

    }

    state.sources.local = true;

    return data.movies;

}


/* =========================================================
   TVMAZE
   Public API
========================================================= */

async function fetchTVMaze() {

    if (!CONFIG.PUBLIC_SOURCES.TVMAZE) {
        return [];
    }

    const results = [];

    const pages = [0, 1];

    for (const page of pages) {

        try {

            const data =
                await fetchJSON(
                    `https://api.tvmaze.com/shows?page=${page}`
                );

            if (!Array.isArray(data)) {
                continue;
            }

            for (const show of data) {

                const title =
                    show.name ||
                    show.originalName;

                if (!title) {
                    continue;
                }

                const genres =
                    Array.isArray(
                        show.genres
                    )
                        ? show.genres
                        : [];

                const premiered =
                    show.premiered ||
                    "";

                const year =
                    premiered
                        ? String(
                            premiered
                        ).slice(0, 4)
                        : "";

                const rating =
                    show.rating?.average ||
                    0;

                results.push({

                    id:
                        `tvmaze:${show.id}`,

                    tvmazeId:
                        show.id,

                    source:
                        "tvmaze",

                    type:
                        "series",

                    title:
                        cleanText(
                            title
                        ),

                    originalTitle:
                        cleanText(
                            title
                        ),

                    overview:
                        stripHtml(
                            show.summary ||
                            ""
                        ),

                    poster:
                        show.image?.original ||
                        show.image?.medium ||
                        "",

                    backdrop:
                        show.image?.original ||
                        "",

                    releaseDate:
                        premiered,

                    year,

                    rating,

                    votes:
                        show.rating?.average
                            ? 1
                            : 0,

                    popularity:
                        rating * 10,

                    genres,

                    status:
                        show.status ||
                        "",

                    language:
                        show.language ||
                        "",

                    country:
                        show.network?.country?.name ||
                        "",

                    runtime:
                        show.runtime
                            ? `${show.runtime} دقيقة`
                            : "",

                    episodes:
                        "",

                    season:
                        "",

                    trailer:
                        "",

                    sourceUrl:
                        show.url ||
                        "",

                    network:
                        show.network?.name ||
                        show.webChannel?.name ||
                        "",

                    production:
                        show.network?.name ||
                        "",

                    updatedAt:
                        new Date().toISOString()

                });

            }

        } catch (error) {

            console.warn(
                "TVMAZE SOURCE ERROR:",
                error.message
            );

        }

    }

    if (results.length) {
        state.sources.tvmaze = true;
    }

    return results;

}


/* =========================================================
   JIKAN
   MyAnimeList public API
========================================================= */

async function fetchJikan() {

    if (!CONFIG.PUBLIC_SOURCES.JIKAN) {
        return [];
    }

    const results = [];

    const endpoints = [
        "https://api.jikan.moe/v4/top/anime?limit=25",
        "https://api.jikan.moe/v4/anime?status=airing&limit=25",
        "https://api.jikan.moe/v4/anime?status=complete&limit=25"
    ];

    for (const endpoint of endpoints) {

        try {

            const data =
                await fetchJSON(
                    endpoint
                );

            if (
                !data ||
                !Array.isArray(
                    data.data
                )
            ) {
                continue;
            }

            for (const anime of data.data) {

                if (!anime?.mal_id) {
                    continue;
                }

                const title =
                    anime.title ||
                    anime.title_english ||
                    anime.title_japanese ||
                    "";

                if (!title) {
                    continue;
                }

                const genres =
                    Array.isArray(
                        anime.genres
                    )
                        ? anime.genres
                            .map(
                                item =>
                                    item.name
                            )
                            .filter(Boolean)
                        : [];

                const aired =
                    anime.aired?.from ||
                    "";

                const year =
                    aired
                        ? String(
                            aired
                        ).slice(0, 4)
                        : "";

                results.push({

                    id:
                        `mal:${anime.mal_id}`,

                    malId:
                        anime.mal_id,

                    source:
                        "jikan",

                    type:
                        "anime",

                    title:
                        cleanText(
                            title
                        ),

                    originalTitle:
                        cleanText(
                            anime.title_japanese ||
                            title
                        ),

                    englishTitle:
                        cleanText(
                            anime.title_english ||
                            ""
                        ),

                    overview:
                        cleanText(
                            anime.synopsis ||
                            ""
                        ),

                    poster:
                        anime.images?.jpg?.large_image_url ||
                        anime.images?.jpg?.image_url ||
                        "",

                    backdrop:
                        anime.images?.jpg?.large_image_url ||
                        "",

                    releaseDate:
                        aired,

                    year,

                    rating:
                        anime.score ||
                        0,

                    votes:
                        anime.scored_by ||
                        0,

                    popularity:
                        anime.popularity
                            ? Math.max(
                                0,
                                100000 -
                                anime.popularity
                            )
                            : 0,

                    genres,

                    status:
                        anime.status ||
                        "",

                    language:
                        "ja",

                    country:
                        "اليابان",

                    runtime:
                        anime.duration ||
                        "",

                    episodes:
                        anime.episodes ||
                        "",

                    season:
                        anime.season ||
                        "",

                    yearSeason:
                        anime.year ||
                        "",

                    trailer:
                        anime.trailer?.url ||
                        "",

                    sourceUrl:
                        anime.url ||
                        "",

                    production:
                        Array.isArray(
                            anime.studios
                        )
                            ? anime.studios
                                .map(
                                    studio =>
                                        studio.name
                                )
                                .filter(Boolean)
                            : [],

                    updatedAt:
                        new Date().toISOString()

                });

            }

        } catch (error) {

            console.warn(
                "JIKAN SOURCE ERROR:",
                error.message
            );

        }

    }

    if (results.length) {
        state.sources.jikan = true;
    }

    return results;

}


/* =========================================================
   ANILIST
   Public GraphQL API
========================================================= */

async function fetchAniList() {

    if (!CONFIG.PUBLIC_SOURCES.ANILIST) {
        return [];
    }

    const query = `
        query {
            Page(
                page: 1,
                perPage: 50
            ) {
                media(
                    type: ANIME,
                    sort: POPULARITY_DESC
                ) {
                    id
                    idMal
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    coverImage {
                        large
                        extraLarge
                    }
                    bannerImage
                    startDate {
                        year
                        month
                        day
                    }
                    averageScore
                    popularity
                    episodes
                    duration
                    status
                    genres
                    countryOfOrigin
                    season
                    seasonYear
                    trailer {
                        id
                        site
                    }
                    siteUrl
                }
            }
        }
    `;

    try {

        const data =
            await fetchJSON(
                "https://graphql.anilist.co",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            query
                        })
                }
            );

        const media =
            data?.data?.Page?.media;

        if (!Array.isArray(media)) {
            return [];
        }

        const results =
            media
                .map(anime => {

                    const title =
                        anime.title?.english ||
                        anime.title?.romaji ||
                        anime.title?.native ||
                        "";

                    if (!title) {
                        return null;
                    }

                    const releaseDate =
                        buildDate(
                            anime.startDate
                        );

                    let trailer = "";

                    if (
                        anime.trailer?.site ===
                        "youtube" &&
                        anime.trailer?.id
                    ) {

                        trailer =
                            `https://www.youtube.com/watch?v=${anime.trailer.id}`;

                    }

                    return {

                        id:
                            `anilist:${anime.id}`,

                        anilistId:
                            anime.id,

                        malId:
                            anime.idMal ||
                            null,

                        source:
                            "anilist",

                        type:
                            "anime",

                        title:
                            cleanText(
                                title
                            ),

                        originalTitle:
                            cleanText(
                                anime.title?.native ||
                                anime.title?.romaji ||
                                title
                            ),

                        englishTitle:
                            cleanText(
                                anime.title?.english ||
                                ""
                            ),

                        overview:
                            cleanText(
                                anime.description ||
                                ""
                            ),

                        poster:
                            anime.coverImage?.extraLarge ||
                            anime.coverImage?.large ||
                            "",

                        backdrop:
                            anime.bannerImage ||
                            "",

                        releaseDate,

                        year:
                            anime.startDate?.year ||
                            "",

                        rating:
                            number(
                                anime.averageScore
                            ) / 10,

                        votes:
                            anime.popularity ||
                            0,

                        popularity:
                            anime.popularity ||
                            0,

                        genres:
                            Array.isArray(
                                anime.genres
                            )
                                ? anime.genres
                                : [],

                        status:
                            anime.status ||
                            "",

                        language:
                            "ja",

                        country:
                            anime.countryOfOrigin ||
                            "اليابان",

                        runtime:
                            anime.duration
                                ? `${anime.duration} دقيقة`
                                : "",

                        episodes:
                            anime.episodes ||
                            "",

                        season:
                            anime.season ||
                            "",

                        yearSeason:
                            anime.seasonYear ||
                            "",

                        trailer,

                        sourceUrl:
                            anime.siteUrl ||
                            "",

                        updatedAt:
                            new Date().toISOString()

                    };

                })
                .filter(Boolean);

        if (results.length) {
            state.sources.anilist = true;
        }

        return results;

    } catch (error) {

        console.warn(
            "ANILIST SOURCE ERROR:",
            error.message
        );

        return [];

    }

}


/* =========================================================
   CLEAN TEXT
========================================================= */

function cleanText(value) {

    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();

}


function stripHtml(value) {

    return cleanText(
        String(value ?? "")
            .replace(
                /<[^>]*>/g,
                " "
            )
    );

}


/* =========================================================
   DATE BUILDER
========================================================= */

function buildDate(date) {

    if (!date) {
        return "";
    }

    if (!date.year) {
        return "";
    }

    const month =
        String(
            date.month || 1
        ).padStart(2, "0");

    const day =
        String(
            date.day || 1
        ).padStart(2, "0");

    return `${date.year}-${month}-${day}`;

}


/* =========================================================
   ARABIC DETECTION
========================================================= */

function containsArabic(value) {

    return /[\u0600-\u06FF]/.test(
        String(value || "")
    );

}


/* =========================================================
   ARABIC METADATA
   ---------------------------------------------------------
   مهم:
   هذا لا يعني وجود ترجمة فيديو.
   بل يعني أن بيانات العمل نفسها تحتوي
   على معلومات عربية.
========================================================= */

function hasArabicMetadata(item) {

    if (!CONFIG.REQUIRE_ARABIC_METADATA) {
        return true;
    }

    const fields = [

        item.title,

        item.originalTitle,

        item.englishTitle,

        item.overview,

        ...(Array.isArray(item.genres)
            ? item.genres
            : [])

    ];

    const arabicText =
        fields.some(
            value =>
                containsArabic(value)
        );

    const language =
        String(
            item.language ||
            ""
        ).toLowerCase();

    const explicitArabic =
        [
            "ar",
            "ara",
            "arabic",
            "العربية",
            "عربي"
        ].includes(language);

    return (
        arabicText ||
        explicitArabic
    );

}


/* =========================================================
   NORMALIZE ITEM
========================================================= */

function normalizeItem(item) {

    if (!item) {
        return null;
    }

    const type =
        String(
            item.type ||
            ""
        ).toLowerCase();

    let finalType = type;

    if (
        type !== "movie" &&
        type !== "series" &&
        type !== "anime"
    ) {
        return null;
    }

    const genres =
        getGenres(item);

    const normalized = {

        ...item,

        id:
            item.id ||
            createFallbackId(item),

        type:
            finalType,

        title:
            cleanText(
                item.title ||
                item.originalTitle ||
                item.englishTitle ||
                "بدون عنوان"
            ),

        originalTitle:
            cleanText(
                item.originalTitle ||
                ""
            ),

        englishTitle:
            cleanText(
                item.englishTitle ||
                ""
            ),

        overview:
            cleanText(
                item.overview ||
                ""
            ),

        poster:
            getPoster(item),

        backdrop:
            getBackdrop(item),

        year:
            getYear(item),

        rating:
            number(item.rating),

        popularity:
            number(item.popularity),

        votes:
            number(item.votes),

        genres,

        source:
            item.source ||
            "unknown"

    };

    return normalized;

}


/* =========================================================
   FALLBACK ID
========================================================= */

function createFallbackId(item) {

    const title =
        cleanText(
            item.title ||
            item.originalTitle ||
            ""
        )
            .toLowerCase();

    const year =
        getYear(item);

    const type =
        item.type ||
        "content";

    return `${type}:${title}:${year}`;

}


/* =========================================================
   DEDUPLICATION KEY
========================================================= */

function getStrongKeys(item) {

    const keys = [];

    if (item.tmdbId) {
        keys.push(
            `tmdb:${item.tmdbId}`
        );
    }

    if (item.imdbId) {
        keys.push(
            `imdb:${item.imdbId}`
        );
    }

    if (item.tvmazeId) {
        keys.push(
            `tvmaze:${item.tvmazeId}`
        );
    }

    if (item.malId) {
        keys.push(
            `mal:${item.malId}`
        );
    }

    if (item.anilistId) {
        keys.push(
            `anilist:${item.anilistId}`
        );
    }

    return keys;

}


function normalizeTitle(title) {

    return cleanText(title)
        .toLowerCase()
        .replace(
            /[^\p{L}\p{N}]+/gu,
            ""
        );

}


/* =========================================================
   DUPLICATE CHECK
========================================================= */

function areSameItems(a, b) {

    if (!a || !b) {
        return false;
    }

    if (
        a.type !==
        b.type
    ) {
        return false;
    }

    const aKeys =
        getStrongKeys(a);

    const bKeys =
        getStrongKeys(b);

    for (const key of aKeys) {

        if (bKeys.includes(key)) {
            return true;
        }

    }

    const aTitles = [

        normalizeTitle(
            a.title
        ),

        normalizeTitle(
            a.originalTitle
        ),

        normalizeTitle(
            a.englishTitle
        )

    ].filter(Boolean);

    const bTitles = [

        normalizeTitle(
            b.title
        ),

        normalizeTitle(
            b.originalTitle
        ),

        normalizeTitle(
            b.englishTitle
        )

    ].filter(Boolean);

    const sameTitle =
        aTitles.some(
            title =>
                bTitles.includes(
                    title
                )
        );

    if (!sameTitle) {
        return false;
    }

    const yearA =
        Number(
            getYear(a)
        );

    const yearB =
        Number(
            getYear(b)
        );

    if (
        yearA &&
        yearB
    ) {

        return Math.abs(
            yearA - yearB
        ) <= 1;

    }

    return true;

}


/* =========================================================
   MERGE TWO ITEMS
   الأفضلية للمعلومات الأغنى
========================================================= */

function mergeItems(
    oldItem,
    newItem
) {

    const merged = {
        ...oldItem
    };

    const fields = [

        "tmdbId",
        "tvmazeId",
        "malId",
        "anilistId",
        "imdbId",

        "title",
        "originalTitle",
        "englishTitle",

        "overview",

        "poster",
        "backdrop",

        "releaseDate",
        "year",

        "rating",
        "votes",
        "popularity",

        "status",
        "language",
        "country",
        "runtime",

        "episodes",
        "season",
        "yearSeason",

        "sourceUrl",
        "trailer",

        "director",
        "writer",
        "production",
        "network"

    ];

    for (const field of fields) {

        const oldValue =
            merged[field];

        const newValue =
            newItem[field];

        if (
            isBetterValue(
                oldValue,
                newValue
            )
        ) {

            merged[field] =
                newValue;

        }

    }


    const genres = [
        ...getGenres(oldItem),
        ...getGenres(newItem)
    ];

    merged.genres =
        Array.from(
            new Set(
                genres
                    .filter(Boolean)
                    .map(
                        value =>
                            String(value)
                                .trim()
                    )
            )
        ).slice(0, 8);


    if (
        !merged.source &&
        newItem.source
    ) {

        merged.source =
            newItem.source;

    }


    merged.sources =
        Array.from(
            new Set(
                [
                    ...(Array.isArray(
                        oldItem.sources
                    )
                        ? oldItem.sources
                        : [
                            oldItem.source
                        ]),

                    ...(Array.isArray(
                        newItem.sources
                    )
                        ? newItem.sources
                        : [
                            newItem.source
                        ])
                ]
                    .filter(Boolean)
            )
        );


    return merged;

}


function isBetterValue(
    oldValue,
    newValue
) {

    if (
        newValue === undefined ||
        newValue === null ||
        newValue === ""
    ) {
        return false;
    }

    if (
        oldValue === undefined ||
        oldValue === null ||
        oldValue === ""
    ) {
        return true;
    }

    if (
        Array.isArray(newValue)
    ) {

        return (
            newValue.length >
            (
                Array.isArray(
                    oldValue
                )
                    ? oldValue.length
                    : 0
            )
        );

    }

    if (
        typeof newValue === "string"
    ) {

        return (
            newValue.length >
            String(
                oldValue
            ).length
        );

    }

    return false;

}


/* =========================================================
   DEDUPLICATE ALL
========================================================= */

function deduplicateItems(
    items
) {

    const finalItems = [];

    for (const raw of items) {

        const item =
            normalizeItem(raw);

        if (!item) {
            continue;
        }

        // المحتوى الذي لا توجد له بيانات عربية
        // لن يدخل للمكتبة النهائية.
        if (
            !hasArabicMetadata(
                item
            )
        ) {
            continue;
        }

        let duplicateIndex = -1;

        for (
            let index = 0;
            index < finalItems.length;
            index++
        ) {

            if (
                areSameItems(
                    finalItems[index],
                    item
                )
            ) {

                duplicateIndex =
                    index;

                break;

            }

        }

        if (
            duplicateIndex === -1
        ) {

            finalItems.push(
                item
            );

        } else {

            finalItems[
                duplicateIndex
            ] =
                mergeItems(
                    finalItems[
                        duplicateIndex
                    ],
                    item
                );

        }

        if (
            finalItems.length >=
            CONFIG.MAX_FINAL_ITEMS
        ) {
            break;
        }

    }

    return finalItems;

}


/* =========================================================
   SORT POPULAR
========================================================= */

function sortPopular(
    items
) {

    return [...items]
        .sort(
            (a, b) => {

                const popularityA =
                    number(
                        a.popularity
                    );

                const popularityB =
                    number(
                        b.popularity
                    );

                const ratingA =
                    number(
                        a.rating
                    );

                const ratingB =
                    number(
                        b.rating
                    );

                return (
                    popularityB * 0.7 +
                    ratingB * 30
                ) -
                (
                    popularityA * 0.7 +
                    ratingA * 30
                );

            }
        );

}


/* =========================================================
   LOAD STATUS
========================================================= */

async function loadStatus() {

    try {

        const data =
            await fetchJSON(
                `${API_BASE}/status`
            );

        if (
            movieCount
        ) {

            movieCount.textContent =
                formatNumber(
                    data.movies
                );

        }

        if (
            seriesCount
        ) {

            seriesCount.textContent =
                formatNumber(
                    data.series
                );

        }

        if (
            animeCount
        ) {

            animeCount.textContent =
                formatNumber(
                    data.anime
                );

        }

        const updates =
            document.querySelectorAll(
                '[id="lastUpdate"]'
            );

        updates.forEach(
            element => {

                element.textContent =
                    data.lastUpdate
                        ? formatDate(
                            data.lastUpdate
                        )
                        : "—";

            }
        );

    } catch (error) {

        console.warn(
            "STATUS ERROR:",
            error.message
        );

    }

}


/* =========================================================
   LOAD ALL SOURCES
========================================================= */

async function loadAll() {

    if (state.loading) {
        return;
    }

    state.loading = true;

    try {

        const sourceResults =
            await Promise.allSettled([

                fetchLocalLibrary(),

                fetchTVMaze(),

                fetchJikan(),

                fetchAniList()

            ]);


        const allRaw = [];


        for (
            const result of
            sourceResults
        ) {

            if (
                result.status ===
                "fulfilled" &&
                Array.isArray(
                    result.value
                )
            ) {

                allRaw.push(
                    ...result.value
                );

            }

        }


        if (!allRaw.length) {

            throw new Error(
                "No content sources returned data"
            );

        }


        state.all =
            deduplicateItems(
                allRaw
            );


        state.movies =
            state.all.filter(
                item =>
                    item.type ===
                    "movie"
            );


        state.series =
            state.all.filter(
                item =>
                    item.type ===
                    "series"
            );


        state.anime =
            state.all.filter(
                item =>
                    item.type ===
                    "anime"
            );


        state.popular =
            sortPopular(
                state.all
            ).slice(
                0,
                12
            );


        renderPopular();
        renderMovies();
        renderSeries();
        renderAnime();

        updateCounters();

        updateSourceStatus();


    } catch (error) {

        console.error(
            "LIBRARY ERROR:",
            error
        );

        showToast(
            "تعذر تحميل مكتبة المحتوى"
        );

        showEmpty(
            movieGrid,
            emptyState,
            "تعذر تحميل الأفلام"
        );

        showEmpty(
            seriesGrid,
            seriesEmptyState,
            "تعذر تحميل المسلسلات"
        );

        showEmpty(
            animeGrid,
            animeEmptyState,
            "تعذر تحميل الأنمي"
        );

    } finally {

        state.loading = false;

    }

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    if (movieCount) {

        movieCount.textContent =
            formatNumber(
                state.movies.length
            );

    }

    if (seriesCount) {

        seriesCount.textContent =
            formatNumber(
                state.series.length
            );

    }

    if (animeCount) {

        animeCount.textContent =
            formatNumber(
                state.anime.length
            );

    }

    if (statusText) {

        statusText.textContent =
            `المكتبة تحتوي على ${formatNumber(
                state.all.length
            )} عمل عربي`;

    }

}


/* =========================================================
   SOURCE STATUS
========================================================= */

function updateSourceStatus() {

    console.log(
        "IRAQ EMPIRE CINEMA → SOURCES",
        {
            local: state.sources.local,
            tvmaze: state.sources.tvmaze,
            jikan: state.sources.jikan,
            anilist: state.sources.anilist
        }
    );

}


/* =========================================================
   MOVIE FILTER
========================================================= */

function getFilteredMovies() {

    let items =
        [...state.movies];


    if (
        state.movieCategory !==
        "all"
    ) {

        items =
            items.filter(
                item =>
                    getGenres(item)
                        .some(
                            genre =>
                                String(
                                    genre
                                )
                                    .toLowerCase()
                                    .includes(
                                        String(
                                            state.movieCategory
                                        )
                                            .toLowerCase()
                                    )
                        )
            );

    }


    switch (
        state.movieSort
    ) {

        case "rating":

            items.sort(
                (a, b) =>
                    number(
                        b.rating
                    ) -
                    number(
                        a.rating
                    )
            );

            break;


        case "new":

            items.sort(
                (a, b) =>
                    String(
                        b.releaseDate ||
                        ""
                    ).localeCompare(
                        String(
                            a.releaseDate ||
                            ""
                        )
                    )
            );

            break;


        default:

            items =
                sortPopular(
                    items
                );

            break;

    }


    return items;

}


/* =========================================================
   RENDER MOVIES
========================================================= */

function renderMovies() {

    if (!movieGrid) {
        return;
    }

    const items =
        getFilteredMovies();


    if (!items.length) {

        showEmpty(
            movieGrid,
            emptyState,
            "لا توجد أفلام عربية حالياً"
        );

        if (loadMore) {
            loadMore.hidden = true;
        }

        return;

    }


    if (emptyState) {
        emptyState.hidden = true;
    }


    const visible =
        items.slice(
            0,
            state.movieLimit
        );


    movieGrid.innerHTML =
        visible
            .map(createCard)
            .join("");


    if (loadMore) {

        loadMore.hidden =
            visible.length >=
            items.length;

    }

}


/* =========================================================
   RENDER SERIES
========================================================= */

function renderSeries() {

    if (!seriesGrid) {
        return;
    }

    let items =
        [...state.series];


    if (
        state.seriesFilter ===
        "rating"
    ) {

        items.sort(
            (a, b) =>
                number(
                    b.rating
                ) -
                number(
                    a.rating
                )
        );

    } else {

        items =
            sortPopular(
                items
            );

    }


    if (!items.length) {

        showEmpty(
            seriesGrid,
            seriesEmptyState,
            "لا توجد مسلسلات عربية حالياً"
        );

        return;

    }


    if (seriesEmptyState) {
        seriesEmptyState.hidden = true;
    }


    seriesGrid.innerHTML =
        items
            .slice(
                0,
                CONFIG.SERIES_LIMIT
            )
            .map(createCard)
            .join("");

}


/* =========================================================
   RENDER ANIME
========================================================= */

function renderAnime() {

    if (!animeGrid) {
        return;
    }

    let items =
        [...state.anime];


    if (
        state.animeFilter ===
        "airing"
    ) {

        items =
            items.filter(
                item =>
                    String(
                        item.status ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            "airing"
                        ) ||
                    String(
                        item.status ||
                        ""
                    )
                        .includes(
                            "يعرض"
                        )
            );

    }


    items.sort(
        (a, b) =>
            number(
                b.rating
            ) -
            number(
                a.rating
            )
    );


    if (!items.length) {

        showEmpty(
            animeGrid,
            animeEmptyState,
            "لا يوجد أنمي عربي البيانات حالياً"
        );

        return;

    }


    if (animeEmptyState) {
        animeEmptyState.hidden = true;
    }


    animeGrid.innerHTML =
        items
            .slice(
                0,
                CONFIG.ANIME_LIMIT
            )
            .map(createCard)
            .join("");

}


/* =========================================================
   POPULAR
========================================================= */

function renderPopular() {

    if (!popularGrid) {
        return;
    }

    if (!state.popular.length) {

        setLoading(
            popularGrid,
            6
        );

        return;

    }

    popularGrid.innerHTML =
        state.popular
            .map(createCard)
            .join("");

}


/* =========================================================
   CREATE CARD
========================================================= */

function createCard(item) {

    const poster =
        getPoster(item);

    const genres =
        getGenres(item);


    const genresHtml =
        genres
            .slice(0, 3)
            .map(
                genre => `
                    <span class="card-genre">
                        ${escapeHtml(
                            genre
                        )}
                    </span>
                `
            )
            .join("");


    return `
        <article
            class="content-card"
            data-id="${escapeHtml(
                item.id
            )}"
        >

            <div class="card-poster">

                ${
                    poster
                        ? `
                            <img
                                src="${escapeHtml(
                                    poster
                                )}"
                                alt="${escapeHtml(
                                    item.title
                                )}"
                                loading="lazy"
                                onerror="
                                    this.style.display='none'
                                "
                            >
                        `
                        : `
                            <div
                                style="
                                    width:100%;
                                    height:100%;
                                    display:grid;
                                    place-items:center;
                                    color:#d6a84f;
                                    font-size:35px;
                                "
                            >
                                IE
                            </div>
                        `
                }


                <span class="card-rating">
                    ★ ${escapeHtml(
                        formatRating(
                            item.rating
                        )
                    )}
                </span>


                <span class="card-type">
                    ${escapeHtml(
                        getTypeName(
                            item.type
                        )
                    )}
                </span>

            </div>


            <div class="card-body">

                <h3 class="card-title">
                    ${escapeHtml(
                        item.title
                    )}
                </h3>


                <div class="card-meta">

                    <span>
                        ${escapeHtml(
                            getYear(item)
                        )}
                    </span>


                    ${
                        item.runtime
                            ? `
                                <span>
                                    ${escapeHtml(
                                        item.runtime
                                    )}
                                </span>
                            `
                            : ""
                    }


                    ${
                        item.episodes
                            ? `
                                <span>
                                    ${escapeHtml(
                                        item.episodes
                                    )}
                                    حلقة
                                </span>
                            `
                            : ""
                    }

                </div>


                ${
                    genresHtml
                        ? `
                            <div class="card-genres">
                                ${genresHtml}
                            </div>
                        `
                        : ""
                }

            </div>

        </article>
    `;

}


/* =========================================================
   EMPTY
========================================================= */

function showEmpty(
    grid,
    empty,
    message
) {

    if (grid) {
        grid.innerHTML = "";
    }

    if (!empty) {
        return;
    }

    empty.hidden = false;

    const title =
        empty.querySelector("h3");

    if (title) {
        title.textContent =
            message;
    }

}


/* =========================================================
   FIND ITEM
========================================================= */

function findItemById(id) {

    return state.all.find(
        item =>
            String(
                item.id
            ) ===
            String(id)
    );

}


/* =========================================================
   MODAL
========================================================= */

function openModal(item) {

    if (!movieModal) {
        return;
    }

    state.currentItem =
        item;


    const poster =
        getPoster(item);


    modalTitle.textContent =
        item.title ||
        "بدون عنوان";


    modalType.textContent =
        getTypeName(
            item.type
        );


    if (modalGenres) {

        modalGenres.textContent =
            getGenres(item)
                .join(" • ");

    }


    if (modalOverview) {

        modalOverview.textContent =
            item.overview ||
            "لا يوجد وصف عربي متوفر.";

    }


    if (modalMeta) {

        modalMeta.innerHTML = `

            <span class="meta-item">
                <strong>التقييم</strong>
                ${escapeHtml(
                    formatRating(
                        item.rating
                    )
                )}
            </span>

            <span class="meta-item">
                <strong>السنة</strong>
                ${escapeHtml(
                    getYear(item)
                )}
            </span>

            ${
                item.imdbRating
                    ? `
                        <span class="meta-item">
                            <strong>IMDb</strong>
                            ${escapeHtml(
                                formatRating(
                                    item.imdbRating
                                )
                            )}
                        </span>
                    `
                    : ""
            }

            ${
                item.runtime
                    ? `
                        <span class="meta-item">
                            <strong>المدة</strong>
                            ${escapeHtml(
                                item.runtime
                            )}
                        </span>
                    `
                    : ""
            }

            ${
                item.episodes
                    ? `
                        <span class="meta-item">
                            <strong>الحلقات</strong>
                            ${escapeHtml(
                                item.episodes
                            )}
                        </span>
                    `
                    : ""
            }

            ${
                item.status
                    ? `
                        <span class="meta-item">
                            <strong>الحالة</strong>
                            ${escapeHtml(
                                item.status
                            )}
                        </span>
                    `
                    : ""
            }

        `;

    }


    const extras = [];


    if (item.director) {

        extras.push(
            `المخرج: ${item.director}`
        );

    }


    if (item.writer) {

        extras.push(
            `الكاتب: ${item.writer}`
        );

    }


    if (item.network) {

        extras.push(
            `الشبكة: ${item.network}`
        );

    }


    if (item.production) {

        const production =
            Array.isArray(
                item.production
            )
                ? item.production.join("، ")
                : item.production;

        extras.push(
            `الإنتاج: ${production}`
        );

    }


    if (item.country) {

        extras.push(
            `الدولة: ${item.country}`
        );

    }


    if (modalExtra) {

        modalExtra.innerHTML =
            extras
                .map(
                    text =>
                        `<span>${escapeHtml(
                            text
                        )}</span>`
                )
                .join(" • ");

    }


    if (modalPoster) {

        if (poster) {

            modalPoster.innerHTML = `
                <img
                    src="${escapeHtml(
                        poster
                    )}"
                    alt="${escapeHtml(
                        item.title
                    )}"
                >
            `;

        } else {

            modalPoster.innerHTML = `
                <div
                    style="
                        width:100%;
                        height:100%;
                        display:grid;
                        place-items:center;
                        color:#d6a84f;
                        font-size:40px;
                    "
                >
                    IE
                </div>
            `;

        }

    }


    if (modalBackdrop) {

        const backdrop =
            getBackdrop(item);


        if (backdrop) {

            modalBackdrop.style.background =
                `
                    linear-gradient(
                        90deg,
                        #090909 15%,
                        rgba(9,9,9,.75),
                        rgba(9,9,9,.35)
                    ),
                    url("${backdrop}")
                    center / cover
                    no-repeat
                `;

        } else {

            modalBackdrop.style.background =
                `
                    radial-gradient(
                        circle at 70% 30%,
                        rgba(143,16,32,.35),
                        transparent 40%
                    ),
                    #090909
                `;

        }

    }


    if (modalWatch) {

        if (item.trailer) {

            modalWatch.textContent =
                "عرض المقطع";

            modalWatch.disabled =
                false;

        } else if (item.sourceUrl) {

            modalWatch.textContent =
                "المصدر";

            modalWatch.disabled =
                false;

        } else if (item.imdbId) {

            modalWatch.textContent =
                "IMDb";

            modalWatch.disabled =
                false;

        } else {

            modalWatch.textContent =
                "لا يوجد رابط";

            modalWatch.disabled =
                true;

        }

    }


    movieModal.hidden = false;

    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!movieModal) {
        return;
    }

    movieModal.hidden = true;

    document.body.style.overflow = "";

    state.currentItem = null;

}


/* =========================================================
   SEARCH
========================================================= */

async function performSearch(
    query
) {

    const text =
        String(
            query || ""
        ).trim();


    if (!text) {

        if (searchResults) {
            searchResults.innerHTML =
                "";
        }

        return;

    }


    if (searchResults) {

        searchResults.innerHTML = `
            <div class="search-empty">
                جاري البحث...
            </div>
        `;

    }


    try {

        let items = [];


        /*
         * نبحث أولاً في المكتبة المدمجة
         * لأن هذا يمنع إعادة تحميل المصادر
         * في كل حرف يكتبه المستخدم.
         */

        const normalizedQuery =
            normalizeTitle(
                text
            );


        items =
            state.all.filter(
                item => {

                    const fields = [

                        item.title,

                        item.originalTitle,

                        item.englishTitle,

                        item.overview

                    ]
                        .filter(Boolean)
                        .map(
                            value =>
                                normalizeTitle(
                                    value
                                )
                        );


                    return fields.some(
                        value =>
                            value.includes(
                                normalizedQuery
                            )
                    );

                }
            );


        /*
         * إذا لم نجد نتيجة محلية
         * نحاول API الموقع.
         */

        if (!items.length) {

            const type =
                state.searchType ===
                "all"
                    ? ""
                    : `&type=${encodeURIComponent(
                        state.searchType
                    )}`;


            const data =
                await fetchJSON(
                    `${API_BASE}/movies?search=${encodeURIComponent(
                        text
                    )}&sort=popular${type}`
                );


            items =
                Array.isArray(
                    data.movies
                )
                    ? deduplicateItems(
                        data.movies
                    )
                    : [];

        }


        if (
            state.searchType !==
            "all"
        ) {

            items =
                items.filter(
                    item =>
                        item.type ===
                        state.searchType
                );

        }


        renderSearchResults(
            items.slice(
                0,
                CONFIG.SEARCH_LIMIT
            )
        );


    } catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        if (searchResults) {

            searchResults.innerHTML = `
                <div class="search-empty">
                    تعذر تنفيذ البحث حالياً.
                </div>
            `;

        }

    }

}


/* =========================================================
   SEARCH RESULTS
========================================================= */

function renderSearchResults(
    items
) {

    if (!searchResults) {
        return;
    }


    if (!items.length) {

        searchResults.innerHTML = `
            <div class="search-empty">
                لم نجد نتيجة عربية مطابقة.
            </div>
        `;

        return;

    }


    searchResults.innerHTML =
        items
            .map(
                item => {

                    const poster =
                        getPoster(item);

                    return `
                        <div
                            class="search-result"
                            data-id="${escapeHtml(
                                item.id
                            )}"
                        >

                            ${
                                poster
                                    ? `
                                        <img
                                            src="${escapeHtml(
                                                poster
                                            )}"
                                            alt="${escapeHtml(
                                                item.title
                                            )}"
                                        >
                                    `
                                    : `
                                        <div
                                            style="
                                                width:48px;
                                                height:65px;
                                                display:grid;
                                                place-items:center;
                                                border-radius:7px;
                                                background:#151515;
                                                color:#d6a84f;
                                            "
                                        >
                                            IE
                                        </div>
                                    `
                            }


                            <div class="search-result-info">

                                <div class="search-result-title">
                                    ${escapeHtml(
                                        item.title
                                    )}
                                </div>


                                <div class="search-result-meta">

                                    ${escapeHtml(
                                        getTypeName(
                                            item.type
                                        )
                                    )}

                                    •

                                    ${escapeHtml(
                                        getYear(item)
                                    )}

                                    •

                                    ★ ${escapeHtml(
                                        formatRating(
                                            item.rating
                                        )
                                    )}

                                </div>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    $$(".nav-link")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        $$(".nav-link")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        link.classList.add(
                            "active"
                        );

                    }
                );

            }
        );


    const sections =
        [
            "#home",
            "#movies",
            "#series",
            "#anime",
            "#popular",
            "#categories"
        ]
            .map(
                selector =>
                    document.querySelector(
                        selector
                    )
            )
            .filter(Boolean);


    if (
        !("IntersectionObserver" in window)
    ) {
        return;
    }


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        const id =
                            entry.target.id;


                        $$(".nav-link")
                            .forEach(
                                link => {

                                    link.classList.toggle(
                                        "active",
                                        link.getAttribute(
                                            "href"
                                        ) ===
                                        `#${id}`
                                    );

                                }
                            );

                    }
                );

            },
            {
                threshold: 0.35
            }
        );


    sections.forEach(
        section =>
            observer.observe(
                section
            )
    );

}


/* =========================================================
   MOVIE FILTERS
========================================================= */

function setupMovieFilters() {

    $$("#movieFilters .filter")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$("#movieFilters .filter")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );


                        state.movieCategory =
                            button.dataset.category ||
                            "all";


                        state.movieLimit =
                            CONFIG.MOVIE_LIMIT;


                        renderMovies();

                    }
                );

            }
        );


    const select =
        $("#movieSortSelect");


    if (select) {

        select.addEventListener(
            "change",
            () => {

                state.movieSort =
                    select.value;

                state.movieLimit =
                    CONFIG.MOVIE_LIMIT;

                renderMovies();

            }
        );

    }


    if (loadMore) {

        loadMore.addEventListener(
            "click",
            () => {

                state.movieLimit +=
                    CONFIG.MOVIE_LIMIT;

                renderMovies();

            }
        );

    }

}


/* =========================================================
   SERIES FILTERS
========================================================= */

function setupSeriesFilters() {

    $$("#seriesFilters .content-tab")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$("#seriesFilters .content-tab")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );


                        state.seriesFilter =
                            button.dataset.seriesFilter ||
                            "all";


                        renderSeries();

                    }
                );

            }
        );

}


/* =========================================================
   ANIME FILTERS
========================================================= */

function setupAnimeFilters() {

    $$("#animeFilters .content-tab")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$("#animeFilters .content-tab")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );


                        state.animeFilter =
                            button.dataset.animeFilter ||
                            "all";


                        renderAnime();

                    }
                );

            }
        );

}


/* =========================================================
   CATEGORIES
========================================================= */

function setupCategories() {

    $$(".category-card")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const category =
                            button.dataset.category;


                        if (!category) {
                            return;
                        }


                        state.movieCategory =
                            category;


                        state.movieLimit =
                            CONFIG.MOVIE_LIMIT;


                        $$("#movieFilters .filter")
                            .forEach(
                                filter => {

                                    filter.classList.toggle(
                                        "active",
                                        filter.dataset.category ===
                                        category
                                    );

                                }
                            );


                        location.hash =
                            "movies";


                        renderMovies();

                    }
                );

            }
        );

}


/* =========================================================
   CARD EVENTS
========================================================= */

function setupCardEvents() {

    document.addEventListener(
        "click",
        event => {

            const card =
                event.target.closest(
                    ".content-card"
                );


            if (!card) {
                return;
            }


            const item =
                findItemById(
                    card.dataset.id
                );


            if (item) {

                openModal(
                    item
                );

            }

        }
    );


    document.addEventListener(
        "click",
        event => {

            const result =
                event.target.closest(
                    ".search-result"
                );


            if (!result) {
                return;
            }


            const item =
                findItemById(
                    result.dataset.id
                );


            if (item) {

                closeSearch();

                openModal(
                    item
                );

            }

        }
    );

}


/* =========================================================
   SEARCH OPEN
========================================================= */

function openSearch() {

    if (!searchOverlay) {
        return;
    }

    searchOverlay.hidden = false;

    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            if (searchInput) {
                searchInput.focus();
            }

        },
        100
    );

}


/* =========================================================
   SEARCH CLOSE
========================================================= */

function closeSearch() {

    if (!searchOverlay) {
        return;
    }

    searchOverlay.hidden = true;

    document.body.style.overflow = "";

}


/* =========================================================
   SEARCH EVENTS
========================================================= */

function setupSearch() {

    const openButton =
        $("#openSearch");

    const heroButton =
        $("#heroSearch");

    const closeButton =
        $("#closeSearch");


    if (openButton) {

        openButton.addEventListener(
            "click",
            openSearch
        );

    }


    if (heroButton) {

        heroButton.addEventListener(
            "click",
            openSearch
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeSearch
        );

    }


    if (searchOverlay) {

        searchOverlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    searchOverlay
                ) {

                    closeSearch();

                }

            }
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                clearTimeout(
                    state.searchTimer
                );


                state.searchTimer =
                    setTimeout(
                        () =>
                            performSearch(
                                searchInput.value
                            ),
                        350
                    );

            }
        );

    }


    $$(".search-type")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$(".search-type")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        state.searchType =
                            button.dataset.searchType ||
                            "all";


                        if (
                            searchInput &&
                            searchInput.value.trim()
                        ) {

                            performSearch(
                                searchInput.value
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModal() {

    const closeButton =
        $("#closeModal");

    const closeAlt =
        $("#modalCloseAlt");


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (closeAlt) {

        closeAlt.addEventListener(
            "click",
            closeModal
        );

    }


    if (movieModal) {

        movieModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    movieModal
                ) {

                    closeModal();

                }

            }
        );

    }


    if (modalWatch) {

        modalWatch.addEventListener(
            "click",
            () => {

                const item =
                    state.currentItem;


                if (!item) {
                    return;
                }


                let url = null;


                if (item.trailer) {

                    url =
                        item.trailer;

                } else if (
                    item.sourceUrl
                ) {

                    url =
                        item.sourceUrl;

                } else if (
                    item.imdbId
                ) {

                    url =
                        `https://www.imdb.com/title/${encodeURIComponent(
                            item.imdbId
                        )}/`;

                }


                if (url) {

                    window.open(
                        url,
                        "_blank",
                        "noopener,noreferrer"
                    );

                } else {

                    showToast(
                        "لا يوجد رابط متاح لهذا العمل"
                    );

                }

            }
        );

    }

}


/* =========================================================
   KEYBOARD
========================================================= */

function setupKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            if (
                searchOverlay &&
                !searchOverlay.hidden
            ) {

                closeSearch();

            }


            if (
                movieModal &&
                !movieModal.hidden
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================================
   PAGE TITLE
========================================================= */

function setupBranding() {

    document.title =
        "IRAQ EMPIRE CINEMA | عراق إمباير سينما";

}


/* =========================================================
   INIT
========================================================= */

async function init() {

    setupBranding();


    setLoading(
        popularGrid,
        6
    );

    setLoading(
        movieGrid,
        8
    );

    setLoading(
        seriesGrid,
        6
    );

    setLoading(
        animeGrid,
        6
    );


    setupNavigation();

    setupMovieFilters();

    setupSeriesFilters();

    setupAnimeFilters();

    setupCategories();

    setupCardEvents();

    setupSearch();

    setupModal();

    setupKeyboard();


    /*
     * نحمل حالة API بالتوازي
     * مع المصادر الخارجية.
     */

    await Promise.allSettled([

        loadStatus(),

        loadAll()

    ]);


    console.log(
        "IRAQ EMPIRE CINEMA → READY"
    );

}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init,
        {
            once: true
        }
    );

} else {

    init();

}
