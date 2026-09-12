"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
    buildNotification,
    normalizeNotification,
    sortNotifications,
    unreadCount
} = require("../lib/community-notifications");

test("notification payload links a recipient to the related comment", () => {
    assert.deepEqual(buildNotification({
        userId: "u1",
        actorId: "u2",
        type: "reply",
        commentId: "c1",
        itemId: "show-1",
        itemType: "series",
        message: "رد على تعليقك"
    }), {
        user_id: "u1",
        actor_id: "u2",
        type: "reply",
        comment_id: "c1",
        item_id: "show-1",
        item_type: "series",
        message: "رد على تعليقك",
        is_read: false
    });
});

test("invalid notification type is rejected", () => {
    assert.throws(() => buildNotification({ userId: "u1", type: "unknown", message: "x" }), /Invalid notification type/);
});

test("notifications normalize and sort newest first", () => {
    const result = sortNotifications([
        { id: "1", created_at: "2026-01-01T00:00:00Z", is_read: true },
        { id: "2", created_at: "2026-02-01T00:00:00Z", is_read: false }
    ]);
    assert.equal(result[0].id, "2");
    assert.equal(unreadCount(result), 1);
    assert.deepEqual(normalizeNotification({ id: "x", message: " hi ", is_read: 0 }).message, "hi");
});
