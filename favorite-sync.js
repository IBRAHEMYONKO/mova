"use strict";

(function syncFavoriteChanges() {
    const button = document.getElementById("favorite") || document.getElementById("favoriteButton");
    if (!button) return;

    button.addEventListener("click", () => {
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent("iraq-cinema-favorites-changed"));
        }, 0);
    });
})();
