"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    normalizeWatchItem,
    hasWatchSources,
    visibleSeasons,
    normalizeChapterList
} = require("../lib/watch-model");

test("watch item exposes only seasons that contain real episodes", () => {
    const item = normalizeWatchItem({
        id: "anime-1",
        type: "anime",
        title: "Test Anime",
        seasons: [
            { number: 1, episodes: [] },
            {
                number: 2,
                episodes: [
                    {
                        number: 1,
                        title: "Episode 1",
                        sources: [{ name: "Official", url: "https://example.com/e1" }]
                    }
                ]
            }
        ]
    });

    assert.equal(item.seasons.length, 1);
    assert.equal(item.seasons[0].number, 2);
    assert.equal(item.seasons[0].episodes.length, 1);
});

test("watch sources are required before a watch action is considered available", () => {
    assert.equal(hasWatchSources({ sources: [] }), false);
    assert.equal(hasWatchSources({ sources: [{ name: "Trailer", url: "https://example.com", kind: "external" }] }), true);
    assert.equal(hasWatchSources({ sources: [{ name: "Official provider", url: "https://example.com", kind: "provider" }] }), false);
    assert.equal(hasWatchSources({ sources: [{ name: "Broken", url: "" }] }), false);
});

test("visible seasons never invent missing episodes", () => {
    const seasons = visibleSeasons([
        { number: 1, episodes: [] },
        {
            number: 2,
            episodes: [
                {
                    number: 3,
                    title: "Three",
                    sources: [{ name: "Official", url: "https://example.com/e3" }]
                }
            ]
        },
        { number: 3 }
    ]);

    assert.equal(seasons.length, 1);
    assert.equal(seasons[0].number, 2);
    assert.equal(seasons[0].episodes.length, 1);
    assert.equal(seasons[0].episodes[0].number, 3);
});

test("provider-only episodes remain visible without becoming playable", () => {
    const seasons = visibleSeasons([
        {
            number: 1,
            episodes: [
                {
                    number: 1,
                    title: "Official episode",
                    sources: [{
                        name: "Official provider",
                        url: "https://example.com/e1",
                        kind: "provider",
                        official: true
                    }]
                }
            ]
        }
    ]);

    assert.equal(seasons.length, 1);
    assert.equal(seasons[0].episodeCount, 1);
    assert.equal(seasons[0].playableEpisodeCount, 0);
    assert.equal(seasons[0].providerEpisodeCount, 1);
    assert.equal(seasons[0].episodes[0].playable, false);
    assert.equal(seasons[0].episodes[0].providerCount, 1);
});

test("chapter normalization keeps real chapter metadata even without a source", () => {
    const chapters = normalizeChapterList([
        { number: 1, title: "One", sources: [{ url: "https://example.com/1" }] },
        { number: 2, title: "Two", sources: [] },
        { number: 3, title: "Three", sources: [{ url: "" }] },
        null
    ]);

    assert.equal(chapters.length, 3);
    assert.equal(chapters[0].playable, true);
    assert.equal(chapters[0].sourceCount, 1);
    assert.equal(chapters[1].playable, false);
    assert.equal(chapters[1].sourceCount, 0);
    assert.equal(chapters[2].playable, false);
    assert.equal(chapters[2].sourceCount, 0);
});
