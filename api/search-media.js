"use strict";

const { getAniListMediaById } = require("../lib/anilist-media");

const ANILIST_URL = "https://graphql.anilist.co";
const TIMEOUT = 7000;

function clean(value) {
    return value === null || value === undefined ? "" : String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function normalize(media) {
    if (!media?.id) return null;
    const type = String(media.type || "").toUpperCase();
    const format = String(media.format || "").toUpperCase();
    const isNovel = type === "MANGA" && format === "NOVEL";
    const isManhwa = type === "MANGA" && !isNovel && (String(media.countryOfOrigin || "").toUpperCase() === "KR" || format === "WEBTOON");
    const normalizedType = type === "ANIME" ? "anime" : isNovel ? "novel" : isManhwa ? "manhwa" : "manga";
    const prefix = `anilist-${normalizedType}`;
    return {
        id: `${prefix}-${media.id}`,
        anilistId: Number(media.id),
        malId: Number(media.idMal || 0),
        type: normalizedType,
        title: clean(media.title?.userPreferred) || clean(media.title?.english) || clean(media.title?.romaji) || clean(media.title?.native),
        originalTitle: clean(media.title?.native) || clean(media.title?.romaji),
        englishTitle: clean(media.title?.english),
        overview: clean(media.description),
        poster: media.coverImage?.extraLarge || media.coverImage?.large || "",
        backdrop: clean(media.bannerImage),
        year: Number(media.startDate?.year || 0),
        releaseDate: media.startDate?.year ? `${media.startDate.year}-${String(media.startDate.month || 1).padStart(2, "0")}-${String(media.startDate.day || 1).padStart(2, "0")}` : "",
        rating: Number(media.averageScore || 0) / 10,
        popularity: Number(media.popularity || 0),
        status: clean(media.status),
        genres: Array.isArray(media.genres) ? media.genres.map(clean).filter(Boolean) : [],
        episodes: Number(media.episodes || 0),
        chapterTotal: Number(media.chapters || 0),
        volumes: Number(media.volumes || 0),
        source: "anilist",
        sourceUrl: clean(media.siteUrl)
    };
}

async function request(query, variables) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
        const response = await fetch(ANILIST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok || payload?.errors?.length) throw new Error(payload?.errors?.[0]?.message || `AniList HTTP ${response.status}`);
        return payload?.data;
    } finally {
        clearTimeout(timer);
    }
}

module.exports = async function handler(req, res) {
    try {
        res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
        const q = clean(url.searchParams.get("q") || "").slice(0, 100);
        const requestedType = clean(url.searchParams.get("type") || "all").toLowerCase();
        if (q.length < 2) return res.status(200).json({ success: true, items: [] });

        const query = `query ($search: String) {
            Page(page: 1, perPage: 20) {
                media(search: $search, sort: SEARCH_MATCH, isAdult: false) {
                    id idMal type format status countryOfOrigin
                    title { romaji english native userPreferred }
                    description(asHtml: false)
                    startDate { year month day }
                    averageScore popularity episodes chapters volumes genres
                    coverImage { large extraLarge }
                    bannerImage siteUrl
                }
            }
        }`;

        const data = await request(query, { search: q });
        let items = (data?.Page?.media || []).map(normalize).filter(Boolean);
        if (["anime", "manga", "manhwa", "novel"].includes(requestedType)) items = items.filter(item => item.type === requestedType);

        return res.status(200).json({ success: true, items });
    } catch (error) {
        console.error("[SEARCH MEDIA]", error.message);
        return res.status(502).json({ success: false, items: [], error: "تعذر البحث في مكتبة الأنمي والمانغا والمانهوا والروايات حاليًا." });
    }
};
