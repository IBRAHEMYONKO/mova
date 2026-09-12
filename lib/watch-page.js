"use strict";

const NAVIGATION_SCRIPTS = [
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
    '<script src="/cloud-sync.js"></script>',
    '<script src="/watch-provider-ui.js"></script>'
];

function injectWatchScripts(html) {
    const source = String(html || "");
    if (!source) return source;

    let output = source;
    for (const script of NAVIGATION_SCRIPTS) {
        if (output.includes(script)) continue;
        output = output.replace(/<\/body\s*>/i, `    ${script}\n</body>`);
    }
    return output;
}

module.exports = { injectWatchScripts };
