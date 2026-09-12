"use strict";

(function attachWatchNavigation() {
    const toWatchUrl = id => {
        const value = String(id ?? "").trim();
        return value ? `/watch.html?id=${encodeURIComponent(value)}` : null;
    };

    document.addEventListener("click", event => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const card = target.closest(".content-card, .search-result");
        if (!card) return;

        const id = card.getAttribute("data-id");
        const url = toWatchUrl(id);
        if (!url) return;

        if (target.closest("a, button, input, select, textarea")) return;

        event.preventDefault();
        window.location.assign(url);
    }, true);
})();
