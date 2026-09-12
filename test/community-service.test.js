"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
    buildCommentInsert,
    buildCommentUpdate,
    buildReactionPayload,
    buildReportPayload,
    normalizeComments
} = require("../lib/community-service");

test("comment payload keeps work and episode context", () => {
    const result = buildCommentInsert({
        userId: "user-1",
        itemId: "show-1",
        itemType: "series",
        seasonNumber: 2,
        episodeNumber: 7,
        body: "حلقة ممتازة"
    });
    assert.equal(result.user_id, "user-1");
    assert.equal(result.item_id, "show-1");
    assert.equal(result.item_type, "series");
    assert.equal(result.season_number, 2);
    assert.equal(result.episode_number, 7);
    assert.equal(result.body, "حلقة ممتازة");
});

test("comment update trims text and rejects empty content", () => {
    const result = buildCommentUpdate("  تعليق جديد  ");
    assert.equal(result.body, "تعليق جديد");
    assert.ok(result.updated_at);
    assert.throws(() => buildCommentUpdate("   "), /Invalid comment text/);
});

test("reaction payload uses one user reaction", () => {
    assert.deepEqual(buildReactionPayload("comment-1", "user-1", 1), {
        comment_id: "comment-1",
        user_id: "user-1",
        reaction: 1
    });
    assert.throws(() => buildReactionPayload("comment-1", "user-1", 0), /Invalid reaction/);
});

test("report payload is normalized", () => {
    assert.deepEqual(buildReportPayload("comment-1", "user-1", "  محتوى مخالف  "), {
        comment_id: "comment-1",
        reporter_id: "user-1",
        reason: "محتوى مخالف"
    });
});

test("comments normalize hidden records away unless owned", () => {
    const result = normalizeComments([
        { id: "1", body: "visible", is_hidden: false, user_id: "other" },
        { id: "2", body: "hidden", is_hidden: true, user_id: "other" },
        { id: "3", body: "mine", is_hidden: true, user_id: "me" }
    ], "me");

    assert.deepEqual(result.map(item => item.id), ["1", "3"]);
});
