"use strict";

(function attachMyList() {
    const PREFIX = "iraq-empire-cinema:favorite:";
    const sectionId = "myList";
    const limit = 12;

    const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    })[char]);

    function collectIds() {
        const ids = [];
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!key || !key.startsWith(PREFIX) || localStorage.getItem(key) !== "1") continue;
            try {
                const id = decodeURIComponent(key.slice(PREFIX.length)).trim();
                if (id && !ids.includes(id)) ids.push(id);
            } catch {}
        }
        return ids.slice(0, limit);
    }

    function removeId(id) {
        localStorage.removeItem(`${PREFIX}${encodeURIComponent(id)}`);
    }

    function createSection() {
        let section = document.getElementById(sectionId);
        if (section) return section;

        section = document.createElement("section");
        section.id = sectionId;
        section.className = "cinema-section my-list-section";
        section.innerHTML = '<div class="section-head"><div><span class="section-kicker">قائمتك</span><h2>قائمتي</h2></div></div><div class="my-list-grid"></div>';

        const style = document.createElement("style");
        style.textContent = `
            .my-list-section{margin:28px 0}
            .my-list-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:16px}
            .my-list-card{position:relative;background:#101010;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;min-width:0}
            .my-list-card img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover;background:#181818}
            .my-list-card-body{padding:11px}
            .my-list-card-title{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .my-list-card-meta{color:#999;font-size:12px;margin-top:5px}
            .my-list-card-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}
            .my-list-card-actions a,.my-list-card-actions button{border:0;border-radius:9px;padding:8px;text-align:center;cursor:pointer;text-decoration:none;font-weight:800;font-size:12px}
            .my-list-watch{background:#b89245;color:#080808}.my-list-remove{background:#191919;color:#ddd}
            .my-list-empty{padding:25px;border:1px dashed rgba(255,255,255,.12);border-radius:15px;color:#999;text-align:center}
            @media(max-width:600px){.my-list-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
        `;
        document.head.appendChild(style);

        const target = document.getElementById("popular") || document.querySelector("main")?.firstElementChild || document.body.firstElementChild;
        target?.parentNode?.insertBefore(section, target);
        return section;
    }

    async function load() {
        const ids = collectIds();
        const section = document.getElementById(sectionId) || (ids.length ? createSection() : null);
        if (!section) return;

        const grid = section.querySelector(".my-list-grid");
        if (!ids.length) {
            section.remove();
            return;
        }

        const results = await Promise.all(ids.map(async id => {
            try {
                const response = await fetch(`/api/title?id=${encodeURIComponent(id)}&region=IQ`, { cache: "no-store" });
                const payload = await response.json();
                if (!response.ok || !payload.success || !payload.item) return null;
                return payload.item;
            } catch {
                return null;
            }
        }));

        const items = results.filter(Boolean);
        if (!items.length) {
            section.remove();
            return;
        }

        grid.innerHTML = items.map(item => {
            const image = item.poster || item.image || item.backdrop || "";
            const type = ({ movie: "فيلم", series: "مسلسل", tv: "مسلسل", anime: "أنمي" })[item.type] || "محتوى";
            return `<article class="my-list-card" data-id="${esc(item.id)}">
                <img src="${esc(image)}" alt="${esc(item.title || "")}" loading="lazy">
                <div class="my-list-card-body">
                    <div class="my-list-card-title" title="${esc(item.title || "")}">${esc(item.title || "بدون عنوان")}</div>
                    <div class="my-list-card-meta">${esc(type)}${item.year ? ` • ${esc(item.year)}` : ""}</div>
                    <div class="my-list-card-actions">
                        <a class="my-list-watch" href="/watch.html?id=${encodeURIComponent(item.id)}">فتح</a>
                        <button class="my-list-remove" type="button">إزالة</button>
                    </div>
                </div>
            </article>`;
        }).join("");

        grid.querySelectorAll(".my-list-remove").forEach(button => {
            button.addEventListener("click", () => {
                const card = button.closest("[data-id]");
                const id = card?.dataset.id;
                if (!id) return;
                removeId(id);
                card.remove();
                if (!grid.children.length) section.remove();
                window.dispatchEvent(new CustomEvent("iraq-cinema-favorites-changed"));
            });
        });
    }

    load();
    window.addEventListener("iraq-cinema-favorites-changed", load);
    window.addEventListener("storage", event => {
        if (event.key && event.key.startsWith(PREFIX)) load();
    });
})();
