"use strict";

(function attachRealVideoProgress() {
    const PREFIX = "iraq-empire-cinema:progress:";
    const params = new URLSearchParams(window.location.search);
    const itemId = String(params.get("id") || "").trim();
    if (!itemId) return;

    const clean = value => encodeURIComponent(String(value ?? "").trim());
    const key = (season, episode) => `${PREFIX}${clean(itemId)}:${clean(season)}:${clean(episode)}`;
    let active = null;
    let timer = null;

    function read(season, episode) {
        try {
            const value = JSON.parse(localStorage.getItem(key(season, episode)) || "null");
            if (!value || !Number.isFinite(Number(value.position)) || !Number.isFinite(Number(value.duration)) || Number(value.duration) <= 0) return null;
            return { position: Number(value.position), duration: Number(value.duration) };
        } catch {
            return null;
        }
    }

    function write() {
        if (!active) return;
        const position = Number(active.video.currentTime);
        const duration = Number(active.video.duration);
        if (!Number.isFinite(position) || position < 0 || !Number.isFinite(duration) || duration <= 0) return;
        localStorage.setItem(key(active.season, active.episode), JSON.stringify({ position, duration, updatedAt: Date.now() }));
    }

    function stop() {
        if (timer) clearInterval(timer);
        timer = null;
        write();
        active = null;
    }

    function prepareVideo(source, ref) {
        const url = String(source?.url || "").trim();
        const kind = String(source?.kind || "").toLowerCase();
        const directVideo = kind === "video" || /\.(mp4|webm|ogg)(?:$|[?#])/i.test(url);
        if (!url || !directVideo || !ref) return;

        const playerBody = document.getElementById("playerBody");
        if (!playerBody) return;

        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.src = url;
        playerBody.innerHTML = "";
        playerBody.appendChild(video);
        window.__IRAQ_CINEMA_EPISODE__ = ref;
    }

    function hookShowPlayer() {
        if (typeof window.showPlayer !== "function" || window.__IRAQ_PROGRESS_HOOKED__) return;
        const original = window.showPlayer;
        window.showPlayer = function(source, title, episodeRef) {
            window.__IRAQ_CINEMA_EPISODE__ = episodeRef || null;
            const result = original.apply(this, arguments);
            prepareVideo(source, episodeRef);
            setTimeout(detectEpisode, 0);
            return result;
        };
        window.__IRAQ_PROGRESS_HOOKED__ = true;
    }

    function detectEpisode() {
        hookShowPlayer();
        const player = document.getElementById("player");
        const video = player?.querySelector("video");
        const ref = window.__IRAQ_CINEMA_EPISODE__;
        if (!video || !ref) return;
        if (active?.video === video && active.season === ref.season && active.episode === ref.episode) return;

        stop();
        active = { video, season: ref.season, episode: ref.episode };
        const saved = read(ref.season, ref.episode);
        const restore = () => {
            if (saved && saved.position > 5 && saved.position < saved.duration - 5) {
                try { video.currentTime = saved.position; } catch {}
            }
        };
        if (video.readyState >= 1) restore();
        else video.addEventListener("loadedmetadata", restore, { once: true });
        video.addEventListener("timeupdate", write);
        video.addEventListener("pause", write);
        video.addEventListener("ended", () => localStorage.removeItem(key(ref.season, ref.episode)), { once: true });
        timer = setInterval(write, 5000);
    }

    const observer = new MutationObserver(detectEpisode);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("beforeunload", write);
    detectEpisode();
})();
