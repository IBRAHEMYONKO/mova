"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const config = require("./config.json");

const app = express();

const PORT = process.env.PORT || config.port || 3000;

const DATA_DIR = path.join(__dirname, "data");
const MOVIES_FILE = path.join(DATA_DIR, "movies.json");

const TMDB_ACCESS_TOKEN =
    process.env.TMDB_ACCESS_TOKEN ||
    config.tmdbAccessToken ||
    "";

const TMDB_API_KEY =
    process.env.TMDB_API_KEY ||
    config.tmdbApiKey ||
    "";

const OMDB_API_KEY =
    process.env.OMDB_API_KEY ||
    config.omdbApiKey ||
    "";

const SYNC_SECRET =
    process.env.SYNC_SECRET ||
    config.syncSecret ||
    "";

const CACHE_HOURS =
    Number(config.cacheHours) > 0
        ? Number(config.cacheHours)
        : 6;

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w1280";

const OMDB_BASE = "https://www.omdbapi.com/";

/* =========================================================
   Express
========================================================= */

app.use(express.json({ limit: "1mb" }));

/* =========================================================
   Genres
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
    14: "فانتازيا",
    36: "تاريخي",
    27: "رعب",
    10402: "موسيقى",
    9648: "غموض",
    10749: "رومانسي",
    878: "خيال علمي",
    10770: "تلفزيوني",
    53: "إثارة",
    10752: "حربي",
    37: "غربي"
};

/* =========================================================
   Helpers
========================================================= */

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadMovies() {
    ensureDataDirectory();

    if (!fs.existsSync(MOVIES_FILE)) {
        return [];
    }

    try {
        const raw = fs.readFileSync(MOVIES_FILE, "utf8");

        if (!raw.trim()) {
            return [];
        }

        const data = JSON.parse(raw);

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("MOVIES LOAD ERROR:", error.message);
        return [];
    }
}

function saveMovies(movies) {
    ensureDataDirectory();

    fs.writeFileSync(
        MOVIES_FILE,
        JSON.stringify(movies, null, 2),
        "utf8"
    );
}

function cleanText(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function numberOrNull(value) {
    const n = Number(value);

    return Number.isFinite(n) ? n : null;
}

function uniqueMovies(movies) {
    const map = new Map();

    for (const movie of movies) {
        if (!movie) continue;

        const key =
            movie.imdbId ||
            movie.tmdbId ||
            movie.id ||
            movie.title?.toLowerCase();

        if (!key) continue;

        if (!map.has(key)) {
            map.set(key, movie);
        } else {
            const old = map.get(key);

            map.set(key, {
                ...old,
                ...movie
            });
        }
    }

    return Array.from(map.values());
}

/* =========================================================
   TMDB Request
========================================================= */

async function tmdbRequest(endpoint, params = {}) {
    const url = new URL(`${TMDB_BASE}${endpoint}`);

    for (const [key, value] of Object.entries(params)) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(key, value);
        }
    }

    const headers = {
        Accept: "application/json"
    };

    if (TMDB_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
    }

    const response = await fetch(url, {
        method: "GET",
        headers
    });

    if (!response.ok) {
        const text = await response.text();

        throw new Error(
            `TMDB ${response.status}: ${text.slice(0, 300)}`
        );
    }

    return response.json();
}

/* =========================================================
   OMDb Request
========================================================= */

async function omdbRequest(params = {}) {
    if (!OMDB_API_KEY) {
        return null;
    }

    const url = new URL(OMDB_BASE);

    url.searchParams.set("apikey", OMDB_API_KEY);

    for (const [key, value] of Object.entries(params)) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(key, value);
        }
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `OMDb HTTP ${response.status}`
        );
    }

    const data = await response.json();

    if (data.Response === "False") {
        return null;
    }

    return data;
}

/* =========================================================
   Get TMDB IMDb ID
========================================================= */

async function getTmdbExternalIds(tmdbId) {
    try {
        const data = await tmdbRequest(
            `/movie/${tmdbId}/external_ids`
        );

        return {
            imdbId: data?.imdb_id || null,
            facebookId: data?.facebook_id || null,
            instagramId: data?.instagram_id || null,
            twitterId: data?.twitter_id || null
        };
    } catch (error) {
        console.log(
            `TMDB EXTERNAL IDS FAILED ${tmdbId}:`,
            error.message
        );

        return {
            imdbId: null
        };
    }
}

/* =========================================================
   Normalize TMDB Movie
========================================================= */

function normalizeTmdbMovie(movie, category = "popular") {
    const title =
        movie.title ||
        movie.original_title ||
        "فيلم بدون اسم";

    const genres = Array.isArray(movie.genre_ids)
        ? movie.genre_ids
            .map(id => GENRES[id])
            .filter(Boolean)
        : [];

    return {
        id: `tmdb-${movie.id}`,
        tmdbId: movie.id,

        source: "tmdb",

        title,
        originalTitle:
            movie.original_title || title,

        overview:
            movie.overview || "لا يوجد وصف متوفر.",

        poster:
            movie.poster_path
                ? `${TMDB_IMAGE}${movie.poster_path}`
                : null,

        backdrop:
            movie.backdrop_path
                ? `${TMDB_BACKDROP}${movie.backdrop_path}`
                : null,

        releaseDate:
            movie.release_date || null,

        year:
            movie.release_date
                ? movie.release_date.slice(0, 4)
                : null,

        rating:
            numberOrNull(movie.vote_average),

        votes:
            numberOrNull(movie.vote_count),

        popularity:
            numberOrNull(movie.popularity),

        genres,

        category,

        imdbId: null,

        imdbRating: null,

        actors: [],

        director: null,

        writer: null,

        runtime: null,

        rated: null,

        country: null,

        language: null,

        awards: null,

        production: null,

        trailer: null,

        updatedAt: new Date().toISOString()
    };
}

/* =========================================================
   Get TMDB Movies
========================================================= */

async function getTmdbMovies() {
    const movies = [];

    const requests = [
        {
            endpoint: "/movie/popular",
            params: {
                language: "ar-SA",
                region: "IQ",
                page: 1
            },
            category: "popular"
        },

        {
            endpoint: "/trending/movie/week",
            params: {
                language: "ar-SA"
            },
            category: "trending"
        },

        {
            endpoint: "/movie/top_rated",
            params: {
                language: "ar-SA",
                region: "IQ",
                page: 1
            },
            category: "top_rated"
        },

        {
            endpoint: "/movie/now_playing",
            params: {
                language: "ar-SA",
                region: "IQ",
                page: 1
            },
            category: "now_playing"
        },

        {
            endpoint: "/movie/upcoming",
            params: {
                language: "ar-SA",
                region: "IQ",
                page: 1
            },
            category: "upcoming"
        }
    ];

    for (const request of requests) {
        try {
            const data = await tmdbRequest(
                request.endpoint,
                request.params
            );

            if (!Array.isArray(data?.results)) {
                continue;
            }

            for (const movie of data.results) {
                movies.push(
                    normalizeTmdbMovie(
                        movie,
                        request.category
                    )
                );
            }
        } catch (error) {
            console.error(
                `TMDB CATEGORY ERROR [${request.category}]:`,
                error.message
            );
        }
    }

    return uniqueMovies(movies);
}

/* =========================================================
   Add TMDB Details + IMDb ID
========================================================= */

async function enrichFromTmdb(movies) {
    const result = [];

    /*
       لا نريد إرسال مئات الطلبات في كل تحديث.
       لذلك نأخذ أول 40 فيلمًا بعد الدمج.
    */

    const limit = Math.min(movies.length, 40);

    for (let i = 0; i < limit; i++) {
        const movie = movies[i];

        try {
            const externalIds =
                await getTmdbExternalIds(
                    movie.tmdbId
                );

            movie.imdbId =
                externalIds.imdbId || null;
        } catch (error) {
            movie.imdbId = null;
        }

        result.push(movie);
    }

    /*
       الأفلام التي لم نطلب external IDs لها
       تبقى كما هي.
    */

    for (let i = limit; i < movies.length; i++) {
        result.push(movies[i]);
    }

    return result;
}

/* =========================================================
   OMDb Enrichment
========================================================= */

async function enrichFromOmdb(movies) {
    if (!OMDB_API_KEY) {
        console.log(
            "OMDb → DISABLED (API key not configured)"
        );

        return movies;
    }

    console.log(
        `OMDb → Enriching ${Math.min(movies.length, 40)} movies...`
    );

    const result = [];
    const limit = Math.min(movies.length, 40);

    for (let i = 0; i < limit; i++) {
        const movie = movies[i];

        try {
            let omdb = null;

            /*
               الأفضل استخدام IMDb ID القادم من TMDB.
            */

            if (movie.imdbId) {
                omdb = await omdbRequest({
                    i: movie.imdbId,
                    plot: "full"
                });
            }

            /*
               إذا لم نجد IMDb ID نحاول البحث بالعنوان.
            */

            if (!omdb && movie.title) {
                omdb = await omdbRequest({
                    t: movie.title,
                    type: "movie",
                    plot: "full"
                });
            }

            if (omdb) {
                const imdbRating =
                    omdb.imdbRating &&
                    omdb.imdbRating !== "N/A"
                        ? numberOrNull(omdb.imdbRating)
                        : null;

                const imdbVotes =
                    omdb.imdbVotes &&
                    omdb.imdbVotes !== "N/A"
                        ? omdb.imdbVotes
                        : null;

                movie.imdbId =
                    omdb.imdbID ||
                    movie.imdbId ||
                    null;

                movie.imdbRating =
                    imdbRating;

                movie.imdbVotes =
                    imdbVotes;

                movie.year =
                    omdb.Year !== "N/A"
                        ? omdb.Year
                        : movie.year;

                movie.runtime =
                    omdb.Runtime !== "N/A"
                        ? omdb.Runtime
                        : null;

                movie.rated =
                    omdb.Rated !== "N/A"
                        ? omdb.Rated
                        : null;

                movie.director =
                    omdb.Director !== "N/A"
                        ? omdb.Director
                        : null;

                movie.writer =
                    omdb.Writer !== "N/A"
                        ? omdb.Writer
                        : null;

                movie.country =
                    omdb.Country !== "N/A"
                        ? omdb.Country
                        : null;

                movie.language =
                    omdb.Language !== "N/A"
                        ? omdb.Language
                        : null;

                movie.awards =
                    omdb.Awards !== "N/A"
                        ? omdb.Awards
                        : null;

                movie.production =
                    omdb.Production !== "N/A"
                        ? omdb.Production
                        : null;

                movie.actors =
                    omdb.Actors &&
                    omdb.Actors !== "N/A"
                        ? omdb.Actors
                            .split(",")
                            .map(x => x.trim())
                            .filter(Boolean)
                        : [];

                /*
                   OMDb يعطي Poster أحيانًا.
                   إذا TMDB لا يملك صورة، نستخدم صورة OMDb.
                */

                if (
                    (!movie.poster ||
                        movie.poster === "N/A") &&
                    omdb.Poster &&
                    omdb.Poster !== "N/A"
                ) {
                    movie.poster = omdb.Poster;
                }

                /*
                   إذا لم يوجد وصف في TMDB،
                   نستخدم Plot من OMDb.
                */

                if (
                    (!movie.overview ||
                        movie.overview === "لا يوجد وصف متوفر.") &&
                    omdb.Plot &&
                    omdb.Plot !== "N/A"
                ) {
                    movie.overview = omdb.Plot;
                }

                /*
                   تقييم OMDb يكون منفصلًا عن TMDB.
                */

                movie.ratings = {
                    tmdb: movie.rating,
                    imdb: imdbRating,
                    imdbVotes
                };
            }

            movie.updatedAt =
                new Date().toISOString();

            result.push(movie);

            /*
               تأخير بسيط لتقليل الضغط على OMDb.
            */

            await sleep(120);
        } catch (error) {
            console.log(
                `OMDb FAILED [${movie.title}]:`,
                error.message
            );

            result.push(movie);
        }
    }

    /*
       باقي الأفلام بدون OMDb enrichment.
    */

    for (let i = limit; i < movies.length; i++) {
        result.push(movies[i]);
    }

    return result;
}

/* =========================================================
   Sleep
========================================================= */

function sleep(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

/* =========================================================
   Full Sync
========================================================= */

let syncRunning = false;

async function syncMovies() {
    if (syncRunning) {
        console.log(
            "MOVIE SYNC → already running"
        );

        return loadMovies();
    }

    syncRunning = true;

    try {
        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "NOVA CINEMA → MOVIE SYNC START"
        );
        console.log(
            "================================"
        );

        if (!TMDB_ACCESS_TOKEN && !TMDB_API_KEY) {
            throw new Error(
                "TMDB API credentials are missing."
            );
        }

        let movies =
            await getTmdbMovies();

        console.log(
            `TMDB → ${movies.length} movies`
        );

        /*
           الحصول على IMDb IDs
        */

        movies =
            await enrichFromTmdb(movies);

        /*
           دمج بيانات OMDb
        */

        movies =
            await enrichFromOmdb(movies);

        /*
           تنظيف وترتيب
        */

        movies = uniqueMovies(movies);

        movies.sort((a, b) => {
            const popularityA =
                Number(a.popularity) || 0;

            const popularityB =
                Number(b.popularity) || 0;

            return popularityB - popularityA;
        });

        saveMovies(movies);

        console.log(
            `MOVIE SYNC → SAVED ${movies.length} movies`
        );

        console.log(
            "================================"
        );
        console.log(
            "NOVA CINEMA → MOVIE SYNC DONE"
        );
        console.log(
            "================================"
        );
        console.log("");

        return movies;
    } catch (error) {
        console.error(
            "MOVIE SYNC ERROR:",
            error.message
        );

        return loadMovies();
    } finally {
        syncRunning = false;
    }
}

/* =========================================================
   Cache Check
========================================================= */

function cacheNeedsSync() {
    if (!fs.existsSync(MOVIES_FILE)) {
        return true;
    }

    try {
        const stats =
            fs.statSync(MOVIES_FILE);

        const age =
            Date.now() - stats.mtimeMs;

        const maxAge =
            CACHE_HOURS *
            60 *
            60 *
            1000;

        return age >= maxAge;
    } catch {
        return true;
    }
}

/* =========================================================
   Protected Files
========================================================= */

const BLOCKED_FILES = new Set([
    "/config.json",
    "/package.json",
    "/package-lock.json",
    "/server.js",
    "/bot.js",
    "/data/movies.json",
    "/.env"
]);

app.use((req, res, next) => {
    if (BLOCKED_FILES.has(req.path)) {
        return res.status(403).json({
            error: "Forbidden"
        });
    }

    next();
});

/* =========================================================
   Health
========================================================= */

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        service: "NOVA CINEMA",
        discord: false,
        tmdb: Boolean(
            TMDB_ACCESS_TOKEN ||
            TMDB_API_KEY
        ),
        omdb: Boolean(OMDB_API_KEY),
        time: new Date().toISOString()
    });
});

/* =========================================================
   Status
========================================================= */

app.get("/api/status", (req, res) => {
    const movies = loadMovies();

    let lastUpdate = null;

    if (fs.existsSync(MOVIES_FILE)) {
        try {
            lastUpdate =
                fs.statSync(
                    MOVIES_FILE
                ).mtime.toISOString();
        } catch {}
    }

    res.json({
        success: true,

        service: "NOVA CINEMA",

        movies: movies.length,

        sources: {
            tmdb: Boolean(
                TMDB_ACCESS_TOKEN ||
                TMDB_API_KEY
            ),

            omdb: Boolean(
                OMDB_API_KEY
            )
        },

        cacheHours: CACHE_HOURS,

        lastUpdate,

        syncRunning,

        discord: false
    });
});

/* =========================================================
   Movies API
========================================================= */

app.get("/api/movies", (req, res) => {
    let movies = loadMovies();

    const search =
        cleanText(req.query.search)
            .toLowerCase();

    const genre =
        cleanText(req.query.genre)
            .toLowerCase();

    const category =
        cleanText(req.query.category)
            .toLowerCase();

    const sort =
        cleanText(req.query.sort)
            .toLowerCase();

    if (search) {
        movies = movies.filter(movie => {
            const title =
                cleanText(movie.title)
                    .toLowerCase();

            const originalTitle =
                cleanText(movie.originalTitle)
                    .toLowerCase();

            const overview =
                cleanText(movie.overview)
                    .toLowerCase();

            const imdbId =
                cleanText(movie.imdbId)
                    .toLowerCase();

            return (
                title.includes(search) ||
                originalTitle.includes(search) ||
                overview.includes(search) ||
                imdbId.includes(search)
            );
        });
    }

    if (genre) {
        movies = movies.filter(movie =>
            Array.isArray(movie.genres) &&
            movie.genres.some(g =>
                String(g)
                    .toLowerCase()
                    .includes(genre)
            )
        );
    }

    if (category) {
        movies = movies.filter(movie =>
            String(movie.category || "")
                .toLowerCase() === category
        );
    }

    switch (sort) {
        case "rating":
        case "top":
            movies.sort(
                (a, b) =>
                    (Number(b.rating) || 0) -
                    (Number(a.rating) || 0)
            );
            break;

        case "imdb":
            movies.sort(
                (a, b) =>
                    (Number(b.imdbRating) || 0) -
                    (Number(a.imdbRating) || 0)
            );
            break;

        case "new":
        case "newest":
            movies.sort(
                (a, b) =>
                    String(b.releaseDate || "")
                        .localeCompare(
                            String(a.releaseDate || "")
                        )
            );
            break;

        case "old":
        case "oldest":
            movies.sort(
                (a, b) =>
                    String(a.releaseDate || "")
                        .localeCompare(
                            String(b.releaseDate || "")
                        )
            );
            break;

        case "popular":
        default:
            movies.sort(
                (a, b) =>
                    (Number(b.popularity) || 0) -
                    (Number(a.popularity) || 0)
            );
            break;
    }

    res.json({
        success: true,
        count: movies.length,
        movies
    });
});

/* =========================================================
   Single Movie
========================================================= */

app.get("/api/movies/:id", (req, res) => {
    const movies = loadMovies();

    const id =
        cleanText(req.params.id);

    const movie = movies.find(item =>
        String(item.id) === id ||
        String(item.tmdbId) === id ||
        String(item.imdbId) === id
    );

    if (!movie) {
        return res.status(404).json({
            success: false,
            error: "Movie not found"
        });
    }

    res.json({
        success: true,
        movie
    });
});

/* =========================================================
   Manual Sync
========================================================= */

app.post("/api/sync", async (req, res) => {
    if (SYNC_SECRET) {
        const provided =
            req.headers["x-sync-secret"];

        if (
            !provided ||
            provided !== SYNC_SECRET
        ) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized"
            });
        }
    }

    if (syncRunning) {
        return res.json({
            success: true,
            message: "Sync already running"
        });
    }

    syncMovies();

    res.json({
        success: true,
        message: "Movie sync started"
    });
});

/* =========================================================
   Static Website
========================================================= */

app.use(
    express.static(__dirname, {
        extensions: ["html"]
    })
);

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            error: "API route not found"
        });
    }

    res.status(404).send(
        "NOVA CINEMA → الصفحة غير موجودة"
    );
});

/* =========================================================
   Startup
========================================================= */

async function start() {
    ensureDataDirectory();

    app.listen(PORT, () => {
        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "NOVA CINEMA WEBSITE ONLINE"
        );
        console.log(
            `LOCAL → http://localhost:${PORT}`
        );
        console.log(
            `TMDB → ${
                TMDB_ACCESS_TOKEN ||
                TMDB_API_KEY
                    ? "ENABLED"
                    : "DISABLED"
            }`
        );
        console.log(
            `OMDb → ${
                OMDB_API_KEY
                    ? "ENABLED"
                    : "DISABLED"
            }`
        );
        console.log(
            "DISCORD → DISABLED"
        );
        console.log(
            "================================"
        );
        console.log("");
    });

    /*
       إذا الكاش قديم، حدث البيانات تلقائيًا.
    */

    if (cacheNeedsSync()) {
        await syncMovies();
    } else {
        const movies = loadMovies();

        console.log(
            `MOVIE CACHE → ${movies.length} movies`
        );
    }

    /*
       تحديث تلقائي.
    */

    setInterval(
        async () => {
            if (cacheNeedsSync()) {
                await syncMovies();
            }
        },
        30 * 60 * 1000
    );
}

start().catch(error => {
    console.error(
        "STARTUP ERROR:",
        error
    );
});
