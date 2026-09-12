"use strict";

/*
=========================================================
 IRAQ EMPIRE CINEMA
 Central Content Catalog
=========================================================

المصادر:
- TMDB → أفلام + مسلسلات
- AniList → أنمي
- OMDb → إثراء اختياري للبيانات

ملاحظات:
- لا يوجد Discord Token هنا.
- لا يوجد تخزين دائم مطلوب.
- يتم استخدام Cache داخل Function لتقليل الطلبات.
- يتم إزالة التكرارات قبل إرسال البيانات للواجهة.
=========================================================
*/

const TMDB_BASE = "https://api.themoviedb.org/3";
const ANILIST_URL = "https://graphql.anilist.co";
const OMDB_BASE = "https://www.omdbapi.com";

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w1280";

const CACHE_TTL = 1000 * 60 * 10;

let cache = {
    data: null,
    timestamp: 0
};

let lastUpdate = null;

/* =========================================================
   أدوات عامة
========================================================= */

function cleanText(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeTitle(value) {
    return cleanText(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function yearFromDate(date) {
    if (!date) {
        return null;
    }

    const match = String(date).match(/^(\d{4})/);
    return match ? Number(match[1]) : null;
}

function uniqueStrings(values) {
    return [...new Set(
        (values || [])
            .map(cleanText)
            .filter(Boolean)
    )];
}

function formatArabicGenres(names) {
    const map = {
        Action: "أكشن",
        Adventure: "مغامرة",
        Animation: "رسوم متحركة",
        Comedy: "كوميديا",
        Crime: "جريمة",
        Documentary: "وثائقي",
        Drama: "دراما",
        Family: "عائلي",
        Fantasy: "خيال",
        History: "تاريخي",
        Horror: "رعب",
        Music: "موسيقى",
        Mystery: "غموض",
        Romance: "رومانسي",
        "Science Fiction": "خيال علمي",
        "TV Movie": "فيلم تلفزيوني",
        Thriller: "إثارة",
        War: "حرب",
        Western: "ويسترن",

        ActionAnime: "أكشن",
        AdventureAnime: "مغامرة",
        ComedyAnime: "كوميديا",
        DramaAnime: "دراما",
        FantasyAnime: "خيال",
        HorrorAnime: "رعب",
        MysteryAnime: "غموض",
        RomanceAnime: "رومانسي",
        "Sci-FiAnime": "خيال علمي",
        SportsAnime: "رياضي"
    };

    return uniqueStrings(
        (names || []).map(name => map[name] || name)
    );
}

/* =========================================================
   HTTP
========================================================= */

async function fetchJson(url, options = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, options.timeout || 15000);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                accept: "application/json",
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} from ${new URL(url).hostname}`
            );
        }

        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

/* =========================================================
   TMDB
========================================================= */

function tmdbHeaders() {
    const token = process.env.TMDB_ACCESS_TOKEN;

    if (token) {
        return {
            Authorization: `Bearer ${token}`
        };
    }

    return {};
}

async function tmdbRequest(path, params = {}) {
    const apiKey = process.env.TMDB_API_KEY;

    const url = new URL(`${TMDB_BASE}${path}`);

    for (const [key, value] of Object.entries(params)) {
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(key, value);
        }
    }

    /*
     إذا لم يوجد Access Token نستخدم API Key.
    */
    if (apiKey && !process.env.TMDB_ACCESS_TOKEN) {
        url.searchParams.set("api_key", apiKey);
    }

    return fetchJson(url.toString(), {
        headers: tmdbHeaders()
    });
}

function tmdbMovieToItem(movie) {
    const releaseDate =
        movie.release_date ||
        movie.first_air_date ||
        "";

    const genres = formatArabicGenres(
        Array.isArray(movie.genres)
            ? movie.genres.map(g => g.name)
            : []
    );

    return {
        id: `tmdb-movie-${movie.id}`,
        tmdbId: movie.id,
        source: "tmdb",
        type: "movie",

        title:
            cleanText(movie.title) ||
            cleanText(movie.original_title),

        originalTitle:
            cleanText(movie.original_title),

        englishTitle:
            cleanText(movie.original_title),

        overview:
            cleanText(movie.overview),

        poster:
            movie.poster_path
                ? `${TMDB_IMAGE}${movie.poster_path}`
                : "",

        backdrop:
            movie.backdrop_path
                ? `${TMDB_BACKDROP}${movie.backdrop_path}`
                : "",

        releaseDate,
        year: yearFromDate(releaseDate),

        rating:
            safeNumber(movie.vote_average),

        votes:
            safeNumber(movie.vote_count),

        popularity:
            safeNumber(movie.popularity),

        genres,

        category:
            genres[0] || "عام",

        status:
            cleanText(movie.status),

        language:
            cleanText(movie.original_language),

        country:
            "",

        runtime:
            safeNumber(movie.runtime),

        imdbId:
            cleanText(movie.imdb_id),

        imdbRating:
            0,

        imdbVotes:
            0,

        actors: [],
        director: "",
        writer: "",
        production: [],

        episodes: 0,
        duration: 0,
        season: 0,

        sourceUrl:
            movie.id
                ? `https://www.themoviedb.org/movie/${movie.id}`
                : "",

        trailer: "",

        updatedAt:
            new Date().toISOString()
    };
}

function tmdbTvToItem(show) {
    const releaseDate =
        show.first_air_date || "";

    const genres = formatArabicGenres(
        Array.isArray(show.genres)
            ? show.genres.map(g => g.name)
            : []
    );

    return {
        id: `tmdb-tv-${show.id}`,
        tmdbId: show.id,
        source: "tmdb",
        type: "series",

        title:
            cleanText(show.name) ||
            cleanText(show.original_name),

        originalTitle:
            cleanText(show.original_name),

        englishTitle:
            cleanText(show.original_name),

        overview:
            cleanText(show.overview),

        poster:
            show.poster_path
                ? `${TMDB_IMAGE}${show.poster_path}`
                : "",

        backdrop:
            show.backdrop_path
                ? `${TMDB_BACKDROP}${show.backdrop_path}`
                : "",

        releaseDate,
        year: yearFromDate(releaseDate),

        rating:
            safeNumber(show.vote_average),

        votes:
            safeNumber(show.vote_count),

        popularity:
            safeNumber(show.popularity),

        genres,

        category:
            genres[0] || "عام",

        status:
            cleanText(show.status),

        language:
            cleanText(show.original_language),

        country:
            "",

        runtime:
            0,

        imdbId:
            "",

        imdbRating:
            0,

        imdbVotes:
            0,

        actors: [],
        director: "",
        writer: "",
        production: [],

        episodes:
            safeNumber(show.number_of_episodes),

        duration:
            safeNumber(
                Array.isArray(show.episode_run_time)
                    ? show.episode_run_time[0]
                    : 0
            ),

        season:
            safeNumber(show.number_of_seasons),

        sourceUrl:
            show.id
                ? `https://www.themoviedb.org/tv/${show.id}`
                : "",

        trailer: "",

        updatedAt:
            new Date().toISOString()
    };
}

/* =========================================================
   TMDB - تفاصيل
========================================================= */

async function enrichTmdbMovie(item) {
    try {
        const details = await tmdbRequest(
            `/movie/${item.tmdbId}`,
            {
                language: "ar-SA",
                append_to_response: "videos,credits"
            }
        );

        const result = {
            ...item
        };

        result.title =
            cleanText(details.title) ||
            result.title;

        result.overview =
            cleanText(details.overview) ||
            result.overview;

        result.releaseDate =
            details.release_date ||
            result.releaseDate;

        result.year =
            yearFromDate(result.releaseDate);

        result.runtime =
            safeNumber(details.runtime);

        result.status =
            cleanText(details.status);

        result.imdbId =
            cleanText(details.imdb_id);

        result.genres =
            formatArabicGenres(
                Array.isArray(details.genres)
                    ? details.genres.map(g => g.name)
                    : result.genres
            );

        result.production =
            Array.isArray(details.production_companies)
                ? details.production_companies
                    .map(company => company.name)
                    .filter(Boolean)
                : [];

        result.country =
            Array.isArray(details.production_countries)
                ? details.production_countries
                    .map(country => country.name)
                    .filter(Boolean)
                    .join("، ")
                : "";

        if (details.credits) {
            result.actors =
                Array.isArray(details.credits.cast)
                    ? details.credits.cast
                        .slice(0, 8)
                        .map(actor => actor.name)
                        .filter(Boolean)
                    : [];

            const director =
                details.credits.crew?.find(
                    person => person.job === "Director"
                );

            const writer =
                details.credits.crew?.find(
                    person =>
                        person.job === "Writer" ||
                        person.job === "Screenplay"
                );

            result.director =
                cleanText(director?.name);

            result.writer =
                cleanText(writer?.name);
        }

        const trailer =
            details.videos?.results?.find(video =>
                video.site === "YouTube" &&
                video.type === "Trailer"
            );

        if (trailer) {
            result.trailer =
                `https://www.youtube.com/watch?v=${trailer.key}`;
        }

        return result;
    } catch {
        return item;
    }
}

async function enrichTmdbSeries(item) {
    try {
        const details = await tmdbRequest(
            `/tv/${item.tmdbId}`,
            {
                language: "ar-SA",
                append_to_response: "videos,credits"
            }
        );

        const result = {
            ...item
        };

        result.title =
            cleanText(details.name) ||
            result.title;

        result.overview =
            cleanText(details.overview) ||
            result.overview;

        result.releaseDate =
            details.first_air_date ||
            result.releaseDate;

        result.year =
            yearFromDate(result.releaseDate);

        result.runtime =
            safeNumber(
                Array.isArray(details.episode_run_time)
                    ? details.episode_run_time[0]
                    : 0
            );

        result.episodes =
            safeNumber(details.number_of_episodes);

        result.season =
            safeNumber(details.number_of_seasons);

        result.status =
            cleanText(details.status);

        result.genres =
            formatArabicGenres(
                Array.isArray(details.genres)
                    ? details.genres.map(g => g.name)
                    : result.genres
            );

        result.production =
            Array.isArray(details.production_companies)
                ? details.production_companies
                    .map(company => company.name)
                    .filter(Boolean)
                : [];

        result.country =
            Array.isArray(details.origin_country)
                ? details.origin_country.join("، ")
                : "";

        if (details.credits) {
            result.actors =
                Array.isArray(details.credits.cast)
                    ? details.credits.cast
                        .slice(0, 8)
                        .map(actor => actor.name)
                        .filter(Boolean)
                    : [];

            const director =
                details.credits.crew?.find(
                    person => person.job === "Director"
                );

            result.director =
                cleanText(director?.name);
        }

        const trailer =
            details.videos?.results?.find(video =>
                video.site === "YouTube" &&
                video.type === "Trailer"
            );

        if (trailer) {
            result.trailer =
                `https://www.youtube.com/watch?v=${trailer.key}`;
        }

        return result;
    } catch {
        return item;
    }
}

/* =========================================================
   AniList
========================================================= */

const ANILIST_QUERY = `
query (
    $page: Int,
    $perPage: Int,
    $sort: [MediaSort],
    $status: MediaStatus
) {
    Page(
        page: $page,
        perPage: $perPage
    ) {
        pageInfo {
            currentPage
            hasNextPage
            total
        }

        media(
            type: ANIME,
            sort: $sort,
            status: $status
        ) {
            id
            idMal

            title {
                romaji
                english
                native
                userPreferred
            }

            description(
                asHtml: false
            )

            startDate {
                year
                month
                day
            }

            endDate {
                year
                month
                day
            }

            season
            seasonYear

            format
            status

            episodes
            duration

            averageScore
            meanScore
            popularity

            genres

            countryOfOrigin

            isAdult

            coverImage {
                extraLarge
                large
                medium
            }

            bannerImage

            trailer {
                id
                site
                thumbnail
            }

            studios {
                nodes {
                    name
                }
            }
        }
    }
}
`;

async function anilistRequest(
    page = 1,
    status = null
) {
    const variables = {
        page,
        perPage: 50,
        sort: [
            "POPULARITY_DESC"
        ]
    };

    if (status) {
        variables.status = status;
    }

    const data = await fetchJson(
        ANILIST_URL,
        {
            method: "POST",

            headers: {
                "content-type": "application/json"
            },

            body: JSON.stringify({
                query: ANILIST_QUERY,
                variables
            }),

            timeout: 20000
        }
    );

    if (data.errors?.length) {
        throw new Error(
            data.errors[0]?.message ||
            "AniList GraphQL error"
        );
    }

    return data.data;
}

function anilistToItem(anime) {
    const title =
        cleanText(anime.title?.english) ||
        cleanText(anime.title?.romaji) ||
        cleanText(anime.title?.userPreferred) ||
        cleanText(anime.title?.native);

    const originalTitle =
        cleanText(anime.title?.native) ||
        cleanText(anime.title?.romaji);

    const description =
        cleanText(anime.description);

    const year =
        safeNumber(anime.seasonYear);

    const genres =
        formatArabicGenres(
            anime.genres || []
        );

    let trailer = "";

    if (
        anime.trailer &&
        anime.trailer.site === "youtube" &&
        anime.trailer.id
    ) {
        trailer =
            `https://www.youtube.com/watch?v=${anime.trailer.id}`;
    }

    return {
        id: `anilist-${anime.id}`,

        malId:
            anime.idMal || null,

        anilistId:
            anime.id,

        source: "anilist",

        type: "anime",

        title,

        originalTitle,

        englishTitle:
            cleanText(anime.title?.english),

        overview:
            description,

        poster:
            anime.coverImage?.extraLarge ||
            anime.coverImage?.large ||
            anime.coverImage?.medium ||
            "",

        backdrop:
            cleanText(anime.bannerImage),

        releaseDate:
            year
                ? `${year}-01-01`
                : "",

        year,

        rating:
            safeNumber(anime.averageScore) / 10,

        votes:
            0,

        popularity:
            safeNumber(anime.popularity),

        genres,

        category:
            genres[0] || "أنمي",

        status:
            cleanText(anime.status),

        language:
            cleanText(anime.countryOfOrigin),

        country:
            cleanText(anime.countryOfOrigin),

        runtime:
            safeNumber(anime.duration),

        imdbId:
            "",

        imdbRating:
            0,

        imdbVotes:
            0,

        actors: [],

        director: "",

        writer: "",

        production:
            anime.studios?.nodes
                ?.map(studio => studio.name)
                .filter(Boolean) || [],

        episodes:
            safeNumber(anime.episodes),

        duration:
            safeNumber(anime.duration),

        season:
            cleanText(anime.season),

        yearSeason:
            year,

        sourceUrl:
            `https://anilist.co/anime/${anime.id}`,

        trailer,

        updatedAt:
            new Date().toISOString()
    };
}

/* =========================================================
   OMDb
========================================================= */

async function enrichWithOmdb(item) {
    const apiKey =
        process.env.OMDB_API_KEY;

    if (!apiKey) {
        return item;
    }

    const imdbId =
        cleanText(item.imdbId);

    if (!imdbId) {
        return item;
    }

    try {
        const url =
            `${OMDB_BASE}/?apikey=${encodeURIComponent(apiKey)}` +
            `&i=${encodeURIComponent(imdbId)}` +
            `&plot=short`;

        const data =
            await fetchJson(url, {
                timeout: 10000
            });

        if (
            !data ||
            data.Response === "False"
        ) {
            return item;
        }

        return {
            ...item,

            imdbRating:
                data.imdbRating !== "N/A"
                    ? safeNumber(data.imdbRating)
                    : item.imdbRating,

            imdbVotes:
                data.imdbVotes !== "N/A"
                    ? safeNumber(
                        String(data.imdbVotes)
                            .replace(/,/g, "")
                    )
                    : item.imdbVotes,

            actors:
                data.Actors !== "N/A"
                    ? data.Actors
                        .split(",")
                        .map(cleanText)
                        .filter(Boolean)
                    : item.actors,

            director:
                data.Director !== "N/A"
                    ? cleanText(data.Director)
                    : item.director,

            writer:
                data.Writer !== "N/A"
                    ? cleanText(data.Writer)
                    : item.writer,

            production:
                data.Production !== "N/A"
                    ? [cleanText(data.Production)]
                    : item.production
        };
    } catch {
        return item;
    }
}

/* =========================================================
   إزالة التكرار
========================================================= */

function deduplicate(items) {
    const map = new Map();

    for (const item of items) {
        if (!item || !item.title) {
            continue;
        }

        const title =
            normalizeTitle(item.title);

        const year =
            item.year || "";

        const imdb =
            cleanText(item.imdbId);

        const tmdb =
            item.tmdbId
                ? String(item.tmdbId)
                : "";

        const mal =
            item.malId
                ? String(item.malId)
                : "";

        const anilist =
            item.anilistId
                ? String(item.anilistId)
                : "";

        const keys = [
            imdb
                ? `imdb:${imdb}`
                : null,

            tmdb
                ? `tmdb:${item.type}:${tmdb}`
                : null,

            mal
                ? `mal:${mal}`
                : null,

            anilist
                ? `anilist:${anilist}`
                : null,

            `title:${item.type}:${title}:${year}`
        ].filter(Boolean);

        let existing = null;

        for (const key of keys) {
            if (map.has(key)) {
                existing = map.get(key);
                break;
            }
        }

        if (!existing) {
            existing = item;
        } else {
            /*
             دمج البيانات:
             نحتفظ بالأفضل والأكثر اكتمالاً.
            */

            existing = {
                ...existing,

                ...Object.fromEntries(
                    Object.entries(item)
                        .filter(([, value]) => {
                            if (
                                value === null ||
                                value === undefined ||
                                value === ""
                            ) {
                                return false;
                            }

                            if (
                                Array.isArray(value) &&
                                value.length === 0
                            ) {
                                return false;
                            }

                            return true;
                        })
                ),

                genres:
                    uniqueStrings([
                        ...(existing.genres || []),
                        ...(item.genres || [])
                    ]),

                actors:
                    uniqueStrings([
                        ...(existing.actors || []),
                        ...(item.actors || [])
                    ]),

                production:
                    uniqueStrings([
                        ...(existing.production || []),
                        ...(item.production || [])
                    ])
            };
        }

        for (const key of keys) {
            map.set(key, existing);
        }
    }

    /*
    استخراج العناصر بدون تكرار.
    */
    const result = [];
    const seen = new Set();

    for (const item of map.values()) {
        const identity =
            [
                item.type,
                item.imdbId,
                item.tmdbId,
                item.anilistId,
                item.malId,
                normalizeTitle(item.title),
                item.year
            ].join("|");

        if (seen.has(identity)) {
            continue;
        }

        seen.add(identity);
        result.push(item);
    }

    return result;
}

/* =========================================================
   تحميل الأفلام
========================================================= */

async function loadMovies() {
    const pages = [1, 2];

    const requests = [];

    for (const page of pages) {
        requests.push(
            tmdbRequest(
                "/movie/popular",
                {
                    language: "ar-SA",
                    region: "IQ",
                    page,
                    include_adult: "false"
                }
            )
        );

        requests.push(
            tmdbRequest(
                "/movie/top_rated",
                {
                    language: "ar-SA",
                    region: "IQ",
                    page,
                    include_adult: "false"
                }
            )
        );

        requests.push(
            tmdbRequest(
                "/movie/now_playing",
                {
                    language: "ar-SA",
                    region: "IQ",
                    page,
                    include_adult: "false"
                }
            )
        );

        requests.push(
            tmdbRequest(
                "/movie/upcoming",
                {
                    language: "ar-SA",
                    region: "IQ",
                    page,
                    include_adult: "false"
                }
            )
        );
    }

    const results =
        await Promise.allSettled(requests);

    const items = [];

    for (const result of results) {
        if (
            result.status !== "fulfilled"
        ) {
            continue;
        }

        const list =
            result.value?.results || [];

        for (const movie of list) {
            items.push(
                tmdbMovieToItem(movie)
            );
        }
    }

    const unique =
        deduplicate(items);

    /*
    إثراء عدد محدود حتى لا نضغط TMDB.
    */
    const enriched = [];

    for (
        const item of unique.slice(0, 40)
    ) {
        enriched.push(
            await enrichTmdbMovie(item)
        );
    }

    enriched.push(
        ...unique.slice(40)
    );

    /*
    OMDb اختياري.
    */
    const omdbItems = [];

    for (
        const item of enriched.slice(0, 40)
    ) {
        omdbItems.push(
            await enrichWithOmdb(item)
        );
    }

    omdbItems.push(
        ...enriched.slice(40)
    );

    return deduplicate(omdbItems);
}

/* =========================================================
   تحميل المسلسلات
========================================================= */

async function loadSeries() {
    const pages = [1, 2];

    const requests = [];

    for (const page of pages) {
        requests.push(
            tmdbRequest(
                "/tv/popular",
                {
                    language: "ar-SA",
                    page,
                    include_adult: "false"
                }
            )
        );

        requests.push(
            tmdbRequest(
                "/tv/top_rated",
                {
                    language: "ar-SA",
                    page,
                    include_adult: "false"
                }
            )
        );

        requests.push(
            tmdbRequest(
                "/tv/on_the_air",
                {
                    language: "ar-SA",
                    page,
                    include_adult: "false"
                }
            )
        );
    }

    const results =
        await Promise.allSettled(requests);

    const items = [];

    for (const result of results) {
        if (
            result.status !== "fulfilled"
        ) {
            continue;
        }

        const list =
            result.value?.results || [];

        for (const show of list) {
            items.push(
                tmdbTvToItem(show)
            );
        }
    }

    const unique =
        deduplicate(items);

    const enriched = [];

    for (
        const item of unique.slice(0, 40)
    ) {
        enriched.push(
            await enrichTmdbSeries(item)
        );
    }

    enriched.push(
        ...unique.slice(40)
    );

    const omdbItems = [];

    for (
        const item of enriched.slice(0, 20)
    ) {
        omdbItems.push(
            await enrichWithOmdb(item)
        );
    }

    omdbItems.push(
        ...enriched.slice(20)
    );

    return deduplicate(omdbItems);
}

/* =========================================================
   تحميل الأنمي
========================================================= */

async function loadAnime() {
    /*
    نطلب أكثر من صفحة.
    هذا يضمن أن خانة الأنمي لا تعتمد على عنصر واحد.
    */

    const requests = [
        anilistRequest(
            1,
            null
        ),

        anilistRequest(
            2,
            null
        ),

        anilistRequest(
            3,
            null
        ),

        anilistRequest(
            1,
            "RELEASING"
        ),

        anilistRequest(
            2,
            "RELEASING"
        )
    ];

    const results =
        await Promise.allSettled(
            requests
        );

    const items = [];

    for (const result of results) {
        if (
            result.status !== "fulfilled"
        ) {
            continue;
        }

        const media =
            result.value?.Page?.media || [];

        for (const anime of media) {
            /*
            نستبعد المحتوى +18 من مصدر الأنمي.
            */
            if (anime.isAdult === true) {
                continue;
            }

            items.push(
                anilistToItem(anime)
            );
        }
    }

    return deduplicate(items);
}

/* =========================================================
   الكتالوج الكامل
========================================================= */

async function buildCatalog() {
    const [
        moviesResult,
        seriesResult,
        animeResult
    ] = await Promise.allSettled([
        loadMovies(),
        loadSeries(),
        loadAnime()
    ]);

    const movies =
        moviesResult.status === "fulfilled"
            ? moviesResult.value
            : [];

    const series =
        seriesResult.status === "fulfilled"
            ? seriesResult.value
            : [];

    const anime =
        animeResult.status === "fulfilled"
            ? animeResult.value
            : [];

    /*
    مهم:
    لا نسمح بفشل مصدر واحد بإسقاط بقية الموقع.
    */

    const all =
        deduplicate([
            ...movies,
            ...series,
            ...anime
        ]);

    lastUpdate =
        new Date().toISOString();

    return {
        movies,
        series,
        anime,
        all,
        total: all.length,
        lastUpdate
    };
}

/* =========================================================
   Public Catalog
========================================================= */

async function getCatalog(force = false) {
    const now = Date.now();

    if (
        !force &&
        cache.data &&
        now - cache.timestamp < CACHE_TTL
    ) {
        return cache.data;
    }

    const data =
        await buildCatalog();

    cache = {
        data,
        timestamp: now
    };

    return data;
}

/* =========================================================
   البحث
========================================================= */

function searchCatalog(
    catalog,
    search,
    type = "all",
    sort = "popular"
) {
    const query =
        normalizeTitle(search);

    let items =
        catalog.all;

    if (type && type !== "all") {
        items =
            items.filter(
                item => item.type === type
            );
    }

    if (query) {
        items =
            items.filter(item => {
                const title =
                    normalizeTitle(item.title);

                const original =
                    normalizeTitle(
                        item.originalTitle
                    );

                const english =
                    normalizeTitle(
                        item.englishTitle
                    );

                return (
                    title.includes(query) ||
                    original.includes(query) ||
                    english.includes(query)
                );
            });
    }

    return sortItems(
        items,
        sort
    );
}

/* =========================================================
   الفرز
========================================================= */

function sortItems(items, sort) {
    const copy = [...items];

    switch (sort) {
        case "rating":
            return copy.sort(
                (a, b) =>
                    safeNumber(b.rating) -
                    safeNumber(a.rating)
            );

        case "new":
            return copy.sort(
                (a, b) =>
                    safeNumber(b.year) -
                    safeNumber(a.year)
            );

        case "popular":
        default:
            return copy.sort(
                (a, b) =>
                    safeNumber(b.popularity) -
                    safeNumber(a.popularity)
            );
    }
}

/* =========================================================
   تصدير
========================================================= */

module.exports = {
    getCatalog,
    searchCatalog,
    sortItems
};
