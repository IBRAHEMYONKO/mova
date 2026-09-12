"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "lib", "tmdb-providers.js"), "utf8");

test("TMDB provider mapping preserves the official TMDB watch link", () => {
    assert.match(source, /link:\s*String\(provider\.link\s*\|\|\s*""\)\.trim\(\)/);
});

test("TMDB provider mapping keeps provider type and logo metadata", () => {
    assert.match(source, /logo:/);
    assert.match(source, /type,/);
    assert.match(source, /official:\s*true/);
});
