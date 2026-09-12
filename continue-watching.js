"use strict";

(function attachContinueWatching() {
    const PREFIX = "iraq-empire-cinema:progress:";
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
    })[char]);

    function injectStyle() {
        if (document.getElementById("continueWatchingStyle")) return;
        const style = document.createElement("style");
        style.id = "continueWatchingStyle";
        style.textContent = `.continue-watching-section{margin:0 0 34px}.continue-watching-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}.continue-card{display:block;color:inherit;text-decoration:none;min-width:0}.continue-poster-wrap{position:relative;aspect-ratio:2/3;border-radius:16px;overflow:hidden;background:#111;border:1px solid rgba(255,255,255,.08);box-shadow:0 12px 35px rgba(0,0,0,.22)}.continue-poster{width:100%;height:100%;display:block;object-fit:cover;transition:transform .25s ease}.continue-card:hover .continue-poster{transform:scale(1.035)}.continue-play{position:absolute;inset:50% auto auto 50%;transform:translate(-50%,-50%);width:46px;height:46px;display:grid;place-items:center;border-radius:50%;background:#b89245;color:#080808;font-weight:900;opacity:0;transition:opacity .2s ease}.continue-card:hover .continue-play{opacity:1}.continue-progress{position:absolute;left:10px;right:10px;bottom:10px;height:4px;border-radius:8px;background:rgba(0,0,0,.65);overflow:hidden}.continue-progress span{display:block;height:100%;background:#b89245}.continue-card-title{font-weight:800;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.continue-card-meta{font-size:12px;color:#999;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media(max-width:700px){.continue-watching-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}`;
        document.head.appendChild(style);
    }

    function collect() {
        const result = [];
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!key || !key.startsWith(PREFIX)) continue;
            const parts = key.slice(PREFIX.length).split(":");
            if (parts.length !== 3) continue;
            let itemId, season, episode;
            try {
                itemId = decodeURIComponent(parts[0]).trim();
                season = decodeURIComponent(parts[1]).trim();
                episode = decodeURIComponent(parts[2]).trim();
            } catch { continue; }
            try {
                const value = JSON.parse(localStorage.getItem(key) || "null");
                const position = Number(value?.position);
                const duration = Number(value?.duration);
                if (!itemId || !season || !episode || !Number.isFinite(position) || position < 0 || !Number.isFinite(duration) || duration <= 0) continue;
                result.push({ itemId, season, episode, position, duration, updatedAt: Number(value?.updatedAt || 0) });
            } catch {}
        }
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        return result.slice(0, 12);
    }

    function ensureSection() {
        let section = document.getElementById("continueWatching");
        if (section) return section;
        section = document.createElement("section");
        section.id = "continueWatching";
        section.className = "section continue-watching-section";
        section.innerHTML = '<div class="section-head"><h2>متابعة المشاهدة</h2><span>أكمل من حيث توقفت</span></div><div class="continue-watching-grid" id="continueWatchingGrid"></div>';
        const anchor = document.getElementById("popular") || document.querySelector("main")?.firstElementChild;
        if (anchor?.parentNode) anchor.parentNode.insertBefore(section, anchor);
        else document.body.prepend(section);
        return section;
    }

    async function load() {
        const entries = collect();
        const section = document.getElementById("continueWatching");
        if (!entries.length) { if (section) section.remove(); return; }
        injectStyle();
        const loaded = await Promise.all(entries.map(async entry => {
            try {
                const response = await fetch(`/api/title?id=${encodeURIComponent(entry.itemId)}&region=IQ`, { cache: "no-store" });
                const payload = await response.json();
                if (!response.ok || !payload.success || !payload.item) return null;
                return { entry, item: payload.item };
            } catch { return null; }
        }));
        const valid = loaded.filter(Boolean);
        if (!valid.length) { if (section) section.remove(); return; }
        const target = ensureSection();
        const grid = target.querySelector("#continueWatchingGrid");
        if (!grid) return;
        grid.innerHTML = valid.map(({ entry, item }) => {
            const progress = Math.max(0, Math.min(100, (entry.position / entry.duration) * 100));
            const title = item.title || "بدون عنوان";
            const poster = item.poster || item.image || item.backdrop || "";
            return `<a class="continue-card" href="/watch.html?id=${encodeURIComponent(entry.itemId)}" aria-label="متابعة ${esc(title)}"><div class="continue-poster-wrap"><img class="continue-poster" src="${esc(poster)}" alt="${esc(title)}" loading="lazy"><span class="continue-play">▶</span><span class="continue-progress"><span style="width:${progress}%"></span></span></div><div class="continue-card-title">${esc(title)}</div><div class="continue-card-meta">الموسم ${esc(entry.season)} • الحلقة ${esc(entry.episode)} • ${Math.round(progress)}%</div></a>`;
        }).join("");
    }

    load();
})();
