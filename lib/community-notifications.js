"use strict";

const TYPES = new Set(["reply", "like", "dislike", "report", "moderation"]);
const MAX_MESSAGE_LENGTH = 500;

function buildNotification(input = {}) {
    const userId = String(input.userId || "").trim();
    const type = String(input.type || "").trim().toLowerCase();
    const message = String(input.message || "").trim();
    if (!userId) throw new TypeError("Notification user is required");
    if (!TYPES.has(type)) throw new TypeError("Invalid notification type");
    if (!message || message.length > MAX_MESSAGE_LENGTH) throw new TypeError("Invalid notification message");

    return {
        user_id: userId,
        actor_id: input.actorId ? String(input.actorId) : null,
        type,
        comment_id: input.commentId ? String(input.commentId) : null,
        item_id: input.itemId ? String(input.itemId) : null,
        item_type: input.itemType ? String(input.itemType) : null,
        message,
        is_read: false
    };
}

function normalizeNotification(value = {}) {
    return {
        ...value,
        message: String(value.message || "").trim(),
        is_read: value.is_read === true || value.is_read === 1 || value.is_read === "1"
    };
}

function sortNotifications(values) {
    return (Array.isArray(values) ? values : [])
        .map(normalizeNotification)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

function unreadCount(values) {
    return (Array.isArray(values) ? values : []).filter(item => !normalizeNotification(item).is_read).length;
}

module.exports = { TYPES, MAX_MESSAGE_LENGTH, buildNotification, normalizeNotification, sortNotifications, unreadCount };
