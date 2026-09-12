"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    validateCommentText,
    normalizeReaction,
    buildCommentPayload
} = require("../lib/community");

test("accepts a normal Arabic comment and trims it", () => {
    assert.deepEqual(
        buildCommentPayload({
            text: "  تجربة جميلة  ",
            contentId: "tmdb:123",
            contentType: "series"
        }),
        {
            text: "تجربة جميلة",
            contentId: "tmdb:123",
            contentType: "series"
        }
    );
});

test("rejects empty or oversized comments", () => {
    assert.equal(validateCommentText("   "), false);
    assert.equal(validateCommentText("x".repeat(2001)), false);
});

test("normalizes reactions to like, dislike, or null", () => {
    assert.equal(normalizeReaction("like"), "like");
    assert.equal(normalizeReaction("dislike"), "dislike");
    assert.equal(normalizeReaction("unknown"), null);
});
