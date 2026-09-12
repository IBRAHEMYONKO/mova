"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { getWatchNavigation } = require("../lib/watch-navigation");

test("returns watch navigation for a content card id", () => {
    assert.deepEqual(getWatchNavigation("tmdb:123"), {
        href: "/watch.html?id=tmdb%3A123",
        id: "tmdb:123"
    });
});

test("returns null when a card has no usable id", () => {
    assert.equal(getWatchNavigation("   "), null);
});
