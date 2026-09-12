"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("community schema contains notifications and banned-user protection", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "supabase", "community-upgrade.sql"), "utf8");
    assert.match(source, /create table if not exists public\.notifications/);
    assert.match(source, /users read own notifications/);
    assert.match(source, /p\.is_banned = false/);
    assert.match(source, /comment_reply_notification_trigger/);
    assert.match(source, /comment_reaction_notification_trigger/);
});
