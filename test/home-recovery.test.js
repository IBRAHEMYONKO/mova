"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("home-recovery.js", "utf8");

test("homepage recovery has independent fallbacks", () => {
    assert.match(source, /\/api\/movies\?sort=popular/);
    assert.match(source, /api\.tvmaze\.com\/shows/);
    assert.match(source, /graphql\.anilist\.co/);
    assert.match(source, /\/api\/catalog-media\?page=1&perPage=50/);
    assert.match(source, /anilist-anime-/);
    assert.match(source, /recoveryMangaGrid/);
    assert.match(source, /recoveryManhwaGrid/);
    assert.match(source, /recoveryNovelGrid/);
    assert.match(source, /Promise\.allSettled/);
});
