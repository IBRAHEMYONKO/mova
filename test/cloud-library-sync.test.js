"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "cloud-library-sync.js"), "utf8");

test("cloud library sync uses Supabase auth and both library tables", () => {
    assert.match(source, /auth\.getUser/);
    assert.match(source, /from\("favorites"\)/);
    assert.match(source, /from\("watch_progress"\)/);
    assert.match(source, /localStorage/);
});

test("cloud library sync rejects invalid zero-duration progress", () => {
    assert.match(source, /duration <= 0/);
    assert.match(source, /Number\.isFinite\(duration\)/);
});

test("homepage and watch page expose cloud sync exactly once", () => {
    const { injectNavigationScript } = require("../lib/home-page");
    const { injectWatchScripts } = require("../lib/watch-page");
    const home = injectNavigationScript("<body></body>");
    const watch = injectWatchScripts("<body></body>");
    assert.equal((home.match(/cloud-library-sync\.js/g) || []).length, 1);
    assert.equal((watch.match(/cloud-library-sync\.js/g) || []).length, 1);
});
