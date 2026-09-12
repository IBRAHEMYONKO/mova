"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const config = require("./config.json");

const PORT = Number(
    process.env.PORT ||
    config.port ||
    3000
);

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const CACHE_FILE = path.join(
    DATA_DIR,
    "movies.json"
);

const CACHE_TTL =
    Number(config.cacheHours || 6) *
    60 *
    60 *
    1000;

fs.mkdirSync(DATA_DIR, {
    recursive: true
});

const app = express();

app.disable("x-powered-by");

app.use(
    express.json({
        limit: "32kb"
    })
);

/* =========================================================
   التصنيفات
========================================================= */

const GENRES = {
    28: "أكشن",
    12: "مغامرة",
    16: "رسوم متحركة",
    35: "كوميديا",
    80: "جريمة",
    99: "وثائقي",
    18: "دراما",
    10751: "عائلي",
    14: "خيال",
    36: "تاريخي",
    27: "رعب",
    10402: "موسيقى",
    9648: "غموض",
    10749: "رومانسي",
    878: "خيال علمي",
    53: "إثارة",
    10752: "حربي",
    37: "غربي"
};

/* =========================================================
   حالة النظام
========================================================= */

let movieStore = loadCache();

let syncRunning = false;
let lastSync = null;
let lastError = null;

/* =========================================================
   Cache
========================================================= */

function createEmptyStore() {
    return {
        updatedAt: null,
        sources: {},
        movies: []
    };
}

function loadCache() {
    try {
        if (!fs.existsSync(CACHE_FILE)) {
            return createEmptyStore();
        }

        const raw = JSON.parse(
            fs.readFileSync(
                CACHE_FILE,
                "utf8"
            )
        );

        if (
            !raw ||
            !Array.isArray(raw.movies)
        ) {
            return createEmptyStore();
        }

        return raw;

    } catch {
        return createEmptyStore();
    }
}

function saveCache() {
    fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify(
            movieStore,
            null,
            2
        ),
        "utf8"
    );
}

/* =========================================================
   مصادر البيانات
========================================================= */

function hasTMDB() {
    return Boolean(
        config.tmdbAccessToken ||
        config.tmdbApiKey
    );
}

function hasOMDb() {
    return Boolean(
        config.omdbApiKey
    );
}

/* =========================================================
   TMDB
========================================================= */

function tmdbHeaders() {

    if (!config.tmdbAccessToken) {
        return {};
    }

    return {
        Authorization:
            `Bearer ${config.tmdbAccessToken}`
    };
}

async function tmdb(
    endpoint,
    params = {}
) {

    if (!hasTMDB()) {
        throw new Error(
            "TMDB credentials are missing"
        );
    }

    const url = new URL(
        `https://api.themoviedb.org/3${endpoint}`
    );

    for (
        const [key, value]
        of Object.entries(params)
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            url.searchParams.set(
                key,
                String(value)
            );
        }
    }

    if (
        !config.tmdbAccessToken &&
        config.tmdbApiKey
    ) {

        url.searchParams.set(
            "api_key",
            config.tmdbApiKey
        );
    }

    const response = await fetch(
        url,
        {
            headers: tmdbHeaders()
        }
    );

    if (!response.ok) {

        throw new Error(
            `TMDB ${response.status}`
        );
    }

    return response.json();
}

/* =========================================================
   OMDb
========================================================= */

async function omdb(
    params = {}
) {

    if (!hasOMDb()) {
        throw new Error(
            "OMDb credentials are missing"
        );
    }

    const url = new URL(
        "https://www.omdbapi.com/"
    );

    url.searchParams.set(
        "apikey",
        config.omdbApiKey
    );

    for (
        const [key, value]
        of Object.entries(params)
    ) {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            url.searchParams.set(
                key,
                String(value)
            );
        }
    }

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            `OMDb HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    if (
        data.Response === "False"
    ) {

        throw new Error(
            data.Error ||
            "OMDb request failed"
        );
    }

    return data;
}

/* =========================================================
   تحويل TMDB
========================================================= */

function normalizeTMDB(movie) {

    const year =
        movie.release_date
            ? Number(
                movie.release_date.slice(
                    0,
                    4
                )
            )
            : null;

    return {

        id:
            `tmdb-${movie.id}`,

        tmdbId:
            movie.id,

        imdbId:
            movie.imdb_id ||
            null,

        source:
            "TMDB",

        title:
            movie.title ||
            movie.original_title ||
            "بدون عنوان",

        originalTitle:
            movie.original_title ||
            null,

        overview:
            movie.overview ||
            "لا يوجد وصف متاح.",

        year,

        releaseDate:
            movie.release_date ||
            null,

        rating:
            Number(
                movie.vote_average || 0
            ),

        voteCount:
            Number(
                movie.vote_count || 0
            ),

        popularity:
            Number(
                movie.popularity || 0
            ),

        genres:
            Array.isArray(
                movie.genre_ids
            )
                ? movie.genre_ids
                    .map(
                        id =>
                            GENRES[id]
                    )
                    .filter(Boolean)
                : [],

        poster:
            movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : null,

        backdrop:
            movie.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
                : null,

        runtime:
            movie.runtime ||
            null
    };
}

/* =========================================================
   تحويل OMDb
========================================================= */

function normalizeOMDb(movie) {

    const rating =
        Number(
            movie.imdbRating
        );

    return {

        id:
            `imdb-${movie.imdbID}`,

        tmdbId:
            null,

        imdbId:
            movie.imdbID ||
            null,

        source:
            "OMDb",

        title:
            movie.Title ||
            "بدون عنوان",

        originalTitle:
            movie.Title ||
            null,

        overview:
            movie.Plot &&
            movie.Plot !== "N/A"
                ? movie.Plot
                : "لا يوجد وصف متاح.",

        year:
            movie.Year &&
            /^\d{4}/.test(
                movie.Year
            )
                ? Number(
                    movie.Year.slice(
                        0,
                        4
                    )
                )
                : null,

        releaseDate:
            null,

        rating:
            Number.isFinite(
                rating
            )
                ? rating
                : 0,

        voteCount:
            0,

        popularity:
            0,

        genres:
            movie.Genre &&
            movie.Genre !== "N/A"
                ? movie.Genre
                    .split(",")
                    .map(
                        x =>
                            x.trim()
                    )
                : [],

        poster:
            movie.Poster &&
            movie.Poster !== "N/A"
                ? movie.Poster
                : null,

        backdrop:
            null,

        runtime:
            movie.Runtime &&
            movie.Runtime !== "N/A"
                ? movie.Runtime
                : null
    };
}

/* =========================================================
   TMDB Page
========================================================= */

async function fetchTMDBPage(
    endpoint,
    params
) {

    const data =
        await tmdb(
            endpoint,
            params
        );

    if (
        !Array.isArray(
            data.results
        )
    ) {
        return [];
    }

    return data.results.map(
        normalizeTMDB
    );
}

/* =========================================================
   إزالة التكرار
========================================================= */

function uniqueMovies(movies) {

    const map =
        new Map();

    for (
        const movie
        of movies
    ) {

        const key =
            movie.imdbId ||
            `tmdb:${movie.tmdbId}` ||
            `${movie.title}:${movie.year}`;

        if (
            !map.has(key)
        ) {

            map.set(
                key,
                movie
            );
        }
    }

    return [
        ...map.values()
    ];
}

/* =========================================================
   تحديث المكتبة
========================================================= */

async function syncMovies() {

    if (syncRunning) {
        return movieStore;
    }

    syncRunning = true;
    lastError = null;

    try {

        const collected = [];
        const sources = {};

        /* =========================
           TMDB
        ========================= */

        if (hasTMDB()) {

            const requests = [

                [
                    "popular",
                    "/movie/popular",
                    {
                        language: "ar-SA",
                        region: "IQ",
                        page: 1
                    }
                ],

                [
                    "trending",
                    "/trending/movie/week",
                    {
                        language: "ar-SA"
                    }
                ],

                [
                    "topRated",
                    "/movie/top_rated",
                    {
                        language: "ar-SA",
                        region: "IQ",
                        page: 1
                    }
                ],

                [
                    "nowPlaying",
                    "/movie/now_playing",
                    {
                        language: "ar-SA",
                        region: "IQ",
                        page: 1
                    }
                ],

                [
                    "upcoming",
                    "/movie/upcoming",
                    {
                        language: "ar-SA",
                        region: "IQ",
                        page: 1
                    }
                ]
            ];

            for (
                const [
                    name,
                    endpoint,
                    params
                ]
                of requests
            ) {

                try {

                    const movies =
                        await fetchTMDBPage(
                            endpoint,
                            params
                        );

                    collected.push(
                        ...movies
                    );

                    sources[name] =
                        movies.length;

                } catch (error) {

                    sources[name] =
                        0;

                    lastError =
                        `TMDB ${name}: ${error.message}`;
                }
            }
        }

        /* =========================
           OMDb
        ========================= */

        if (
            hasOMDb() &&
            Array.isArray(
                config.omdbSeedTitles
            )
        ) {

            let count = 0;

            for (
                const title
                of config
                    .omdbSeedTitles
                    .slice(0, 20)
            ) {

                try {

                    const movie =
                        await omdb({
                            t: title,
                            plot: "full"
                        });

                    collected.push(
                        normalizeOMDb(
                            movie
                        )
                    );

                    count++;

                } catch {}
            }

            sources.omdb =
                count;
        }

        /* =========================
           الدمج
        ========================= */

        const merged =
            uniqueMovies(
                collected
            )
                .filter(
                    movie =>
                        movie.title
                )
                .sort(
                    (a, b) =>
                        (
                            b.popularity ||
                            b.rating
                        ) -
                        (
                            a.popularity ||
                            a.rating
                        )
                );

        if (merged.length) {

            movieStore = {

                updatedAt:
                    new Date()
                        .toISOString(),

                sources,

                movies:
                    merged
            };

            saveCache();

            lastSync =
                movieStore.updatedAt;
        }

        return movieStore;

    } finally {

        syncRunning =
            false;
    }
}

/* =========================================================
   تحديث تلقائي
========================================================= */

function maybeSync() {

    const updated =
        movieStore.updatedAt
            ? Date.parse(
                movieStore.updatedAt
            )
            : 0;

    if (
        !updated ||
        Date.now() - updated >
            CACHE_TTL
    ) {

        syncMovies()
            .catch(error => {

                lastError =
                    error.message;

                console.error(
                    "AUTO SYNC ERROR →",
                    error.message
                );
            });
    }
}

/* =========================================================
   ترتيب
========================================================= */

function scoreMovie(movie) {

    return (
        (movie.popularity || 0) +
        (movie.rating || 0) * 8 +
        Math.log10(
            (movie.voteCount || 0) + 1
        )
    );
}

/* =========================================================
   فلترة
========================================================= */

function filterMovies(query) {

    let movies =
        [...movieStore.movies];

    const q =
        String(
            query.q || ""
        )
            .trim()
            .toLowerCase();

    const category =
        String(
            query.category ||
            "all"
        )
            .trim()
            .toLowerCase();

    const sort =
        String(
            query.sort ||
            "popular"
        );

    if (q) {

        movies =
            movies.filter(
                movie =>
                    [
                        movie.title,
                        movie.originalTitle,
                        movie.overview,
                        ...(movie.genres || [])
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()
                        .includes(q)
            );
    }

    if (
        category !== "all"
    ) {

        movies =
            movies.filter(
                movie =>
                    (
                        movie.genres ||
                        []
                    ).some(
                        genre =>
                            genre
                                .toLowerCase()
                                .includes(
                                    category
                                )
                    )
            );
    }

    if (
        sort === "rating"
    ) {

        movies.sort(
            (a, b) =>
                scoreMovie(b) -
                scoreMovie(a)
        );

    } else if (
        sort === "new"
    ) {

        movies.sort(
            (a, b) =>
                (b.year || 0) -
                (a.year || 0)
        );

    } else {

        movies.sort(
            (a, b) =>
                scoreMovie(b) -
                scoreMovie(a)
        );
    }

    return movies;
}

/* =========================================================
   حماية الملفات
========================================================= */

app.use(
    (req, res, next) => {

        const blocked = [

            "/config.json",
            "/package.json",
            "/package-lock.json",
            "/server.js",
            "/bot.js",
            "/data/movies.json"

        ];

        if (
            blocked.includes(
                req.path
            )
        ) {

            return res
                .status(403)
                .send(
                    "Forbidden"
                );
        }

        next();
    }
);

/* =========================================================
   الملفات
========================================================= */

app.use(
    express.static(ROOT)
);

/* =========================================================
   Health
========================================================= */

app.get(
    "/health",
    (req, res) => {

        res.json({

            ok: true,

            name:
                "IRAQ EMPIRE CINEMA",

            updatedAt:
                movieStore.updatedAt
        });
    }
);

/* =========================================================
   حالة النظام
========================================================= */

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            ok: true,

            name:
                "IRAQ EMPIRE CINEMA",

            movieCount:
                movieStore.movies.length,

            updatedAt:
                movieStore.updatedAt,

            lastSync,

            syncRunning,

            sources:
                movieStore.sources,

            error:
                lastError
        });
    }
);

/* =========================================================
   API الأفلام
========================================================= */

app.get(
    "/api/movies",
    (req, res) => {

        maybeSync();

        const page =
            Math.max(
                1,
                Number(
                    req.query.page ||
                    1
                )
            );

        const limit =
            Math.min(
                40,
                Math.max(
                    1,
                    Number(
                        req.query.limit ||
                        20
                    )
                )
            );

        const movies =
            filterMovies(
                req.query
            );

        const start =
            (page - 1) *
            limit;

        res.json({

            movies:
                movies.slice(
                    start,
                    start + limit
                ),

            page,

            limit,

            total:
                movies.length,

            updatedAt:
                movieStore.updatedAt
        });
    }
);

/* =========================================================
   فيلم واحد
========================================================= */

app.get(
    "/api/movies/:id",
    (req, res) => {

        const movie =
            movieStore.movies.find(
                item =>
                    item.id ===
                    req.params.id
            );

        if (!movie) {

            return res
                .status(404)
                .json({
                    error:
                        "الفيلم غير موجود"
                });
        }

        res.json(movie);
    }
);

/* =========================================================
   تحديث يدوي
========================================================= */

app.post(
    "/api/sync",
    async (req, res) => {

        if (
            config.syncSecret &&
            req.get(
                "x-sync-secret"
            ) !==
                config.syncSecret
        ) {

            return res
                .status(403)
                .json({
                    error:
                        "Forbidden"
                });
        }

        try {

            const store =
                await syncMovies();

            res.json({

                ok: true,

                count:
                    store.movies.length,

                updatedAt:
                    store.updatedAt
            });

        } catch (error) {

            res
                .status(500)
                .json({

                    ok: false,

                    error:
                        error.message
                });
        }
    }
);

/* =========================================================
   تشغيل الموقع
========================================================= */

const server =
    app.listen(
        PORT,
        () => {

            console.log(
                "========================================"
            );

            console.log(
                "IRAQ EMPIRE CINEMA ONLINE"
            );

            console.log(
                `PORT → ${PORT}`
            );

            console.log(
                "DISCORD → DISABLED"
            );

            console.log(
                "========================================"
            );

            maybeSync();
        }
    );

server.on(
    "error",
    error => {

        console.error(
            "WEBSITE SERVER ERROR →",
            error.message
        );
    }
);

/* =========================================================
   تحديث دوري
========================================================= */

setInterval(
    () => {
        maybeSync();
    },
    Math.max(
        15 * 60 * 1000,
        Math.floor(
            CACHE_TTL / 2
        )
    )
);
