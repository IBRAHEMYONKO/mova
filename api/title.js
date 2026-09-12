"use strict";

const { getCatalog } = require("../lib/catalog");
const { getSeriesEpisodes } = require("../lib/tmdb-watch");
const { getWatchProviders } = require("../lib/tmdb-providers");
const { normalizeWatchItem } = require("../lib/watch-model");
const { loadStoredWatchItem } = require("../lib/watch-storage");
const { attachSourcesToSeasons, attachItemSources } = require("../lib/watch-response");
const { getWatchAvailability } = require("../lib/watch-availability");
const { getAniListMediaById } = require("../lib/anilist-media");

function findItem(catalog, id) {
    const wanted = String(id || "").trim();
    if (!wanted) return null;

    return catalog.all.find(item =>
        String(item.id) === wanted ||
        String(item.tmdbId || "") === wanted ||
        String(item.anilistId || "") === wanted
    ) || null;
}

function parseAniListId(id) {
    const match = String(id || "").match(/^anilist-(?:anime|manga)-(\d+)$/i);
    return match ? Number(match[1]) : 0;
}

function mergeProviderLinks(item) {
    const links = Array.isArray(item?.externalLinks) ? item.externalLinks : [];
    const sources = links.map(link => ({
        id: `external-${link.id || link.name}`,
        name: link.name || "الموقع الرسمي",
        kind: "provider",
        url: link.url,
        embed: false,
        official: true,
        language: link.language || "",
        subtitle: "",
        quality: "",
        priority: 50
    }));

    return sources;
}

module.exports = async function handler(req, res) {
    try {
        res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
        res.setHeader("Content-Type", "application/json; charset=utf-8");

        const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
        const id = (url.searchParams.get("id") || "").trim();
        const region = (url.searchParams.get("region") || "IQ").toUpperCase();

        if (!id) {
            return res.status(400).json({ success: false, error: "معرّف المحتوى مطلوب." });
        }

        const catalog = await getCatalog(false);
        let item = findItem(catalog, id);

        if (!item) {
            const anilistId = parseAniListId(id);
            if (anilistId) {
                item = await getAniListMediaById(anilistId, id.includes("manga") ? "manga" : "anime");
            }
        }

        if (!item) {
            return res.status(404).json({ success: false, error: "المحتوى غير موجود." });
        }

        const stored = loadStoredWatchItem(item.id) || {};
        let seasons = Array.isArray(item.seasons) ? item.seasons : [];

        if ((item.type === "series" || item.type === "tv") && item.tmdbId) {
            try {
                seasons = await getSeriesEpisodes(item.tmdbId);
            } catch {
                seasons = [];
            }
        }

        seasons = attachSourcesToSeasons(seasons, stored.seasons);

        let providers = [];
        if (item.tmdbId) {
            try {
                providers = await getWatchProviders(item.tmdbId, item.type, region);
            } catch {
                providers = [];
            }
        }

        const anilistProviderSources = mergeProviderLinks(item);
        const storedItem = {
            ...stored,
            sources: [
                ...(Array.isArray(stored.sources) ? stored.sources : []),
                ...anilistProviderSources
            ]
        };

        let normalized = normalizeWatchItem({
            ...item,
            seasons,
            chapters: stored.chapters || item.chapters || []
        });

        normalized = attachItemSources(normalized, storedItem);

        const episodeCount = normalized.seasons.reduce(
            (total, season) => total + season.episodes.length,
            0
        );

        const playableEpisodeCount = normalized.seasons.reduce(
            (total, season) => total + season.episodes.filter(episode => episode.playable).length,
            0
        );

        const availability = getWatchAvailability(normalized);

        return res.status(200).json({
            success: true,
            item: normalized,
            watch: {
                available: availability.available,
                movie: normalized.sources,
                seasons: normalized.seasons,
                chapters: normalized.chapters
            },
            providers,
            meta: {
                mediaType: normalized.type,
                format: normalized.format || "",
                seasonCount: normalized.seasons.length,
                episodeCount,
                playableEpisodeCount,
                chapterCount: Number(normalized.chapters?.length || 0),
                chapterTotal: Number(item.chapters || 0),
                volumeCount: Number(item.volumes || 0),
                ...availability
            }
        });
    } catch (error) {
        console.error("[TITLE API]", error.message);
        return res.status(500).json({
            success: false,
            error: "تعذر تجهيز صفحة المحتوى حاليًا."
        });
    }
};
