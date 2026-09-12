"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "api", "providers.js"), "utf8");

test("providers API enriches real TMDB availability with official service metadata", () => {
    assert.match(source, /enrichProviders/);
    assert.match(source, /officialDirectory/);
});
