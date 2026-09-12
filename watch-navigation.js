"use strict";

(function attachWatchNavigation() {
    const toWatchUrl = id => {
        const value = String(id ?? "").trim();
        return value ? `/watch.html?id=${encodeURIComponent(value)}` : null;
    };

    function addAccountLink() {
        if (document.querySelector("[data-nova-account-link]")) return;

        const link = document.createElement("a");
        link.href = "/account.html";
        link.textContent = "الحساب";
        link.dataset.novaAccountLink = "1";
        link.style.cssText = [
            "position:fixed",
            "top:18px",
            "left:18px",
            "z-index:9999",
            "padding:9px 14px",
            "border-radius:12px",
            "background:rgba(15,12,13,.9)",
            "border:1px solid rgba(212,166,67,.45)",
            "color:#e4bd62",
            "text-decoration:none",
            "font-weight:700",
            "backdrop-filter:blur(10px)"
        ].join(";");
        document.body.appendChild(link);
    }

    document.addEventListener("DOMContentLoaded", addAccountLink, { once: true });

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
