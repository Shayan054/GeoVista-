import {
    initMarkerTool,
    MARKER_CATEGORIES,
    armMarkerAdd,
    getMarkers,
    setSelectedCategory,
    getSelectedCategory,
    onMarkersChange,
    focusMarker,
    deleteMarker
} from "../tools/markertools.js";
import { openPanel, closePanel } from "./panel.js";
import { escapeHtml, refreshIcons } from "../utils/dom.js";
import { isPanelOpenFor } from "./panelState.js";

let initialized = false;

export function initMarkersPanel(map) {
    if (initialized) return;
    initialized = true;

    initMarkerTool(map);
    onMarkersChange(() => {
        if (isPanelOpenFor("Markers")) renderMarkersPanel();
    });
}

export function renderMarkersPanel() {
    const markers = getMarkers();

    const categoryOptions = Object.entries(MARKER_CATEGORIES)
        .map(
            ([key, cfg]) =>
                `<option value="${key}" ${getSelectedCategory() === key ? "selected" : ""}>${cfg.label}</option>`
        )
        .join("");

    const list =
        markers.length === 0
            ? `<p class="text-gray-500 text-sm mt-3">No markers yet. Pick a category, click "Add Marker", then click anywhere on the map.</p>`
            : `<div class="space-y-2 mt-3">
                ${markers
                    .map((m) => {
                        const cfg = MARKER_CATEGORIES[m.category] || MARKER_CATEGORIES.general;
                        return `
                        <div class="marker-row" data-id="${m.id}">
                            <span class="cat-dot" style="background:${cfg.color}"></span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium truncate">${escapeHtml(m.name)}</p>
                                <p class="text-xs text-gray-400">${cfg.label}</p>
                            </div>
                            <button class="icon-sm marker-focus" data-id="${m.id}" title="Zoom to marker">
                                <i data-lucide="crosshair"></i>
                            </button>
                            <button class="icon-sm marker-del" data-id="${m.id}" title="Delete marker">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>`;
                    })
                    .join("")}
            </div>`;

    openPanel(
        "Markers",
        `
        <div>
            <label class="text-xs text-gray-500">Category for new marker</label>
            <select id="markerCategorySelect" class="base-item mt-1">${categoryOptions}</select>
            <button id="addMarkerBtn" class="add-marker-btn mt-2">
                <i data-lucide="plus"></i>
                <span>Add Marker (click map)</span>
            </button>
            ${list}
        </div>
        `
    );

    document.getElementById("markerCategorySelect").addEventListener("change", (e) => {
        setSelectedCategory(e.target.value);
    });

    document.getElementById("addMarkerBtn").addEventListener("click", () => {
        armMarkerAdd();
        closePanel(); // get the panel out of the way while the user clicks the map
    });

    document.querySelectorAll(".marker-focus").forEach((btn) => {
        btn.addEventListener("click", () => {
            const found = markers.find((m) => m.id === btn.dataset.id);
            if (found) focusMarker(found.marker);
        });
    });

    document.querySelectorAll(".marker-del").forEach((btn) => {
        btn.addEventListener("click", () => {
            const found = markers.find((m) => m.id === btn.dataset.id);
            if (found && confirm("Delete this marker?")) deleteMarker(found.marker);
        });
    });

    refreshIcons();
}
