import { parseCoordinateInput, geocode } from "../tools/searchtools.js";
import { escapeHtml } from "../utils/dom.js";

let debounceTimer = null;

export function initSearch(map) {
    const input = document.getElementById("searchInput");
    const results = document.getElementById("searchResults");
    if (!input || !results) return;

    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (!query) {
            hideResults();
            return;
        }

        const coord = parseCoordinateInput(query);
        if (coord) {
            showResults([{ display_name: `Coordinates: ${coord.lat}, ${coord.lng}`, lat: coord.lat, lon: coord.lng }]);
            return;
        }

        debounceTimer = setTimeout(() => runSearch(query), 400);
    });

    document.addEventListener("click", (e) => {
        if (e.target !== input && !results.contains(e.target)) hideResults();
    });

    async function runSearch(query) {
        try {
            const items = await geocode(query);
            if (!items || items.length === 0) {
                showMessage("No results found.");
                return;
            }
            showResults(items.slice(0, 6));
        } catch (err) {
            showMessage("Search failed. Check your connection and try again.");
        }
    }

    function showResults(items) {
        results.innerHTML = items
            .map((item, i) => `<button class="search-result-item" data-idx="${i}">${escapeHtml(item.display_name)}</button>`)
            .join("");
        results.classList.remove("hidden");

        results.querySelectorAll(".search-result-item").forEach((btn, i) => {
            btn.addEventListener("click", () => {
                const item = items[i];
                map.flyTo([parseFloat(item.lat), parseFloat(item.lon)], 14);
                input.value = item.display_name;
                hideResults();
            });
        });
    }

    function showMessage(msg) {
        results.innerHTML = `<p class="search-result-empty">${escapeHtml(msg)}</p>`;
        results.classList.remove("hidden");
    }

    function hideResults() {
        results.classList.add("hidden");
    }
}
