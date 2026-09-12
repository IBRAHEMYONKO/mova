"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const target = path.join(__dirname, "..", "api", "supabase-config.js");

test("supabase config endpoint exposes only public client configuration", () => {
    const source = fs.readFileSync(target, "utf8");
    assert.match(source, /SUPABASE_URL/);
    assert.match(source, /SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY.*res\.json|res\.json.*SUPABASE_SECRET_KEY/s);
});

test("account page uses the public Supabase configuration endpoint", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "account.js"), "utf8");
    assert.match(source, /\/api\/supabase-config/);
    assert.match(source, /signInWithOAuth/);
    assert.match(source, /provider:\s*["']discord["']/i);
});
