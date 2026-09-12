"use strict";

const allowedActions = new Set([
    "hide_comment",
    "show_comment",
    "delete_comment",
    "ban_user",
    "unban_user",
    "resolve_report",
    "reject_report"
]);

function normalizeModerationAction(input = {}) {
    const action = String(input.action || "").trim().toLowerCase();
    if (!allowedActions.has(action)) throw new TypeError("Invalid moderation action");

    return {
        action,
        commentId: input.commentId ? String(input.commentId).trim() : null,
        targetUserId: input.targetUserId ? String(input.targetUserId).trim() : null,
        reportId: input.reportId ? String(input.reportId).trim() : null,
        reason: String(input.reason || "").trim().slice(0, 500)
    };
}

module.exports = { allowedActions, normalizeModerationAction };
