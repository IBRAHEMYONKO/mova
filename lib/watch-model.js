"use strict";

function isValidUrl(value) {
    if (!value || typeof value !== "string") return false;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function cleanString(value) {
    return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeSource(source) {
    if (!source || typeof source !== "object") return null;
    const url = cleanString(source.url);
    if (!isValidUrl(url)) return null;

    return {
        id: cleanString(source.id),
        name: cleanString(source.name) || "مصدر مشاهدة",
        kind: cleanString(source.kind) || "video",
        url,
        embed: source.embed === true,
        official: source.official === true,
        language: cleanString(source.language),
        subtitle: cleanString(source.subtitle),
        quality: cleanString(source.quality),
        priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 0
    };
}

function normalizeSources(sources) {
    if (!Array.isArray(sources)) return [];
    const result = [];
    const seen = new Set();

    for (const source of sources) {
        const normalized = normalizeSource(source);
        if (!normalized || seen.has(normalized.url)) continue;
        seen.add(normalized.url);
        result.push(normalized);
    }

    return result.sort((a, b) => b.priority - a.priority);
}

function isPlayableSource(source) {
    return Boolean(source?.url) && source.kind !== "provider" && source.playable !== false;
}

function getPlayableSources(sources) {
    return normalizeSources(sources).filter(isPlayableSource);
}

function getProviderSources(sources) {
    return normalizeSources(sources).filter(source => source.kind === "provider");
}

function hasWatchSources(item) {
    return getPlayableSources(item?.sources).length > 0;
}

function normalizeEpisode(episode) {
    if (!episode || typeof episode !== "object") return null;

    const number = Number(episode.number);
    if (!Number.isFinite(number) || number < 1) return null;

    const sources = normalizeSources(episode.sources);
    const playableSources = getPlayableSources(sources);

    return {
        id: cleanString(episode.id),
        number,
        title: cleanString(episode.title) || `الحلقة ${number}`,
        overview: cleanString(episode.overview),
        thumbnail: cleanString(episode.thumbnail),
        duration: Number.isFinite(Number(episode.duration)) ? Number(episode.duration) : 0,
        releaseDate: cleanString(episode.releaseDate),
        voteAverage: Number.isFinite(Number(episode.voteAverage)) ? Number(episode.voteAverage) : 0,
        voteCount: Number.isFinite(Number(episode.voteCount)) ? Number(episode.voteCount) : 0,
        sources,
        playable: playableSources.length > 0,
        sourceCount: playableSources.length,
        providerCount: getProviderSources(sources).length
    };
}

function normalizeSeason(season) {
    if (!season || typeof season !== "object") return null;

    const number = Number(season.number);
    if (!Number.isFinite(number) || number < 1) return null;

    const episodes = Array.isArray(season.episodes)
        ? season.episodes.map(normalizeEpisode).filter(Boolean).sort((a, b) => a.number - b.number)
        : [];

    return {
        id: cleanString(season.id),
        number,
        title: cleanString(season.title) || `الموسم ${number}`,
        overview: cleanString(season.overview),
        poster: cleanString(season.poster),
        episodes,
        episodeCount: episodes.length,
        playableEpisodeCount: episodes.filter(episode => episode.playable).length,
        providerEpisodeCount: episodes.filter(episode => episode.providerCount > 0).length
    };
}

function visibleSeasons(seasons) {
    if (!Array.isArray(seasons)) return [];
    return seasons
        .map(normalizeSeason)
        .filter(Boolean)
        .filter(season => season.episodes.length > 0)
        .sort((a, b) => a.number - b.number);
}

function normalizeChapter(chapter) {
    if (!chapter || typeof chapter !== "object") return null;

    const number = Number(chapter.number);
    if (!Number.isFinite(number) || number < 1) return null;

    const sources = normalizeSources(chapter.sources);
    if (sources.length === 0) return null;

    const playableSources = getPlayableSources(sources);

    return {
        id: cleanString(chapter.id),
        number,
        title: cleanString(chapter.title) || `الفصل ${number}`,
        overview: cleanString(chapter.overview),
        releaseDate: cleanString(chapter.releaseDate),
        pages: Number.isFinite(Number(chapter.pages)) ? Number(chapter.pages) : 0,
        sources,
        playable: playableSources.length > 0,
        sourceCount: playableSources.length,
        providerCount: getProviderSources(sources).length
    };
}

function normalizeChapterList(chapters) {
    if (!Array.isArray(chapters)) return [];
    return chapters.map(normalizeChapter).filter(Boolean).sort((a, b) => a.number - b.number);
}

function normalizeWatchItem(item) {
    const value = item && typeof item === "object" ? item : {};
    return {
        ...value,
        type: cleanString(value.type) || "unknown",
        title: cleanString(value.title),
        sources: normalizeSources(value.sources),
        seasons: visibleSeasons(value.seasons),
        chapters: normalizeChapterList(value.chapters)
    };
}

function getFirstWatchSource(item) {
    return getPlayableSources(item?.sources)[0] || null;
}

function getFirstEpisodeSource(episode) {
    return getPlayableSources(episode?.sources)[0] || null;
}

function getFirstChapterSource(chapter) {
    return getPlayableSources(chapter?.sources)[0] || null;
}

module.exports = {
    isValidUrl,
    normalizeSource,
    normalizeSources,
    isPlayableSource,
    getPlayableSources,
    getProviderSources,
    hasWatchSources,
    normalizeEpisode,
    normalizeSeason,
    visibleSeasons,
    normalizeChapter,
    normalizeChapterList,
    normalizeWatchItem,
    getFirstWatchSource,
    getFirstEpisodeSource,
    getFirstChapterSource
};
