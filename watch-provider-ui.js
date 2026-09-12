"use strict";

(function attachProviderAvailability() {
    const params = new URLSearchParams(window.location.search);
    const id = String(params.get("id") || "").trim();
    const container = document.getElementById("providers");
    if (!id || !container) return;

    const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    })[char]);

    async function load() {
        try {
            const response = await fetch(`/api/providers?id=${encodeURIComponent(id)}&region=IQ`, {
                cache: "no-store"
            });
            const payload = await response.json();
            if (!response.ok || !payload.success || !Array.isArray(payload.providers)) return;

            const providers = payload.providers.filter(provider => provider?.name);
            if (!providers.length) {
                container.innerHTML = "";
                return;
            }

            container.innerHTML = providers.slice(0, 12).map(provider => {
                const title = `${provider.name}${provider.type ? ` • ${provider.type}` : ""}`;
                const href = provider.link || provider.officialUrl || "";
                if (!href) {
                    return `<span class="provider">${esc(title)}</span>`;
                }

                return `<a class="provider" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="${esc(title)}">${esc(title)} ↗</a>`;
            }).join("");
        } catch {
            // Provider information is supplementary; keep the page usable if it fails.
        }
    }

    load();
})();
