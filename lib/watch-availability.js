"use strict";

function getWatchAvailability(item) {
    const directSources = Array.isArray(item?.sources) ? item.sources : [];
    const seasons = Array.isArray(item?.seasons) ? item.seasons : [];
    const chapters = Array.isArray(item?.chapters) ? item.chapters : [];

    const episodeSourceCount = seasons.reduce((total, season) => {
        const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
        return total + episodes.filter(episode =>
            Array.isArray(episode?.sources) && episode.sources.length > 0
        ).length;
    }, 0);

    const chapterSourceCount = chapters.filter(chapter =>
        Array.isArray(chapter?.sources) && chapter.sources.length > 0
    ).length;

    return {
        available:
            directSources.length > 0 ||
            episodeSourceCount > 0 ||
            chapterSourceCount > 0,
        hasDirectWatchSource: directSources.length > 0,
        hasEpisodeSources: episodeSourceCount > 0,
        hasChapterSources: chapterSourceCount > 0,
        episodeSourceCount,
        chapterSourceCount
    };
}

module.exports = { getWatchAvailability };
