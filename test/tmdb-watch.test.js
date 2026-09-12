"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    buildTmdbUrl,
    getSeasonNumbers
} = require("../lib/tmdb-watch");

test("TMDB URL builder encodes the API path and language", () => {
    const url = buildTmdbUrl("/tv/123/season/2", "test-key");
    assert.match(url, /api\.themoviedb\.org\/3\/tv\/123\/season\/2/);
    assert.match(url, /api_key=test-key/);
    assert.match(url, /language=ar-SA/);
});

test("season numbers exclude specials and invalid entries", () => {
    assert.deepEqual(
        getSeasonNumbers([
            { season_number: 0 },
            { season_number: 1 },
            { season_number: 2 },
            { season_number: 2 },
            { season_number: -1 },
            { season_number: "x" }
        ]),
        [1, 2]
    );
});
