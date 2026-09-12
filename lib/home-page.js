"use strict";

const NAVIGATION_SCRIPT = '<script src="watch-navigation.js"></script>';
const CONTINUE_WATCHING_SCRIPT = '<script src="continue-watching.js"></script>';
const MY_LIST_SCRIPT = '<script src="my-list.js"></script>';
const SUPABASE_SCRIPT = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
const CLOUD_LIBRARY_SCRIPT = '<script src="cloud-library-sync.js"></script>';

function injectNavigationScript(html) {
    const source = String(html ?? "");
    if (!source) return source;
    let output = source;
    for (const script of [NAVIGATION_SCRIPT, CONTINUE_WATCHING_SCRIPT, MY_LIST_SCRIPT, SUPABASE_SCRIPT, CLOUD_LIBRARY_SCRIPT]) {
        if (output.includes(script)) continue;
        const marker = /<\/body\s*>/i;
        output = marker.test(output)
            ? output.replace(marker, `    ${script}\n\n</body>`)
            : `${output}\n${script}\n`;
    }
    return output;
}

module.exports = { injectNavigationScript };
