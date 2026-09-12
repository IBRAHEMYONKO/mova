"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { getCatalog } = require("../lib/catalog");
const { getSeriesEpisodes } = require("../lib/tmdb-watch");
const { normalizeWatchItem } = require("../lib/watch-model");
const {
    attachSourcesToSeasons,
    attachItemSources
} = require("../lib/watch-response");

const SOURCES_FILE = path.join(
    process.cwd(),
    "data",
    "watch-sources.json"
);

function loadWatchSources() {
    try {
        const raw = fs.readFileSync(SOURCES_FILE, "utf8");
        const data = JSON.parse(raw);
        return data && typeof data === "object" ? data.items || {} : {};
    } catch {
        return {};
    }
}

function findCatalogItem(catalog, id) {
    const wanted = String(id || "").trim();

    if (!wanted) {
        return null;
    }

    return catalog.all.find(item =>
        String(item.id) === wanted ||
        String(item.tmdbId || "") === wanted
    ) || null;
}

module.exports = async function handler(req, res) {
    try {
        res.setHeader(
            "Cache-Control",
            "s-maxage=120, stale-while-revalidate=300"
        );
        res.setHeader(
            "Content-Type",
            "application/json; charset=utf-8"
        );

        const url = new URL(
            req.url,
            `https://${req.headers.host || "localhost"}`
        );

        const id = (url.searchParams.get("id") || "").trim();

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "معرّف المحتوى مطلوب."
            });
        }

        const catalog = await getCatalog(false);
        const item = findCatalogItem(catalog, id);

        if (!item) {
            return res.status(404).json({
                success: false,
                error: "المحتوى غير موجود في المكتبة."
            });
        }

        const stored = loadWatchSources();
        const storedItem = stored[item.id] || {};

        let seasons = [];

        if (
            (item.type === "series" || item.type === "tv") &&
            item.tmdbId
        ) {
            seasons = await getSeriesEpisodes(item.tmdbId);
            seasons = attachSourcesToSeasons(
                seasons,
                storedItem.seasons
            );
        } else if (Array.isArray(item.seasons)) {
            seasons = attachSourcesToSeasons(
                item.seasons,
                storedItem.seasons
            );
        }

        const normalized = normalizeWatchItem({
            ...item,
            seasons,
            chapters: storedItem.chapters || item.chapters || []
        });

        const withSources = attachItemSources(
            normalized,
            storedItem
        );

        return res.status(200).json({
            success: true,
            item: withSources,
            watch: {
                available: withSources.sources.length > 0 ||
                    withSources.seasons.some(season =>
                        season.episodes.some(episode =>
                            episode.sources.length > 0
                        )
                    ),
                seasons: withSources.seasons,
                chapters: withSources.chapters,
                sources: withSources.sources
            }
        });
    } catch (error) {
        console.error("[WATCH API]", error.message);

        return res.status(500).json({
            success: false,
            error: "تعذر تجهيز بيانات المشاهدة حاليًا."
        });
    }
};
