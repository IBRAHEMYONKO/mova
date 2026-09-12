"use strict";

const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

function text(value) {
    return value === null || value === undefined ? "" : String(value).trim();
}

function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
}

function hasRealSource(episode) {
    return Array.isArray(episode?.sources) && episode.sources.some(source =>
        source && typeof source.url === "string" && source.url.trim()
    );
}

function getPlayableEpisodes(season) {
    return Array.isArray(season?.episodes)
        ? season.episodes.filter(hasRealSource)
        : [];
}

function normalizeSeasons(seasons) {
    if (!Array.isArray(seasons)) return [];

    return seasons
        .filter(season => Number(season?.number) >= 1)
        .map(season => {
            const episodes = Array.isArray(season.episodes)
                ? season.episodes.filter(episode => episode && Number(episode.number) >= 1).slice().sort((a, b) => Number(a.number) - Number(b.number))
                : [];

            return {
                ...season,
                episodes,
                episodeCount: episodes.length,
                playableEpisodeCount: episodes.filter(hasRealSource).length
            };
        })
        .filter(season => season.episodes.length > 0)
        .sort((a, b) => Number(a.number) - Number(b.number));
}

function mapTmdbEpisode(episode) {
    if (!episode || typeof episode !== "object") return null;
    const episodeNumber = number(episode.episode_number);
    if (episodeNumber < 1) return null;

    return {
        id: episode.id ? `tmdb-episode-${episode.id}` : "",
        tmdbId: number(episode.id),
        number: episodeNumber,
        title: text(episode.name) || `الحلقة ${episodeNumber}`,
        overview: text(episode.overview),
        thumbnail: episode.still_path ? `${TMDB_IMAGE}${episode.still_path}` : "",
        duration: number(episode.runtime),
        releaseDate: text(episode.air_date),
        voteAverage: number(episode.vote_average),
        voteCount: number(episode.vote_count),
        sources: [],
        playable: false,
        sourceCount: 0
    };
}

function mapTmdbSeason(season) {
    if (!season || typeof season !== "object") return null;
    const seasonNumber = number(season.season_number);
    if (seasonNumber < 1) return null;

    const episodes = Array.isArray(season.episodes)
        ? season.episodes.map(mapTmdbEpisode).filter(Boolean).sort((a, b) => a.number - b.number)
        : [];

    return {
        id: season.id ? `tmdb-season-${season.id}` : "",
        tmdbId: number(season.id),
        number: seasonNumber,
        title: text(season.name) || `الموسم ${seasonNumber}`,
        overview: text(season.overview),
        poster: season.poster_path ? `${TMDB_IMAGE}${season.poster_path}` : "",
        episodes,
        episodeCount: episodes.length,
        playableEpisodeCount: episodes.filter(hasRealSource).length
    };
}

function mapTmdbMovieWatchModel(item) {
    const value = item && typeof item === "object" ? item : {};
    return {
        ...value,
        seasons: [],
        chapters: [],
        sources: Array.isArray(value.sources) ? value.sources : []
    };
}

module.exports = {
    hasRealSource,
    getPlayableEpisodes,
    normalizeSeasons,
    mapTmdbEpisode,
    mapTmdbSeason,
    mapTmdbMovieWatchModel
};
