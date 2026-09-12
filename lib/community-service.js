"use strict";

const { validateCommentText, normalizeReaction } = require("./community");

const ALLOWED_TYPES = new Set([
    "movie", "series", "anime", "manga", "manhwa", "novel", "episode", "chapter"
]);

function cleanId(value, label) {
    const result = String(value ?? "").trim();
    if (!result) throw new TypeError(`${label} is required`);
    return result;
}

function cleanType(value) {
    const result = String(value ?? "").trim().toLowerCase();
    if (!ALLOWED_TYPES.has(result)) throw new TypeError("Invalid content type");
    return result;
}

function cleanOptionalInteger(value) {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) throw new TypeError("Invalid context number");
    return number;
}

function buildCommentInsert(input = {}) {
    const body = String(input.body ?? "").trim();
    if (!validateCommentText(body)) throw new TypeError("Invalid comment text");

    return {
        user_id: cleanId(input.userId, "User id"),
        item_id: cleanId(input.itemId, "Item id"),
        item_type: cleanType(input.itemType),
        season_number: cleanOptionalInteger(input.seasonNumber),
        episode_number: cleanOptionalInteger(input.episodeNumber),
        chapter_number: cleanOptionalInteger(input.chapterNumber),
        parent_id: input.parentId ? cleanId(input.parentId, "Parent id") : null,
        body
    };
}

function buildCommentUpdate(body) {
    const value = String(body ?? "").trim();
    if (!validateCommentText(value)) throw new TypeError("Invalid comment text");
    return { body: value, updated_at: new Date().toISOString() };
}

function buildReactionPayload(commentId, userId, reaction) {
    const normalized = normalizeReaction(reaction === 1 ? "like" : reaction === -1 ? "dislike" : reaction);
    if (!normalized) throw new TypeError("Invalid reaction");
    return {
        comment_id: cleanId(commentId, "Comment id"),
        user_id: cleanId(userId, "User id"),
        reaction: normalized === "like" ? 1 : -1
    };
}

function buildReportPayload(commentId, reporterId, reason) {
    const value = String(reason ?? "").trim();
    if (!value || value.length > 500) throw new TypeError("Invalid report reason");
    return {
        comment_id: cleanId(commentId, "Comment id"),
        reporter_id: cleanId(reporterId, "Reporter id"),
        reason: value
    };
}

function normalizeComments(rows, currentUserId) {
    if (!Array.isArray(rows)) return [];
    const userId = String(currentUserId || "");
    return rows.filter(row => !row?.is_hidden || String(row.user_id || "") === userId);
}

module.exports = {
    ALLOWED_TYPES,
    buildCommentInsert,
    buildCommentUpdate,
    buildReactionPayload,
    buildReportPayload,
    normalizeComments
};
