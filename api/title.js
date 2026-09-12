"use strict";

const { getCatalog } = require("../lib/catalog");
const { getSeriesEpisodes } = require("../lib/tmdb-watch");
const { getWatchProviders } = require("../lib/tmdb-providers");
const { normalizeWatchItem } = require("../lib/watch-model");
const { loadStoredWatchItem } = require("../lib/watch-storage");
const { attachSourcesToSeasons, attachItemSources } = require("../lib/watch-response");
const { getWatchAvailability } = require("../lib/watch-availability");

function findItem(catalog, id) {
    const wanted = String(id || "").trim();
    if (!wanted) return null;

    return catalog.all.find(item =>
        String(item.id) === wanted ||
        String(item.tmdbId || "") === wanted
    ) || null;
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
        const item = findItem(catalog, id);

        if (!item) {
            return res.status(404).json({ success: false, error: "المحتوى غير موجود." });
        }

        const stored = loadStoredWatchItem(item.id);
        let seasons = Array.isArray(item.seasons) ? item.seasons : [];

        if ((item.type === "series" || item.type === "tv") && item.tmdbId) {
            seasons = await getSeriesEpisodes(item.tmdbId);
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

        let normalized = normalizeWatchItem({
            ...item,
            seasons,
            chapters: stored.chapters || item.chapters || []
        });

        normalized = attachItemSources(normalized, stored);

        const episodeCount = normalized.seasons.reduce(
            (total, season) => total + season.episodes.length,
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
                seasonCount: normalized.seasons.length,
                episodeCount,
                chapterCount: normalized.chapters.length,
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
