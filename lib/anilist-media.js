"use strict";

const ANILIST_URL = "https://graphql.anilist.co";

function text(value) {
    return value === null || value === undefined ? "" : String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
}

function dateValue(value) {
    if (!value?.year) return "";
    return `${value.year}-${String(value.month || 1).padStart(2, "0")}-${String(value.day || 1).padStart(2, "0")}`;
}

function poster(media) {
    return media?.coverImage?.extraLarge || media?.coverImage?.large || "";
}

function isManhwa(media) {
    return String(media?.countryOfOrigin || "").toUpperCase() === "KR" ||
        String(media?.format || "").toUpperCase() === "WEBTOON";
}

function normalizeStreamingEpisode(episode, index) {
    if (!episode?.url) return null;
    return {
        id: `anilist-stream-${index + 1}`,
        number: index + 1,
        title: text(episode.title) || `الحلقة ${index + 1}`,
        thumbnail: text(episode.thumbnail),
        duration: 0,
        releaseDate: "",
        sources: [{
            id: `anilist-stream-${index + 1}`,
            name: text(episode.site) || "المصدر الرسمي",
            kind: "provider",
            url: episode.url,
            embed: false,
            official: true,
            language: "",
            subtitle: "",
            quality: "",
            priority: 100
        }]
    };
}

function normalizeMedia(media) {
    if (!media) return null;

    const type = String(media.type || "").toUpperCase();
    const format = String(media.format || "").toUpperCase();
    const manga = type === "MANGA";
    const manhwa = manga && isManhwa(media);

    const streamingEpisodes = Array.isArray(media.streamingEpisodes)
        ? media.streamingEpisodes.map(normalizeStreamingEpisode).filter(Boolean)
        : [];

    const externalLinks = Array.isArray(media.externalLinks)
        ? media.externalLinks
            .filter(link => link?.url && link?.isDisabled !== true)
            .map(link => ({
                id: number(link.id),
                name: text(link.site) || "الموقع الرسمي",
                url: text(link.url),
                type: text(link.type),
                language: text(link.language),
                official: true
            }))
        : [];

    const title = text(media.title?.userPreferred) || text(media.title?.english) || text(media.title?.romaji) || text(media.title?.native);
    const originalTitle = text(media.title?.native) || text(media.title?.romaji);

    const item = {
        id: `anilist-${manga ? "manga" : "anime"}-${media.id}`,
        anilistId: number(media.id),
        malId: number(media.idMal),
        source: "anilist",
        type: manga ? (manhwa ? "manhwa" : "manga") : "anime",
        format,
        title,
        originalTitle,
        englishTitle: text(media.title?.english),
        overview: text(media.description),
        poster: poster(media),
        backdrop: text(media.bannerImage),
        releaseDate: dateValue(media.startDate),
        year: number(media.startDate?.year),
        rating: number(media.averageScore) / 10,
        votes: 0,
        popularity: number(media.popularity),
        status: text(media.status),
        language: text(media.countryOfOrigin),
        country: text(media.countryOfOrigin),
        runtime: number(media.duration),
        genres: Array.isArray(media.genres) ? media.genres.map(text).filter(Boolean) : [],
        episodes: number(media.episodes),
        duration: number(media.duration),
        season: text(media.season),
        chapters: number(media.chapters),
        volumes: number(media.volumes),
        isLicensed: media.isLicensed === true,
        sourceUrl: text(media.siteUrl),
        trailer: media.trailer?.site === "youtube" && media.trailer?.id
            ? `https://www.youtube.com/watch?v=${media.trailer.id}`
            : "",
        externalLinks,
        streamingEpisodes
    };

    if (!manga) {
        item.seasons = streamingEpisodes.length > 0
            ? [{
                id: `anilist-season-${media.id}`,
                number: 1,
                title: "الحلقات المتاحة رسميًا",
                overview: "الحلقات التي يوفر AniList لها روابط مشاهدة قانونية خارجية.",
                poster: poster(media),
                episodes: streamingEpisodes
            }]
            : [];
    } else {
        item.chapters = [];
    }

    return item;
}

async function request(query, variables = {}) {
    const response = await fetch(ANILIST_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({ query, variables })
    });

    const payload = await response.json();
    if (!response.ok || payload?.errors?.length) {
        throw new Error(payload?.errors?.[0]?.message || `AniList HTTP ${response.status}`);
    }

    return payload?.data;
}

const MEDIA_FIELDS = `
    id idMal type format status countryOfOrigin isLicensed
    description(asHtml: false)
    title { romaji english native userPreferred }
    startDate { year month day }
    averageScore popularity episodes duration chapters volumes
    genres
    coverImage { large extraLarge }
    bannerImage
    season seasonYear
    siteUrl
    trailer { id site }
    externalLinks { id url site type language isDisabled }
    streamingEpisodes { title thumbnail url site }
`;

async function getAniListMediaById(id, type) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId < 1) return null;

    const mediaType = type === "manga" || type === "manhwa" ? "MANGA" : "ANIME";
    const query = `query ($id: Int, $type: MediaType) { Media(id: $id, type: $type) { ${MEDIA_FIELDS} } }`;
    const data = await request(query, { id: numericId, type: mediaType });
    return normalizeMedia(data?.Media);
}

async function getAniListMangaCatalog(page = 1, perPage = 24) {
    const query = `query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
                ${MEDIA_FIELDS}
            }
        }
    }`;

    const data = await request(query, { page, perPage });
    return (data?.Page?.media || []).map(normalizeMedia).filter(Boolean);
}

module.exports = {
    normalizeMedia,
    getAniListMediaById,
    getAniListMangaCatalog
};
