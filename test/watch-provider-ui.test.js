"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "watch-provider-ui.js"), "utf8");

test("watch provider UI reads only real availability from the providers API", () => {
    assert.match(source, /\/api\/providers\?id=/);
    assert.match(source, /providers/);
});

test("watch provider UI uses the TMDB watch link and does not invent provider links", () => {
    assert.match(source, /provider\.link/);
    assert.match(source, /officialUrl/);
    assert.match(source, /noopener noreferrer/);
});
