"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    mapTmdbSeason,
    mapTmdbEpisode,
    mapTmdbMovieWatchModel
} = require("../lib/episode-model");

test("TMDB season mapping keeps real episodes and their metadata", () => {
    const season = mapTmdbSeason({
        id: 99,
        season_number: 2,
        name: "Season 2",
        overview: "Season overview",
        poster_path: "/season.jpg",
        episodes: [
            {
                id: 100,
                episode_number: 1,
                name: "Episode One",
                overview: "Episode overview",
                still_path: "/episode.jpg",
                runtime: 24,
                air_date: "2026-01-01"
            }
        ]
    });

    assert.equal(season.number, 2);
    assert.equal(season.episodes.length, 1);
    assert.equal(season.episodes[0].number, 1);
    assert.equal(season.episodes[0].title, "Episode One");
    assert.equal(season.episodes[0].duration, 24);
});

test("episode model preserves an empty source list until a real provider is attached", () => {
    const episode = mapTmdbEpisode({
        id: 100,
        episode_number: 7,
        name: "Episode Seven"
    });

    assert.equal(episode.number, 7);
    assert.equal(episode.title, "Episode Seven");
    assert.deepEqual(episode.sources, []);
});

test("movie watch model starts without invented seasons", () => {
    const item = mapTmdbMovieWatchModel({
        id: 55,
        type: "movie",
        title: "A Movie"
    });

    assert.equal(item.seasons.length, 0);
    assert.equal(item.chapters.length, 0);
});
