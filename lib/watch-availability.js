"use strict";

function isPlayableSource(source) {
    if (!source || typeof source !== "object") return false;
    if (!source.url || typeof source.url !== "string") return false;
    return source.kind !== "provider" && source.playable !== false;
}

function playableSources(sources) {
    return Array.isArray(sources) ? sources.filter(isPlayableSource) : [];
}

function providerSources(sources) {
    return Array.isArray(sources)
        ? sources.filter(source => source && source.kind === "provider" && source.url)
        : [];
}

function getWatchAvailability(item) {
    const directSources = playableSources(item?.sources);
    const seasons = Array.isArray(item?.seasons) ? item.seasons : [];
    const chapters = Array.isArray(item?.chapters) ? item.chapters : [];

    const episodeSourceCount = seasons.reduce((total, season) => {
        const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
        return total + episodes.filter(episode => playableSources(episode?.sources).length > 0).length;
    }, 0);

    const chapterSourceCount = chapters.filter(chapter =>
        playableSources(chapter?.sources).length > 0
    ).length;

    const providerCount = seasons.reduce((total, season) => {
        const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
        return total + episodes.reduce((count, episode) => count + providerSources(episode?.sources).length, 0);
    }, 0) + providerSources(item?.sources).length;

    return {
        available: directSources.length > 0 || episodeSourceCount > 0 || chapterSourceCount > 0,
        hasDirectWatchSource: directSources.length > 0,
        hasEpisodeSources: episodeSourceCount > 0,
        hasChapterSources: chapterSourceCount > 0,
        hasOfficialProviderLinks: providerCount > 0,
        episodeSourceCount,
        chapterSourceCount,
        providerCount
    };
}

module.exports = {
    isPlayableSource,
    playableSources,
    providerSources,
    getWatchAvailability
};
