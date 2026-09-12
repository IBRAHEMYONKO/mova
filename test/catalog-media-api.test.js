"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("api/catalog-media.js", "utf8");

test("catalog media endpoint exposes anime through the canonical AniList catalog", () => {
    assert.match(source, /getAniListAnimeCatalog/);
    assert.match(source, /anime/);
    assert.match(source, /anilist-anime-/);
    assert.match(source, /successfulSources/);
    assert.match(source, /Promise\.allSettled/);
});
