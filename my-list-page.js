"use strict";

(function () {
    const PREFIX = "iraq-empire-cinema:favorite:";
    const grid = document.getElementById("myListGrid");
    const empty = document.getElementById("myListEmpty");
    const filters = document.getElementById("myListFilters");
    if (!grid || !empty) return;

    const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[char]);
    let activeFilter = "all";
    let items = [];

    function ids() {
        const result = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(PREFIX) || localStorage.getItem(key) !== "1") continue;
            try {
                const id = decodeURIComponent(key.slice(PREFIX.length)).trim();
                if (id && !result.includes(id)) result.push(id);
            } catch {}
        }
        return result;
    }

    function typeOf(item) {
        if (item?.type === "movie") return "movie";
        if (item?.type === "anime") return "anime";
        if (item?.type === "series" || item?.type === "tv") return "series";
        return "other";
    }

    function remove(id) {
        localStorage.removeItem(`${PREFIX}${encodeURIComponent(id)}`);
        items = items.filter(item => String(item.id) !== String(id));
        render();
        window.dispatchEvent(new CustomEvent("iraq-cinema-favorites-changed"));
    }

    function render() {
        const visible = activeFilter === "all" ? items : items.filter(item => typeOf(item) === activeFilter);
        empty.hidden = items.length > 0 && visible.length > 0;
        grid.innerHTML = visible.map(item => {
            const type = ({movie:"فيلم",series:"مسلسل",anime:"أنمي"})[typeOf(item)] || "محتوى";
            const image = item.poster || item.image || item.backdrop || "";
            return `<article class="my-list-page-card" data-id="${esc(item.id)}">
                <img src="${esc(image)}" alt="${esc(item.title || "")}" loading="lazy">
                <div class="my-list-page-body">
                    <div class="my-list-page-title" title="${esc(item.title || "")}">${esc(item.title || "بدون عنوان")}</div>
                    <div class="my-list-page-meta">${type}${item.year ? ` • ${esc(item.year)}` : ""}</div>
                    <div class="my-list-page-actions"><a class="my-list-page-watch" href="/watch.html?id=${encodeURIComponent(item.id)}">فتح</a><button class="my-list-page-remove" type="button">إزالة</button></div>
                </div>
            </article>`;
        }).join("");
        if (!items.length) empty.hidden = false;
        grid.querySelectorAll(".my-list-page-remove").forEach(button => button.addEventListener("click", () => {
            const id = button.closest("[data-id]")?.dataset.id;
            if (id) remove(id);
        }));
    }

    async function load() {
        const list = ids();
        if (!list.length) { items = []; render(); return; }
        const results = await Promise.all(list.map(async id => {
            try {
                const response = await fetch(`/api/title?id=${encodeURIComponent(id)}&region=IQ`, { cache: "no-store" });
                const payload = await response.json();
                return response.ok && payload.success && payload.item ? payload.item : null;
            } catch { return null; }
        }));
        items = results.filter(Boolean);
        render();
    }

    filters?.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
        activeFilter = button.dataset.filter || "all";
        filters.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
        render();
    }));

    window.addEventListener("storage", event => {
        if (!event.key || event.key.startsWith(PREFIX)) load();
    });
    window.addEventListener("iraq-cinema-favorites-changed", load);
    load();
})();
