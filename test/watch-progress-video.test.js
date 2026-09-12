"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { saveProgress, readProgress } = require("../lib/watch-progress");

function memoryStorage() {
    const data = new Map();
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); },
        removeItem(key) { data.delete(key); }
    };
}

test("real video progress can be saved without inventing duration", () => {
    const storage = memoryStorage();
    const key = "iraq-empire-cinema:progress:show:1:4";

    assert.equal(saveProgress(storage, key, {
        position: 183.5,
        duration: 1420,
        updatedAt: 123
    }), true);

    assert.deepEqual(readProgress(storage, key), {
        position: 183.5,
        duration: 1420,
        updatedAt: 123
    });
});

test("zero duration is never treated as valid video progress", () => {
    const storage = memoryStorage();
    const key = "iraq-empire-cinema:progress:show:1:4";

    assert.equal(saveProgress(storage, key, {
        position: 0,
        duration: 0,
        updatedAt: 123
    }), false);
    assert.equal(readProgress(storage, key), null);
});
