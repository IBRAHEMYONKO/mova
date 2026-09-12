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
    assert.deepEqual(buildCommentInsert({
        userId: "user-1",
        itemId: "show-1",
        itemType: "series",
        seasonNumber: 2,
        episodeNumber: 7,
        body: "حلقة ممتازة"
    }), {
        user_id: "user-1",
        item_id: "show-1",
        item_type: "series",
        season_number: 2,
        episode_number: 7,
        body: "حلقة ممتازة"
    });
});

test("comment update trims text and rejects empty content", () => {
    assert.deepEqual(buildCommentUpdate("  تعليق جديد  "), { body: "تعليق جديد" });
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
