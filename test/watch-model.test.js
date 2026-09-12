"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

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
    assert.equal(hasWatchSources({ sources: [{ name: "Broken", url: "" }] }), false);
});

test("visible seasons never invent missing episodes", () => {
    assert.deepEqual(
        visibleSeasons([
            { number: 1, episodes: [] },
            { number: 2, episodes: [{ number: 3, title: "Three" }] },
            { number: 3 }
        ]),
        [
            { number: 2, episodes: [{ number: 3, title: "Three" }] }
        ]
    );
});

test("chapter normalization keeps only real chapters", () => {
    assert.deepEqual(
        normalizeChapterList([
            { number: 1, title: "One", sources: [{ url: "https://example.com/1" }] },
            { number: 2, title: "Two", sources: [] },
            null
        ]),
        [
            { number: 1, title: "One", sources: [{ url: "https://example.com/1" }] }
        ]
    );
});
