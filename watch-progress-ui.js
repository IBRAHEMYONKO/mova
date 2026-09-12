"use strict";

(function attachRealVideoProgress() {
    const PREFIX = "iraq-empire-cinema:progress:";
    const params = new URLSearchParams(window.location.search);
    const itemId = String(params.get("id") || "").trim();
    if (!itemId) return;

    const clean = value => encodeURIComponent(String(value ?? "").trim());
    const key = (season, episode) =>
        `${PREFIX}${clean(itemId)}:${clean(season)}:${clean(episode)}`;

    let active = null;
    let timer = null;

    function read(season, episode) {
        try {
            const value = JSON.parse(localStorage.getItem(key(season, episode)) || "null");
            if (!value || !Number.isFinite(Number(value.position)) ||
                !Number.isFinite(Number(value.duration)) || Number(value.duration) <= 0) {
                return null;
            }
            return {
                position: Number(value.position),
                duration: Number(value.duration)
            };
        } catch {
            return null;
        }
    }

    function write() {
        if (!active) return;
        const { video, season, episode } = active;
        const position = Number(video.currentTime);
        const duration = Number(video.duration);
        if (!Number.isFinite(position) || position < 0 ||
            !Number.isFinite(duration) || duration <= 0) return;

        localStorage.setItem(key(season, episode), JSON.stringify({
            position,
            duration,
            updatedAt: Date.now()
        }));
    }

    function stop() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        write();
        active = null;
    }

    function detectEpisode() {
        const player = document.getElementById("player");
        const video = player?.querySelector("video");
        if (!video || !window.__IRAQ_CINEMA_EPISODE__) return;

        const ref = window.__IRAQ_CINEMA_EPISODE__;
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
        video.addEventListener("ended", () => {
            localStorage.removeItem(key(ref.season, ref.episode));
        }, { once: true });
        timer = setInterval(write, 5000);
    }

    const observer = new MutationObserver(detectEpisode);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("beforeunload", write);
    detectEpisode();
})();
