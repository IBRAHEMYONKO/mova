"use strict";

const NAVIGATION_SCRIPT = '<script src="watch-navigation.js"></script>';

function injectNavigationScript(html) {
    const source = String(html ?? "");
    if (!source) return source;
    if (source.includes(NAVIGATION_SCRIPT)) return source;

    const marker = /<\/body\s*>/i;
    if (!marker.test(source)) return `${source}\n${NAVIGATION_SCRIPT}\n`;

    return source.replace(marker, `    ${NAVIGATION_SCRIPT}\n\n</body>`);
}

module.exports = { injectNavigationScript };
