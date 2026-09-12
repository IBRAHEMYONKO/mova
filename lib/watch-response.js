"use strict";

const {
    normalizeSources
} = require("./watch-model");

function attachSourcesToSeasons(seasons, sourceSeasons) {
    if (!Array.isArray(seasons)) {
        return [];
    }

    const storage = sourceSeasons && typeof sourceSeasons === "object"
        ? sourceSeasons
        : {};

    return seasons.map(season => {
        const seasonSources = storage[String(season.number)] || {};

        return {
            ...season,
            episodes: (season.episodes || []).map(episode => {
                const entry = seasonSources[String(episode.number)] || {};

                return {
                    ...episode,
                    sources: normalizeSources(entry.sources)
                };
            })
        };
    });
}

function attachItemSources(item, sourceEntry) {
    const entry = sourceEntry && typeof sourceEntry === "object"
        ? sourceEntry
        : {};

    return {
        ...item,
        sources: normalizeSources(entry.sources)
    };
}

module.exports = {
    attachSourcesToSeasons,
    attachItemSources
};
