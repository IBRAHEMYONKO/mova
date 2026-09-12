"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { injectWatchScripts } = require("../lib/watch-page");

test("injects Supabase and cloud sync scripts before body closes", () => {
    const html = "<!doctype html><body><main>watch</main></body>";
    const output = injectWatchScripts(html);

    assert.match(output, /@supabase\/supabase-js@2/);
    assert.match(output, /<script src="\/cloud-sync\.js"><\/script>/);
    assert.ok(output.indexOf("cloud-sync.js") < output.indexOf("<\/body>"));
});

test("does not duplicate watch cloud scripts", () => {
    const html = '<body><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="/cloud-sync.js"></script></body>';
    const output = injectWatchScripts(html);

    assert.equal((output.match(/cloud-sync\.js/g) || []).length, 1);
    assert.equal((output.match(/supabase-js@2/g) || []).length, 1);
});
