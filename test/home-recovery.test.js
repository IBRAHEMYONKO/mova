"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("home-recovery.js", "utf8");

test("homepage recovery has independent fallbacks", () => {
    assert.match(source, /\/api\/movies\?sort=popular/);
    assert.match(source, /api\.tvmaze\.com\/shows/);
    assert.match(source, /api\.jikan\.moe\/v4\/top\/anime/);
    assert.match(source, /graphql\.anilist\.co/);
    assert.match(source, /\/api\/catalog-media\?page=1/);
    assert.match(source, /Promise\.allSettled/);
});
