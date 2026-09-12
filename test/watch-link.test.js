"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildWatchUrl } = require("../lib/watch-link");

test("builds a safe watch URL", () => {
    assert.equal(
        buildWatchUrl("abc 123"),
        "/watch.html?id=abc%20123"
    );
});

test("falls back to home for a missing id", () => {
    assert.equal(buildWatchUrl(""), "/");
});
