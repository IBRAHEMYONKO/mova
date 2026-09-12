"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { collectFavorites, toggleFavorite, favoriteKey } = require("../lib/my-list");

function memoryStorage(entries = []) {
    const data = new Map(entries);
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); },
        removeItem(key) { data.delete(key); },
        entries() { return data.entries(); }
    };
}

test("my list collects only real favorite records", () => {
    const storage = memoryStorage([
        ["iraq-empire-cinema:favorite:movie-1", "1"],
        ["iraq-empire-cinema:favorite:show-2", "0"],
        ["iraq-empire-cinema:favorite:bad", "yes"],
        ["other:key", "1"]
    ]);

    assert.deepEqual(collectFavorites(storage), ["movie-1"]);
});

test("favorite toggle adds and removes the exact content key", () => {
    const storage = memoryStorage();
    const key = favoriteKey("show:42");

    assert.equal(toggleFavorite(storage, key), true);
    assert.equal(storage.getItem(key), "1");
    assert.equal(toggleFavorite(storage, key), false);
    assert.equal(storage.getItem(key), null);
});

test("favorite key safely encodes content ids", () => {
    assert.equal(favoriteKey("show:42"), "iraq-empire-cinema:favorite:show%3A42");
});
