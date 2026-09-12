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
    const value = String(id || "").trim();
    const typed = value.match(/^anilist[-:]((?:anime|manga|manhwa|novel))[-:](\d+)$/i);
    if (typed) return { id: Number(typed[2]), type: typed[1].toLowerCase() };

    const legacy = value.match(/^anilist[-:](\d+)$/i);
    if (legacy) return { id: Number(legacy[1]), type: "anime" };

    return null;
}

function getOfficialLinks(item) {
    return Array.isArray(item?.externalLinks)
        ? item.externalLinks.filter(link => link?.url && link?.isDisabled !== true).map(link => ({
            id: `external-${link.id || link.name}`,
            name: link.name || "الموقع الرسمي",
            url: link.url,
            language: link.language || "",
            official: true
        }))
        : [];
}

function getProviderEpisodeLinks(seasons) {
    const links = [];
    for (const season of Array.isArray(seasons) ? seasons : []) {
        for (const episode of Array.isArray(season?.episodes) ? season.episodes : []) {
            for (const source of Array.isArray(episode?.sources) ? episode.sources : []) {
                if (source?.kind === "provider" && source.url) {
                    links.push({
                        id: source.id || source.url,
                        name: source.name || "مشاهدة رسمية",
                        url: source.url,
                        episodeNumber: episode.number,
                        episodeTitle: episode.title,
                        official: source.official === true
                    });
                }
            }
        }
    }
    return links;
}

module.exports = async function handler(req, res) {
    try {
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
        res.setHeader("Content-Type", "application/json; charset=utf-8");

        const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
        const id = (url.searchParams.get("id") || "").trim();
        const region = (url.searchParams.get("region") || "IQ").toUpperCase();
        if (!id) return res.status(400).json({ success: false, error: "معرّف المحتوى مطلوب." });

        // AniList IDs are self-contained. Resolve them directly instead of
        // waiting for the large mixed catalog and its external providers.
        const parsed = parseAniListId(id);
        let item = parsed ? await getAniListMediaById(parsed.id, parsed.type) : null;

        if (!item) {
            const catalog = await getCatalog(false);
            item = findItem(catalog, id);
        }

        if (!item) return res.status(404).json({ success: false, error: "المحتوى غير موجود." });

        const stored = loadStoredWatchItem(item.id) || {};
        let seasons = Array.isArray(item.seasons) ? item.seasons : [];
        if ((item.type === "series" || item.type === "tv") && item.tmdbId) {
            try { seasons = await getSeriesEpisodes(item.tmdbId); } catch { seasons = []; }
        }
        seasons = attachSourcesToSeasons(seasons, stored.seasons);

        let providers = [];
        if (item.tmdbId) {
            try { providers = await getWatchProviders(item.tmdbId, item.type, region); } catch { providers = []; }
        }

        const storedChapters = Array.isArray(stored.chapters) ? stored.chapters : [];
        const itemChapters = Array.isArray(item.chapters) ? item.chapters : [];
        let normalized = normalizeWatchItem({
            ...item,
            seasons,
            chapters: storedChapters.length > 0 ? storedChapters : itemChapters
        });
        normalized = attachItemSources(normalized, stored);

        const episodeCount = normalized.seasons.reduce((total, season) => total + season.episodes.length, 0);
        const playableEpisodeCount = normalized.seasons.reduce((total, season) => total + season.episodes.filter(episode => episode.playable).length, 0);
        const providerEpisodeLinks = getProviderEpisodeLinks(normalized.seasons);
        const officialLinks = getOfficialLinks(item);
        const availability = getWatchAvailability(normalized);
        const chapterTotal = Number(item.chapterTotal ?? (Array.isArray(item.chapters) ? item.chapters.length : item.chapters) ?? 0);

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
            officialLinks,
            providerEpisodeLinks,
            meta: {
                mediaType: normalized.type,
                format: normalized.format || "",
                seasonCount: normalized.seasons.length,
                episodeCount,
                playableEpisodeCount,
                providerEpisodeCount: providerEpisodeLinks.length,
                chapterCount: normalized.chapters.length,
                chapterTotal,
                volumeCount: Number(item.volumes || 0),
                ...availability
            }
        });
    } catch (error) {
        console.error("[TITLE API]", error.message);
        return res.status(502).json({ success: false, error: error.message || "تعذر تجهيز صفحة المحتوى حاليًا." });
    }
};
