"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { collectContinueWatching } = require("../lib/continue-watching");

test("continue watching keeps only real progress records", () => {
    const storage = new Map([
        ["iraq-empire-cinema:progress:show-a:1:2", JSON.stringify({ position: 120, duration: 600, updatedAt: 30 })],
        ["iraq-empire-cinema:progress:show-b:1:1", JSON.stringify({ position: 0, duration: 0, updatedAt: 40 })],
        ["iraq-empire-cinema:progress:show-c:1:1", "not-json"]
    ]);

    const result = collectContinueWatching(storage);

    assert.deepEqual(result, [{
        itemId: "show-a",
        season: "1",
        episode: "2",
        position: 120,
        duration: 600,
        updatedAt: 30
    }]);
});

test("continue watching sorts newest activity first and caps duplicates per episode", () => {
    const storage = new Map([
        ["iraq-empire-cinema:progress:a:1:1", JSON.stringify({ position: 10, duration: 100, updatedAt: 10 })],
        ["iraq-empire-cinema:progress:b:1:1", JSON.stringify({ position: 20, duration: 100, updatedAt: 50 })],
        ["iraq-empire-cinema:progress:a:1:2", JSON.stringify({ position: 30, duration: 100, updatedAt: 70 })],
        ["iraq-empire-cinema:progress:a:1:1", JSON.stringify({ position: 40, duration: 100, updatedAt: 90 })]
    ]);

    const result = collectContinueWatching(storage, 2);

    assert.equal(result.length, 2);
    assert.equal(result[0].itemId, "a");
    assert.equal(result[0].episode, "1");
    assert.equal(result[1].itemId, "a");
});
