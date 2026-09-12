"use strict";

const NAVIGATION_SCRIPT = '<script src="watch-navigation.js"></script>';
const CONTINUE_WATCHING_SCRIPT = '<script src="continue-watching.js"></script>';

function injectNavigationScript(html) {
    const source = String(html ?? "");
    if (!source) return source;

    let output = source;
    if (!output.includes(NAVIGATION_SCRIPT)) {
        const marker = /<\/body\s*>/i;
        output = marker.test(output)
            ? output.replace(marker, `    ${NAVIGATION_SCRIPT}\n\n</body>`)
            : `${output}\n${NAVIGATION_SCRIPT}\n`;
    }

    if (!output.includes(CONTINUE_WATCHING_SCRIPT)) {
        const marker = /<\/body\s*>/i;
        output = marker.test(output)
            ? output.replace(marker, `    ${CONTINUE_WATCHING_SCRIPT}\n\n</body>`)
            : `${output}\n${CONTINUE_WATCHING_SCRIPT}\n`;
    }

    return output;
}

module.exports = { injectNavigationScript };
