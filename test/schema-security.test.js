"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const schema = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "schema.sql"),
    "utf8"
);

test("protects moderator and ban flags from normal profile updates", () => {
    assert.match(schema, /create or replace function public\.protect_profile_security_fields/i);
    assert.match(schema, /is_moderator|is_banned/i);
    assert.match(schema, /before update on public\.profiles/i);
});

test("uses null-safe uniqueness for watch progress dimensions", () => {
    assert.match(schema, /unique index[\s\S]*watch_progress_unique_dimensions[\s\S]*coalesce/i);
});
