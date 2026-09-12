"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const config = require("./config.json");

const app = express();

const PORT = process.env.PORT || config.port || 3000;

const DATA_DIR = path.join(__dirname, "data");
const MOVIES_FILE = path.join(DATA_DIR, "movies.json");

/* =========================================================
   API CONFIG
========================================================= */

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

/* =========================================================
   API URLS
========================================================= */

const TMDB_BASE =
    "https://api.themoviedb.org/3";

const TMDB_IMAGE =
    "https://image.tmdb.org/t/p/w500";

const TMDB_BACKDROP =
    "https://image.tmdb.org/t/p/w1280";

const OMDB_BASE =
    "https://www.omdbapi.com/";

const TVMAZE_BASE =
    "https://api.tvmaze.com";

const JIKAN_BASE =
    "https://api.jikan.moe/v4";

/* =========================================================
   EXPRESS
========================================================= */

app.use(
    express.json({
        limit: "1mb"
    })
);

/* =========================================================
   GENRES
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
   HELPERS
========================================================= */

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {
            recursive: true
        });
    }
}

function loadMovies() {
    ensureDataDirectory();

    if (!fs.existsSync(MOVIES_FILE)) {
        return [];
    }

    try {
        const raw =
            fs.readFileSync(
                MOVIES_FILE,
                "utf8"
            );

        if (!raw.trim()) {
            return [];
        }

        const data =
            JSON.parse(raw);

        return Array.isArray(data)
            ? data
            : [];
    } catch (error) {
        console.error(
            "MOVIES LOAD ERROR:",
            error.message
        );

        return [];
    }
}

function saveMovies(movies) {
    ensureDataDirectory();

    fs.writeFileSync(
        MOVIES_FILE,
        JSON.stringify(
            movies,
            null,
            2
        ),
        "utf8"
    );
}

function cleanText(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}

function numberOrNull(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function sleep(ms) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

/* =========================================================
   UNIQUE MOVIES
========================================================= */

function uniqueMovies(movies) {
    const map = new Map();

    for (const movie of movies) {
        if (!movie) {
            continue;
        }

        const key =
            movie.imdbId ||
            (
                movie.tmdbId
                    ? `tmdb-${movie.tmdbId}`
                    : null
            ) ||
            (
                movie.tvmazeId
                    ? `tvmaze-${movie.tvmazeId}`
                    : null
            ) ||
            (
                movie.malId
                    ? `mal-${movie.malId}`
                    : null
            ) ||
            movie.id ||
            movie.title?.toLowerCase();

        if (!key) {
            continue;
        }

        if (!map.has(key)) {
            map.set(
                key,
                movie
            );
        } else {
            const old =
                map.get(key);

            map.set(
                key,
                mergeMovieData(
                    old,
                    movie
                )
            );
        }
    }

    return Array.from(
        map.values()
    );
}

/* =========================================================
   MERGE MOVIE DATA
========================================================= */

function mergeMovieData(
    oldMovie,
    newMovie
) {
    const merged = {
        ...oldMovie,
        ...newMovie
    };

    /*
       لا تستبدل البيانات الجيدة بقيم فارغة.
    */

    const fields = [
        "title",
        "originalTitle",
        "overview",
        "poster",
        "backdrop",
        "releaseDate",
        "year",
        "rating",
        "imdbRating",
        "runtime",
        "rated",
        "country",
        "language",
        "director",
        "writer",
        "production"
    ];

    for (const field of fields) {
        if (
            !merged[field] &&
            oldMovie[field]
        ) {
            merged[field] =
                oldMovie[field];
        }
    }

    if (
        (!Array.isArray(
            merged.actors
        ) ||
            merged.actors.length === 0) &&
        Array.isArray(
            oldMovie.actors
        )
    ) {
        merged.actors =
            oldMovie.actors;
    }

    if (
        (!Array.isArray(
            merged.genres
        ) ||
            merged.genres.length === 0) &&
        Array.isArray(
            oldMovie.genres
        )
    ) {
        merged.genres =
            oldMovie.genres;
    }

    return merged;
}

/* =========================================================
   TMDB REQUEST
========================================================= */

async function tmdbRequest(
    endpoint,
    params = {}
) {
    const url =
        new URL(
            `${TMDB_BASE}${endpoint}`
        );

    for (
        const [
            key,
            value
        ] of Object.entries(params)
    ) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(
                key,
                value
            );
        }
    }

    const headers = {
        Accept:
            "application/json"
    };

    if (TMDB_ACCESS_TOKEN) {
        headers.Authorization =
            `Bearer ${TMDB_ACCESS_TOKEN}`;
    }

    if (
        !TMDB_ACCESS_TOKEN &&
        TMDB_API_KEY
    ) {
        url.searchParams.set(
            "api_key",
            TMDB_API_KEY
        );
    }

    const response =
        await fetch(
            url,
            {
                method: "GET",
                headers
            }
        );

    if (!response.ok) {
        const text =
            await response.text();

        throw new Error(
            `TMDB ${response.status}: ${text.slice(
                0,
                300
            )}`
        );
    }

    return response.json();
}

/* =========================================================
   OMDB REQUEST
========================================================= */

async function omdbRequest(
    params = {}
) {
    if (!OMDB_API_KEY) {
        return null;
    }

    const url =
        new URL(
            OMDB_BASE
        );

    url.searchParams.set(
        "apikey",
        OMDB_API_KEY
    );

    for (
        const [
            key,
            value
        ] of Object.entries(params)
    ) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(
                key,
                value
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
        return null;
    }

    return data;
}

/* =========================================================
   TVMAZE REQUEST
========================================================= */

async function tvmazeRequest(
    endpoint
) {
    const response =
        await fetch(
            `${TVMAZE_BASE}${endpoint}`
        );

    if (!response.ok) {
        throw new Error(
            `TVmaze ${response.status}`
        );
    }

    return response.json();
}

/* =========================================================
   JIKAN REQUEST
========================================================= */

async function jikanRequest(
    endpoint
) {
    const response =
        await fetch(
            `${JIKAN_BASE}${endpoint}`
        );

    if (!response.ok) {
        throw new Error(
            `Jikan ${response.status}`
        );
    }

    return response.json();
}

/* =========================================================
   TMDB EXTERNAL IDS
========================================================= */

async function getTmdbExternalIds(
    tmdbId
) {
    try {
        const data =
            await tmdbRequest(
                `/movie/${tmdbId}/external_ids`
            );

        return {
            imdbId:
                data?.imdb_id ||
                null
        };
    } catch {
        return {
            imdbId: null
        };
    }
}

/* =========================================================
   TMDB MOVIE NORMALIZER
========================================================= */

function normalizeTmdbMovie(
    movie,
    category = "popular"
) {
    const title =
        movie.title ||
        movie.original_title ||
        "فيلم بدون اسم";

    const genres =
        Array.isArray(
            movie.genre_ids
        )
            ? movie.genre_ids
                .map(
                    id =>
                        GENRES[id]
                )
                .filter(Boolean)
            : [];

    return {
        id:
            `tmdb-${movie.id}`,

        tmdbId:
            movie.id,

        source:
            "tmdb",

        type:
            "movie",

        title,

        originalTitle:
            movie.original_title ||
            title,

        overview:
            movie.overview ||
            "لا يوجد وصف متوفر.",

        poster:
            movie.poster_path
                ? `${TMDB_IMAGE}${movie.poster_path}`
                : null,

        backdrop:
            movie.backdrop_path
                ? `${TMDB_BACKDROP}${movie.backdrop_path}`
                : null,

        releaseDate:
            movie.release_date ||
            null,

        year:
            movie.release_date
                ? movie.release_date.slice(
                    0,
                    4
                )
                : null,

        rating:
            numberOrNull(
                movie.vote_average
            ),

        votes:
            numberOrNull(
                movie.vote_count
            ),

        popularity:
            numberOrNull(
                movie.popularity
            ),

        genres,

        category,

        imdbId:
            null,

        imdbRating:
            null,

        imdbVotes:
            null,

        actors: [],

        director:
            null,

        writer:
            null,

        runtime:
            null,

        rated:
            null,

        country:
            null,

        language:
            null,

        awards:
            null,

        production:
            null,

        trailer:
            null,

        updatedAt:
            new Date().toISOString()
    };
}

/* =========================================================
   GET TMDB MOVIES
========================================================= */

async function getTmdbMovies() {
    if (
        !TMDB_ACCESS_TOKEN &&
        !TMDB_API_KEY
    ) {
        console.log(
            "TMDB → DISABLED"
        );

        return [];
    }

    const movies = [];

    const requests = [
        {
            endpoint:
                "/movie/popular",

            params: {
                language:
                    "ar-SA",
                region:
                    "IQ",
                page: 1
            },

            category:
                "popular"
        },

        {
            endpoint:
                "/trending/movie/week",

            params: {
                language:
                    "ar-SA"
            },

            category:
                "trending"
        },

        {
            endpoint:
                "/movie/top_rated",

            params: {
                language:
                    "ar-SA",
                region:
                    "IQ",
                page: 1
            },

            category:
                "top_rated"
        },

        {
            endpoint:
                "/movie/now_playing",

            params: {
                language:
                    "ar-SA",
                region:
                    "IQ",
                page: 1
            },

            category:
                "now_playing"
        },

        {
            endpoint:
                "/movie/upcoming",

            params: {
                language:
                    "ar-SA",
                region:
                    "IQ",
                page: 1
            },

            category:
                "upcoming"
        }
    ];

    for (
        const request of requests
    ) {
        try {
            const data =
                await tmdbRequest(
                    request.endpoint,
                    request.params
                );

            if (
                !Array.isArray(
                    data?.results
                )
            ) {
                continue;
            }

            for (
                const movie
                of data.results
            ) {
                movies.push(
                    normalizeTmdbMovie(
                        movie,
                        request.category
                    )
                );
            }
        } catch (error) {
            console.log(
                `TMDB ${request.category} → FAILED`
            );
        }
    }

    return uniqueMovies(
        movies
    );
}

/* =========================================================
   TMDB ENRICHMENT
========================================================= */

async function enrichFromTmdb(
    movies
) {
    const limit =
        Math.min(
            movies.length,
            40
        );

    for (
        let i = 0;
        i < limit;
        i++
    ) {
        const movie =
            movies[i];

        if (
            !movie.tmdbId
        ) {
            continue;
        }

        try {
            const externalIds =
                await getTmdbExternalIds(
                    movie.tmdbId
                );

            movie.imdbId =
                externalIds.imdbId ||
                movie.imdbId ||
                null;
        } catch {}
    }

    return movies;
}

/* =========================================================
   OMDB ENRICHMENT
========================================================= */

async function enrichFromOmdb(
    movies
) {
    if (!OMDB_API_KEY) {
        console.log(
            "OMDb → DISABLED"
        );

        return movies;
    }

    const limit =
        Math.min(
            movies.length,
            40
        );

    console.log(
        `OMDb → ${limit} items`
    );

    for (
        let i = 0;
        i < limit;
        i++
    ) {
        const movie =
            movies[i];

        try {
            let omdb =
                null;

            /*
               أولًا IMDb ID
            */

            if (
                movie.imdbId
            ) {
                omdb =
                    await omdbRequest({
                        i:
                            movie.imdbId,
                        plot:
                            "full"
                    });
            }

            /*
               إذا لا يوجد IMDb ID،
               نبحث بالعنوان.
            */

            if (
                !omdb &&
                movie.title
            ) {
                omdb =
                    await omdbRequest({
                        t:
                            movie.title,
                        plot:
                            "full"
                    });
            }

            if (!omdb) {
                continue;
            }

            movie.imdbId =
                omdb.imdbID ||
                movie.imdbId ||
                null;

            movie.imdbRating =
                omdb.imdbRating !==
                    "N/A"
                    ? numberOrNull(
                        omdb.imdbRating
                    )
                    : null;

            movie.imdbVotes =
                omdb.imdbVotes !==
                    "N/A"
                    ? omdb.imdbVotes
                    : null;

            if (
                omdb.Year &&
                omdb.Year !== "N/A"
            ) {
                movie.year =
                    omdb.Year;
            }

            if (
                omdb.Runtime &&
                omdb.Runtime !== "N/A"
            ) {
                movie.runtime =
                    omdb.Runtime;
            }

            if (
                omdb.Rated &&
                omdb.Rated !== "N/A"
            ) {
                movie.rated =
                    omdb.Rated;
            }

            if (
                omdb.Director &&
                omdb.Director !== "N/A"
            ) {
                movie.director =
                    omdb.Director;
            }

            if (
                omdb.Writer &&
                omdb.Writer !== "N/A"
            ) {
                movie.writer =
                    omdb.Writer;
            }

            if (
                omdb.Country &&
                omdb.Country !== "N/A"
            ) {
                movie.country =
                    omdb.Country;
            }

            if (
                omdb.Language &&
                omdb.Language !== "N/A"
            ) {
                movie.language =
                    omdb.Language;
            }

            if (
                omdb.Awards &&
                omdb.Awards !== "N/A"
            ) {
                movie.awards =
                    omdb.Awards;
            }

            if (
                omdb.Production &&
                omdb.Production !== "N/A"
            ) {
                movie.production =
                    omdb.Production;
            }

            if (
                omdb.Actors &&
                omdb.Actors !== "N/A"
            ) {
                movie.actors =
                    omdb.Actors
                        .split(",")
                        .map(
                            x =>
                                x.trim()
                        )
                        .filter(
                            Boolean
                        );
            }

            if (
                (!movie.poster ||
                    movie.poster ===
                        "N/A") &&
                omdb.Poster &&
                omdb.Poster !== "N/A"
            ) {
                movie.poster =
                    omdb.Poster;
            }

            if (
                (!movie.overview ||
                    movie.overview ===
                        "لا يوجد وصف متوفر.") &&
                omdb.Plot &&
                omdb.Plot !== "N/A"
            ) {
                movie.overview =
                    omdb.Plot;
            }

            movie.ratings = {
                tmdb:
                    movie.rating,
                imdb:
                    movie.imdbRating,
                imdbVotes:
                    movie.imdbVotes
            };

            movie.updatedAt =
                new Date().toISOString();

            /*
               حماية من استهلاك OMDb بسرعة.
            */

            await sleep(120);
        } catch {
            console.log(
                `OMDb → FAILED → ${movie.title}`
            );
        }
    }

    return movies;
}

/* =========================================================
   TVMAZE
========================================================= */

function normalizeTvmazeShow(
    show
) {
    const image =
        show.image || {};

    const premiered =
        show.premiered ||
        null;

    const genres =
        Array.isArray(
            show.genres
        )
            ? show.genres
            : [];

    return {
        id:
            `tvmaze-${show.id}`,

        tvmazeId:
            show.id,

        source:
            "tvmaze",

        type:
            "series",

        title:
            show.name ||
            "مسلسل بدون اسم",

        originalTitle:
            show.name ||
            "",

        overview:
            stripHtml(
                show.summary ||
                ""
            ) ||
            "لا يوجد وصف متوفر.",

        poster:
            image.original ||
            image.medium ||
            null,

        backdrop:
            image.original ||
            null,

        releaseDate:
            premiered,

        year:
            premiered
                ? premiered.slice(
                    0,
                    4
                )
                : null,

        rating:
            numberOrNull(
                show.rating?.average
            ),

        votes:
            null,

        popularity:
            null,

        genres,

        category:
            "series",

        status:
            show.status ||
            null,

        language:
            show.language ||
            null,

        country:
            show.network?.country?.name ||
            show.webChannel?.country?.name ||
            null,

        runtime:
            show.runtime ||
            show.averageRuntime ||
            null,

        imdbId:
            show.externals?.imdb ||
            null,

        imdbRating:
            null,

        imdbVotes:
            null,

        actors: [],

        director:
            null,

        writer:
            null,

        episodes:
            null,

        network:
            show.network?.name ||
            show.webChannel?.name ||
            null,

        trailer:
            null,

        updatedAt:
            new Date().toISOString()
    };
}

function stripHtml(
    text
) {
    return String(text || "")
        .replace(
            /<[^>]*>/g,
            ""
        )
        .replace(
            /&nbsp;/g,
            " "
        )
        .replace(
            /&amp;/g,
            "&"
        )
        .trim();
}

async function getTvmazeShows() {
    const shows = [];

    try {
        /*
           الصفحة الأولى
        */

        const data =
            await tvmazeRequest(
                "/shows?page=0"
            );

        if (
            Array.isArray(data)
        ) {
            for (
                const show
                of data
            ) {
                shows.push(
                    normalizeTvmazeShow(
                        show
                    )
                );
            }
        }

        /*
           الصفحة الثانية
           لزيادة التنوع.
        */

        const second =
            await tvmazeRequest(
                "/shows?page=1"
            );

        if (
            Array.isArray(second)
        ) {
            for (
                const show
                of second
            ) {
                shows.push(
                    normalizeTvmazeShow(
                        show
                    )
                );
            }
        }

        console.log(
            `TVmaze → ${shows.length} series`
        );
    } catch (error) {
        console.log(
            "TVmaze → DISABLED/FAILED"
        );
    }

    return uniqueMovies(
        shows
    );
}

/* =========================================================
   JIKAN / ANIME
========================================================= */

function normalizeAnime(
    anime
) {
    const images =
        anime.images?.jpg || {};

    const aired =
        anime.aired || {};

    const title =
        anime.title ||
        anime.title_english ||
        anime.title_japanese ||
        "أنمي بدون اسم";

    const genres = [
        ...(anime.genres || []),
        ...(anime.themes || [])
    ]
        .map(
            item =>
                item?.name
        )
        .filter(Boolean);

    return {
        id:
            `mal-${anime.mal_id}`,

        malId:
            anime.mal_id,

        source:
            "jikan",

        type:
            "anime",

        title,

        originalTitle:
            anime.title_japanese ||
            anime.title ||
            title,

        englishTitle:
            anime.title_english ||
            null,

        overview:
            anime.synopsis ||
            "لا يوجد وصف متوفر.",

        poster:
            images.large_image_url ||
            images.image_url ||
            null,

        backdrop:
            null,

        releaseDate:
            aired.from ||
            null,

        year:
            aired.from
                ? aired.from.slice(
                    0,
                    4
                )
                : null,

        rating:
            numberOrNull(
                anime.score
            ),

        votes:
            numberOrNull(
                anime.scored_by
            ),

        popularity:
            numberOrNull(
                anime.popularity
            ),

        genres,

        category:
            "anime",

        status:
            anime.status ||
            null,

        episodes:
            anime.episodes ||
            null,

        duration:
            anime.duration ||
            null,

        season:
            anime.season ||
            null,

        yearSeason:
            anime.year ||
            null,

        sourceUrl:
            anime.url ||
            null,

        imdbId:
            null,

        imdbRating:
            null,

        imdbVotes:
            null,

        actors: [],

        director:
            null,

        writer:
            null,

        runtime:
            null,

        rated:
            null,

        country:
            null,

        language:
            null,

        awards:
            null,

        production:
            anime.studios
                ?.map(
                    studio =>
                        studio.name
                )
                .filter(Boolean) ||
                [],

        trailer:
            anime.trailer?.url ||
            null,

        updatedAt:
            new Date().toISOString()
    };
}

async function getAnime() {
    const animeList = [];

    try {
        const requests = [
            "/top/anime?limit=25",

            "/anime?status=airing&order_by=score&sort=desc&limit=25",

            "/anime?status=complete&order_by=score&sort=desc&limit=25"
        ];

        for (
            const endpoint
            of requests
        ) {
            try {
                const data =
                    await jikanRequest(
                        endpoint
                    );

                if (
                    Array.isArray(
                        data?.data
                    )
                ) {
                    for (
                        const anime
                        of data.data
                    ) {
                        animeList.push(
                            normalizeAnime(
                                anime
                            )
                        );
                    }
                }

                /*
                   Jikan يضع حدًا للطلبات.
                   تأخير بسيط.
                */

                await sleep(500);
            } catch {
                console.log(
                    `Jikan → REQUEST FAILED`
                );
            }
        }

        console.log(
            `Jikan → ${animeList.length} anime`
        );
    } catch {
        console.log(
            "Jikan → DISABLED/FAILED"
        );
    }

    return uniqueMovies(
        animeList
    );
}

/* =========================================================
   ENRICH TVMAZE WITH OMDB
========================================================= */

async function enrichSeriesWithOmdb(
    series
) {
    if (!OMDB_API_KEY) {
        return series;
    }

    const limit =
        Math.min(
            series.length,
            20
        );

    for (
        let i = 0;
        i < limit;
        i++
    ) {
        const item =
            series[i];

        try {
            let omdb =
                null;

            if (
                item.imdbId
            ) {
                omdb =
                    await omdbRequest({
                        i:
                            item.imdbId,
                        plot:
                            "full"
                    });
            }

            if (
                !omdb &&
                item.title
            ) {
                omdb =
                    await omdbRequest({
                        t:
                            item.title,
                        type:
                            "series",
                        plot:
                            "full"
                    });
            }

            if (!omdb) {
                continue;
            }

            item.imdbId =
                omdb.imdbID ||
                item.imdbId ||
                null;

            item.imdbRating =
                omdb.imdbRating !==
                    "N/A"
                    ? numberOrNull(
                        omdb.imdbRating
                    )
                    : null;

            item.imdbVotes =
                omdb.imdbVotes !==
                    "N/A"
                    ? omdb.imdbVotes
                    : null;

            item.director =
                omdb.Director !==
                    "N/A"
                    ? omdb.Director
                    : null;

            item.writer =
                omdb.Writer !==
                    "N/A"
                    ? omdb.Writer
                    : null;

            item.actors =
                omdb.Actors &&
                omdb.Actors !== "N/A"
                    ? omdb.Actors
                        .split(",")
                        .map(
                            x =>
                                x.trim()
                        )
                        .filter(
                            Boolean
                        )
                    : [];

            item.country =
                omdb.Country !==
                    "N/A"
                    ? omdb.Country
                    : item.country;

            item.language =
                omdb.Language !==
                    "N/A"
                    ? omdb.Language
                    : item.language;

            if (
                omdb.Poster &&
                omdb.Poster !==
                    "N/A" &&
                !item.poster
            ) {
                item.poster =
                    omdb.Poster;
            }

            item.ratings = {
                imdb:
                    item.imdbRating,
                imdbVotes:
                    item.imdbVotes
            };

            await sleep(120);
        } catch {}
    }

    return series;
}

/* =========================================================
   FULL SYNC
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
            "NOVA CINEMA → SMART SYNC"
        );
        console.log(
            "================================"
        );

        /*
           كل مصدر مستقل.
        */

        let tmdbMovies = [];
        let tvmazeShows = [];
        let anime = [];

        try {
            tmdbMovies =
                await getTmdbMovies();
        } catch {
            console.log(
                "TMDB → SKIPPED"
            );
        }

        console.log(
            `TMDB → ${tmdbMovies.length}`
        );

        /*
           IMDb IDs من TMDB
        */

        if (
            tmdbMovies.length
        ) {
            try {
                tmdbMovies =
                    await enrichFromTmdb(
                        tmdbMovies
                    );
            } catch {}
        }

        /*
           OMDb للأفلام
        */

        if (
            tmdbMovies.length
        ) {
            try {
                tmdbMovies =
                    await enrichFromOmdb(
                        tmdbMovies
                    );
            } catch {
                console.log(
                    "OMDb movies → SKIPPED"
                );
            }
        }

        /*
           TVmaze
        */

        try {
            tvmazeShows =
                await getTvmazeShows();
        } catch {
            console.log(
                "TVmaze → SKIPPED"
            );
        }

        /*
           OMDb للمسلسلات
        */

        if (
            tvmazeShows.length &&
            OMDB_API_KEY
        ) {
            try {
                tvmazeShows =
                    await enrichSeriesWithOmdb(
                        tvmazeShows
                    );
            } catch {}
        }

        /*
           Jikan
        */

        try {
            anime =
                await getAnime();
        } catch {
            console.log(
                "Jikan → SKIPPED"
            );
        }

        /*
           دمج الكل
        */

        let all =
            [
                ...tmdbMovies,
                ...tvmazeShows,
                ...anime
            ];

        all =
            uniqueMovies(all);

        /*
           ترتيب ذكي:
           الشعبية ثم التقييم.
        */

        all.sort(
            (a, b) => {
                const popularityA =
                    Number(
                        a.popularity
                    ) || 0;

                const popularityB =
                    Number(
                        b.popularity
                    ) || 0;

                if (
                    popularityA !==
                    popularityB
                ) {
                    return (
                        popularityB -
                        popularityA
                    );
                }

                return (
                    (Number(
                        b.rating
                    ) || 0) -
                    (Number(
                        a.rating
                    ) || 0)
                );
            }
        );

        saveMovies(all);

        console.log(
            `FINAL DATABASE → ${all.length} items`
        );

        console.log(
            `MOVIES → ${
                all.filter(
                    x =>
                        x.type ===
                        "movie"
                ).length
            }`
        );

        console.log(
            `SERIES → ${
                all.filter(
                    x =>
                        x.type ===
                        "series"
                ).length
            }`
        );

        console.log(
            `ANIME → ${
                all.filter(
                    x =>
                        x.type ===
                        "anime"
                ).length
            }`
        );

        console.log(
            "================================"
        );
        console.log(
            "NOVA CINEMA → SYNC DONE"
        );
        console.log(
            "================================"
        );
        console.log("");

        return all;
    } catch (error) {
        console.error(
            "MOVIE SYNC ERROR:",
            error.message
        );

        /*
           أهم شيء:
           لا نمسح الكاش القديم.
        */

        return loadMovies();
    } finally {
        syncRunning = false;
    }
}

/* =========================================================
   CACHE CHECK
========================================================= */

function cacheNeedsSync() {
    if (
        !fs.existsSync(
            MOVIES_FILE
        )
    ) {
        return true;
    }

    try {
        const stats =
            fs.statSync(
                MOVIES_FILE
            );

        const age =
            Date.now() -
            stats.mtimeMs;

        const maxAge =
            CACHE_HOURS *
            60 *
            60 *
            1000;

        return (
            age >= maxAge
        );
    } catch {
        return true;
    }
}

/* =========================================================
   BLOCKED FILES
========================================================= */

const BLOCKED_FILES =
    new Set([
        "/config.json",
        "/package.json",
        "/package-lock.json",
        "/server.js",
        "/bot.js",
        "/.env",
        "/data/movies.json"
    ]);

app.use(
    (
        req,
        res,
        next
    ) => {
        if (
            BLOCKED_FILES.has(
                req.path
            )
        ) {
            return res
                .status(403)
                .json({
                    error:
                        "Forbidden"
                });
        }

        next();
    }
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
    "/health",
    (
        req,
        res
    ) => {
        res.json({
            ok: true,

            service:
                "NOVA CINEMA",

            sources: {
                tmdb:
                    Boolean(
                        TMDB_ACCESS_TOKEN ||
                        TMDB_API_KEY
                    ),

                omdb:
                    Boolean(
                        OMDB_API_KEY
                    ),

                tvmaze:
                    true,

                jikan:
                    true
            },

            discord:
                false,

            time:
                new Date().toISOString()
        });
    }
);

/* =========================================================
   STATUS
========================================================= */

app.get(
    "/api/status",
    (
        req,
        res
    ) => {
        const movies =
            loadMovies();

        let lastUpdate =
            null;

        if (
            fs.existsSync(
                MOVIES_FILE
            )
        ) {
            try {
                lastUpdate =
                    fs.statSync(
                        MOVIES_FILE
                    )
                        .mtime
                        .toISOString();
            } catch {}
        }

        res.json({
            success:
                true,

            service:
                "NOVA CINEMA",

            total:
                movies.length,

            movies:
                movies.filter(
                    x =>
                        x.type ===
                        "movie"
                ).length,

            series:
                movies.filter(
                    x =>
                        x.type ===
                        "series"
                ).length,

            anime:
                movies.filter(
                    x =>
                        x.type ===
                        "anime"
                ).length,

            sources: {
                tmdb:
                    Boolean(
                        TMDB_ACCESS_TOKEN ||
                        TMDB_API_KEY
                    ),

                omdb:
                    Boolean(
                        OMDB_API_KEY
                    ),

                tvmaze:
                    true,

                jikan:
                    true
            },

            cacheHours:
                CACHE_HOURS,

            lastUpdate,

            syncRunning,

            discord:
                false
        });
    }
);

/* =========================================================
   MOVIES API
========================================================= */

app.get(
    "/api/movies",
    (
        req,
        res
    ) => {
        let movies =
            loadMovies();

        const search =
            cleanText(
                req.query.search
            ).toLowerCase();

        const genre =
            cleanText(
                req.query.genre
            ).toLowerCase();

        const category =
            cleanText(
                req.query.category
            ).toLowerCase();

        const type =
            cleanText(
                req.query.type
            ).toLowerCase();

        const sort =
            cleanText(
                req.query.sort
            ).toLowerCase();

        if (search) {
            movies =
                movies.filter(
                    movie => {
                        const title =
                            cleanText(
                                movie.title
                            )
                                .toLowerCase();

                        const originalTitle =
                            cleanText(
                                movie.originalTitle
                            )
                                .toLowerCase();

                        const englishTitle =
                            cleanText(
                                movie.englishTitle
                            )
                                .toLowerCase();

                        const overview =
                            cleanText(
                                movie.overview
                            )
                                .toLowerCase();

                        const imdbId =
                            cleanText(
                                movie.imdbId
                            )
                                .toLowerCase();

                        return (
                            title.includes(
                                search
                            ) ||
                            originalTitle.includes(
                                search
                            ) ||
                            englishTitle.includes(
                                search
                            ) ||
                            overview.includes(
                                search
                            ) ||
                            imdbId.includes(
                                search
                            )
                        );
                    }
                );
        }

        if (genre) {
            movies =
                movies.filter(
                    movie =>
                        Array.isArray(
                            movie.genres
                        ) &&
                        movie.genres.some(
                            g =>
                                String(g)
                                    .toLowerCase()
                                    .includes(
                                        genre
                                    )
                        )
                );
        }

        if (category) {
            movies =
                movies.filter(
                    movie =>
                        String(
                            movie.category ||
                            ""
                        )
                            .toLowerCase() ===
                        category
                );
        }

        if (type) {
            movies =
                movies.filter(
                    movie =>
                        String(
                            movie.type ||
                            ""
                        )
                            .toLowerCase() ===
                        type
                );
        }

        switch (sort) {
            case "rating":
            case "top":
                movies.sort(
                    (
                        a,
                        b
                    ) =>
                        (
                            Number(
                                b.rating
                            ) || 0
                        ) -
                        (
                            Number(
                                a.rating
                            ) || 0
                        )
                );
                break;

            case "imdb":
                movies.sort(
                    (
                        a,
                        b
                    ) =>
                        (
                            Number(
                                b.imdbRating
                            ) || 0
                        ) -
                        (
                            Number(
                                a.imdbRating
                            ) || 0
                        )
                );
                break;

            case "new":
            case "newest":
                movies.sort(
                    (
                        a,
                        b
                    ) =>
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

            case "old":
            case "oldest":
                movies.sort(
                    (
                        a,
                        b
                    ) =>
                        String(
                            a.releaseDate ||
                            ""
                        ).localeCompare(
                            String(
                                b.releaseDate ||
                                ""
                            )
                        )
                );
                break;

            case "popular":
            default:
                movies.sort(
                    (
                        a,
                        b
                    ) =>
                        (
                            Number(
                                b.popularity
                            ) || 0
                        ) -
                        (
                            Number(
                                a.popularity
                            ) || 0
                        )
                );
                break;
        }

        res.json({
            success:
                true,

            count:
                movies.length,

            movies
        });
    }
);

/* =========================================================
   SINGLE ITEM
========================================================= */

app.get(
    "/api/movies/:id",
    (
        req,
        res
    ) => {
        const movies =
            loadMovies();

        const id =
            cleanText(
                req.params.id
            );

        const movie =
            movies.find(
                item =>
                    String(
                        item.id
                    ) === id ||
                    String(
                        item.tmdbId
                    ) === id ||
                    String(
                        item.tvmazeId
                    ) === id ||
                    String(
                        item.malId
                    ) === id ||
                    String(
                        item.imdbId
                    ) === id
            );

        if (!movie) {
            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Movie not found"
                });
        }

        res.json({
            success:
                true,

            movie
        });
    }
);

/* =========================================================
   MANUAL SYNC
========================================================= */

app.post(
    "/api/sync",
    async (
        req,
        res
    ) => {
        if (SYNC_SECRET) {
            const provided =
                req.headers[
                    "x-sync-secret"
                ];

            if (
                !provided ||
                provided !==
                    SYNC_SECRET
            ) {
                return res
                    .status(401)
                    .json({
                        success:
                            false,

                        error:
                            "Unauthorized"
                    });
            }
        }

        if (syncRunning) {
            return res.json({
                success:
                    true,

                message:
                    "Sync already running"
            });
        }

        syncMovies();

        res.json({
            success:
                true,

            message:
                "Smart movie sync started"
        });
    }
);

/* =========================================================
   STATIC WEBSITE
========================================================= */

app.use(
    express.static(
        __dirname,
        {
            extensions: [
                "html"
            ]
        }
    )
);

/* =========================================================
   404
========================================================= */

app.use(
    (
        req,
        res
    ) => {
        if (
            req.path.startsWith(
                "/api/"
            )
        ) {
            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "API route not found"
                });
        }

        res
            .status(404)
            .send(
                "NOVA CINEMA → الصفحة غير موجودة"
            );
    }
);

/* =========================================================
   START
========================================================= */

async function start() {
    ensureDataDirectory();

    app.listen(
        PORT,
        () => {
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
                "TVmaze → ENABLED"
            );

            console.log(
                "Jikan Anime → ENABLED"
            );

            console.log(
                "DISCORD → DISABLED"
            );

            console.log(
                "================================"
            );

            console.log("");
        }
    );

    /*
       إذا ما عندنا كاش أو الكاش قديم:
       نبدأ مزامنة.
    */

    if (
        cacheNeedsSync()
    ) {
        await syncMovies();
    } else {
        const movies =
            loadMovies();

        console.log(
            `MOVIE CACHE → ${movies.length} items`
        );
    }

    /*
       فحص كل 30 دقيقة.
    */

    setInterval(
        async () => {
            if (
                cacheNeedsSync()
            ) {
                await syncMovies();
            }
        },
        30 * 60 * 1000
    );
}

start().catch(
    error => {
        console.error(
            "STARTUP ERROR:",
            error
        );
    }
);
