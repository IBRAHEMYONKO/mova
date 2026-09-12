"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    attachSourcesToSeasons,
    attachItemSources
} = require("../lib/watch-response");

test("source attachment adds only valid sources to matching episodes", () => {
    const seasons = [
        {
            number: 1,
            episodes: [
                { number: 1, title: "One", sources: [] },
                { number: 2, title: "Two", sources: [] }
            ]
        }
    ];

    const result = attachSourcesToSeasons(seasons, {
        "1": {
            "1": {
                sources: [
                    { name: "Official", url: "https://example.com/one" }
                ]
            },
            "2": {
                sources: [
                    { name: "Invalid", url: "not-a-url" }
                ]
            }
        }
    });

    assert.equal(result[0].episodes[0].sources.length, 1);
    assert.equal(result[0].episodes[1].sources.length, 0);
});

test("catalog episode sources survive when there is no stored override", () => {
    const seasons = [{
        number: 1,
        episodes: [{
            number: 1,
            sources: [{ name: "Provider", url: "https://example.com/episode", kind: "provider" }]
        }]
    }];

    const result = attachSourcesToSeasons(seasons, {});
    assert.equal(result[0].episodes[0].sources.length, 1);
    assert.equal(result[0].episodes[0].sources[0].kind, "provider");
});

test("catalog item sources survive when there is no stored override", () => {
    const item = {
        title: "Anime",
        sources: [{ name: "Provider", url: "https://example.com/anime", kind: "provider" }]
    };

    const result = attachItemSources(item, {});
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].kind, "provider");
});

test("item source attachment does not create a watch button from invalid URLs", () => {
    const result = attachItemSources(
        { title: "Movie", sources: [] },
        { sources: [{ name: "Broken", url: "" }] }
    );

    assert.equal(result.sources.length, 0);
});
