"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const accountSource = fs.readFileSync(path.join(__dirname, "..", "index-account.js"), "utf8");

const { injectNavigationScript } = require("../lib/home-page");

test("homepage injects the index account controller exactly once", () => {
    const html = "<html><body><main>OK</main></body></html>";
    const output = injectNavigationScript(html);
    assert.equal((output.match(/index-account\.js/g) || []).length, 1);
});

test("index account controller uses Supabase Discord OAuth", () => {
    assert.match(accountSource, /\/api\/supabase-config/);
    assert.match(accountSource, /signInWithOAuth/);
    assert.match(accountSource, /provider:\s*["']discord["']/);
    assert.match(accountSource, /window\.location\.origin/);
});

test("index account controller does not require a Discord bot token", () => {
    assert.doesNotMatch(accountSource, /DISCORD_BOT_TOKEN|BOT_TOKEN|DISCORD_TOKEN/);
});

test("index account controller has both logged-out and logged-in states", () => {
    assert.match(accountSource, /discord-index-login/);
    assert.match(accountSource, /discord-index-account/);
    assert.match(accountSource, /account\.html/);
});
