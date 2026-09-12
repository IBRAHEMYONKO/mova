"use strict";

const MAX_COMMENT_LENGTH = 2000;
const ALLOWED_CONTENT_TYPES = new Set(["movie", "series", "anime", "manga", "manhwa", "novel", "episode", "chapter"]);

function validateCommentText(value) {
    if (typeof value !== "string") return false;
    const text = value.trim();
    return text.length > 0 && text.length <= MAX_COMMENT_LENGTH;
}

function normalizeReaction(value) {
    return value === "like" || value === "dislike" ? value : null;
}

function buildCommentPayload(input = {}) {
    const text = typeof input.text === "string" ? input.text.trim() : "";
    const contentId = typeof input.contentId === "string" ? input.contentId.trim() : "";
    const contentType = typeof input.contentType === "string" ? input.contentType.trim().toLowerCase() : "";

    if (!validateCommentText(text)) throw new TypeError("Invalid comment text");
    if (!contentId) throw new TypeError("Content id is required");
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new TypeError("Invalid content type");

    return { text, contentId, contentType };
}

module.exports = {
    MAX_COMMENT_LENGTH,
    validateCommentText,
    normalizeReaction,
    buildCommentPayload
};
