"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    mapTmdbSeason,
    mapTmdbEpisode,
    mapTmdbMovieWatchModel,
    normalizeSeasons,
    getPlayableEpisodes
} = require("../lib/episode-model");

test("TMDB season mapping keeps real episodes and their metadata", () => {
    const season = mapTmdbSeason({ id: 99, season_number: 2, name: "Season 2", episodes: [
        { id: 100, episode_number: 1, name: "Episode One", runtime: 24 }
    ] });
    assert.equal(season.number, 2);
    assert.equal(season.episodes.length, 1);
    assert.equal(season.episodes[0].number, 1);
    assert.equal(season.episodes[0].title, "Episode One");
    assert.equal(season.episodes[0].duration, 24);
    assert.equal(season.episodes[0].playable, false);
    assert.equal(season.episodes[0].sourceCount, 0);
});

test("episode model preserves an empty source list until a real provider is attached", () => {
    const episode = mapTmdbEpisode({ id: 100, episode_number: 7, name: "Episode Seven" });
    assert.equal(episode.number, 7);
    assert.deepEqual(episode.sources, []);
    assert.equal(episode.playable, false);
    assert.equal(episode.sourceCount, 0);
});

test("movie watch model starts without invented seasons", () => {
    const item = mapTmdbMovieWatchModel({ id: 55, type: "movie", title: "A Movie" });
    assert.equal(item.seasons.length, 0);
    assert.equal(item.chapters.length, 0);
});

test("normalization keeps real episodes even when no playable source exists", () => {
    const seasons = normalizeSeasons([
        { number: 0, episodes: [{ number: 1, sources: [{ url: "https://example.com/special" }] }] },
        { number: 1, episodes: [
            { number: 1, sources: [{ url: "https://example.com/1" }] },
            { number: 2, sources: [] },
            { number: 3, sources: [{ url: "" }] }
        ] }
    ]);
    assert.deepEqual(seasons.map(season => season.number), [1]);
    assert.deepEqual(seasons[0].episodes.map(episode => episode.number), [1, 2, 3]);
    assert.equal(seasons[0].episodeCount, 3);
    assert.equal(seasons[0].playableEpisodeCount, 1);
    assert.equal(seasons[0].episodes[1].playable, false);
    assert.equal(seasons[0].episodes[1].sourceCount, 0);
});

test("playable episodes require a non-empty source URL", () => {
    const episodes = getPlayableEpisodes({ episodes: [
        { number: 1, sources: [] },
        { number: 2, sources: [{ url: "https://example.com/2" }] },
        { number: 3, sources: [{ url: "" }] }
    ] });
    assert.deepEqual(episodes.map(item => item.number), [2]);
});
