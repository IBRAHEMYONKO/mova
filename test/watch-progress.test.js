"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
    progressKey,
    saveProgress,
    readProgress,
    clearProgress,
    favoriteKey,
    isFavorite,
    toggleFavorite
} = require("../lib/watch-progress");

function memoryStorage() {
    const data = new Map();
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); },
        removeItem(key) { data.delete(key); }
    };
}

test("progress is stored and restored per title and episode", () => {
    const storage = memoryStorage();
    const key = progressKey("movie-1", "1", "4");

    saveProgress(storage, key, { position: 125, duration: 600, updatedAt: 10 });

    assert.deepEqual(readProgress(storage, key), {
        position: 125,
        duration: 600,
        updatedAt: 10
    });
});

test("invalid progress is ignored", () => {
    const storage = memoryStorage();
    const key = progressKey("show-1", "1", "2");

    saveProgress(storage, key, { position: -1, duration: 0 });

    assert.equal(readProgress(storage, key), null);
});

test("progress can be cleared", () => {
    const storage = memoryStorage();
    const key = progressKey("show-1", "1", "2");

    saveProgress(storage, key, { position: 20, duration: 100, updatedAt: 1 });
    clearProgress(storage, key);

    assert.equal(readProgress(storage, key), null);
});

test("favorites toggle on and off", () => {
    const storage = memoryStorage();
    const key = favoriteKey("anime-1");

    assert.equal(isFavorite(storage, key), false);
    assert.equal(toggleFavorite(storage, key), true);
    assert.equal(isFavorite(storage, key), true);
    assert.equal(toggleFavorite(storage, key), false);
    assert.equal(isFavorite(storage, key), false);
});
