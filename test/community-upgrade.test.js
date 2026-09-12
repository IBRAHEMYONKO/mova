"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migration = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "community-upgrade.sql"),
    "utf8"
);

const securityMigration = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "community-security.sql"),
    "utf8"
);

const moderationApi = fs.readFileSync(
    path.join(__dirname, "..", "api", "moderation.js"),
    "utf8"
);

test("community upgrade creates private notifications and notification triggers", () => {
    assert.match(migration, /create table if not exists public\.notifications/i);
    assert.match(migration, /users read own notifications/i);
    assert.match(migration, /comment_reply_notification_trigger/i);
    assert.match(migration, /comment_reaction_notification_trigger/i);
});

test("community upgrade blocks banned users from creating community content", () => {
    assert.match(migration, /is_banned = false/i);
    assert.match(securityMigration, /users create comments/i);
    assert.match(securityMigration, /users create reports/i);
    assert.match(securityMigration, /users create own reactions/i);
});

test("moderation endpoint requires moderator checks and records actions", () => {
    assert.match(moderationApi, /Moderator access required/);
    assert.match(moderationApi, /SUPABASE_SECRET_KEY/);
    assert.match(moderationApi, /moderation_actions/);
    assert.match(moderationApi, /hide_comment|show_comment|delete_comment/);
    assert.match(moderationApi, /ban_user|unban_user/);
});
