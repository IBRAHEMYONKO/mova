"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeModerationAction, allowedActions } = require("../lib/moderation");

test("moderation accepts only supported actions", () => {
    assert.ok(allowedActions.has("hide_comment"));
    assert.ok(allowedActions.has("delete_comment"));
    assert.ok(allowedActions.has("ban_user"));
    assert.throws(() => normalizeModerationAction({ action: "hack" }), /Invalid moderation action/);
});

test("moderation action trims reason and ids", () => {
    assert.deepEqual(normalizeModerationAction({
        action: "hide_comment",
        commentId: " c1 ",
        reason: "  مخالف  "
    }), {
        action: "hide_comment",
        commentId: "c1",
        targetUserId: null,
        reportId: null,
        reason: "مخالف"
    });
});
