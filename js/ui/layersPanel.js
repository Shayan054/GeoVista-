import {
    getAllLayers,
    onLayersChange,
    setVisibility,
    unregisterLayer,
    renameLayer,
    setOpacity,
    setStyle,
    zoomToLayer,
    getFeatureCount
} from "../core/layerRegistry.js";
import { openPanel } from "./panel.js";
import { escapeHtml, refreshIcons } from "../utils/dom.js";
import { isPanelOpenFor } from "./panelState.js";

let currentMap = null;

export function initLayersPanel(map) {
    currentMap = map;

    onLayersChange(() => {
        // Keep the panel live if it's currently showing Layers.
        if (isPanelOpenFor("Layers")) {
            renderLayersPanel();
        }
    });
}

export function renderLayersPanel() {
    const layers = getAllLayers();

    if (layers.length === 0) {
        openPanel(
            "Layers",
            `<p class="text-gray-500 text-sm">No layers loaded yet. Draw a shape, add a marker, or import data to see it here.</p>`
        );
        return;
    }

    const rows = layers
        .map((layer) => {
            const count = getFeatureCount(layer.id);
            return `
            <div class="layer-row" data-id="${layer.id}">
                <div class="flex items-center gap-2">
                    <button class="vis-toggle" data-id="${layer.id}" title="Toggle visibility">
                        <i data-lucide="${layer.visible ? "eye" : "eye-off"}"></i>
                    </button>

                    <div class="flex-1 min-w-0">
                        <input
                            class="layer-name-input"
                            data-id="${layer.id}"
                            value="${escapeHtml(layer.name)}"
                        />
                        <p class="text-xs text-gray-400 truncate">
                            ${escapeHtml(layer.sourceFormat)} &middot; ${escapeHtml(layer.geometryType)} &middot; ${count} feature${count === 1 ? "" : "s"}
                        </p>
                    </div>

                    <button class="icon-sm zoom-layer" data-id="${layer.id}" title="Zoom to layer">
                        <i data-lucide="scan"></i>
                    </button>

                    ${layer.removable
                        ? `<button class="icon-sm remove-layer" data-id="${layer.id}" title="Remove layer">
                            <i data-lucide="trash-2"></i>
                        </button>`
                        : ""}
                </div>

                <div class="mt-2 flex items-center gap-2">
                    <span class="text-xs text-gray-400 w-14 shrink-0">Opacity</span>
                    <input
                        type="range" min="0" max="1" step="0.05"
                        value="${layer.opacity}"
                        class="opacity-slider flex-1"
                        data-id="${layer.id}"
                    />
                </div>

                ${layer.editableStyle
                    ? `<div class="mt-2 flex items-center gap-2">
                        <span class="text-xs text-gray-400 w-14 shrink-0">Color</span>
                        <input type="color" value="${layer.style.color}" class="style-color" data-id="${layer.id}" />
                    </div>`
                    : ""}
            </div>
            `;
        })
        .join("");

    openPanel("Layers", `<div class="space-y-3">${rows}</div>`);
    bindLayerPanelEvents();
    refreshIcons();
}

function bindLayerPanelEvents() {
    document.querySelectorAll(".vis-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const layer = getAllLayers().find((l) => l.id === id);
            if (layer) setVisibility(id, !layer.visible);
        });
    });

    document.querySelectorAll(".remove-layer").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (confirm("Remove this layer? This cannot be undone.")) {
                unregisterLayer(btn.dataset.id);
            }
        });
    });

    document.querySelectorAll(".zoom-layer").forEach((btn) => {
        btn.addEventListener("click", () => {
            zoomToLayer(btn.dataset.id, currentMap);
        });
    });

    document.querySelectorAll(".layer-name-input").forEach((input) => {
        input.addEventListener("change", () => {
            renameLayer(input.dataset.id, input.value.trim());
        });
    });

    document.querySelectorAll(".opacity-slider").forEach((slider) => {
        slider.addEventListener("input", () => {
            setOpacity(slider.dataset.id, parseFloat(slider.value));
        });
    });

    document.querySelectorAll(".style-color").forEach((input) => {
        input.addEventListener("input", () => {
            setStyle(input.dataset.id, { color: input.value, fillColor: input.value });
        });
    });
}
