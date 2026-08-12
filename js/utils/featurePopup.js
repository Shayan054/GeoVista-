import { escapeHtml } from "./dom.js";
import { formatLength, formatArea } from "./units.js";
import { getUnitSystem } from "../core/settingsStore.js";

function shapeTypeLabel(layer) {
    if (layer instanceof L.Circle) return "Circle";
    if (layer instanceof L.Rectangle) return "Rectangle";
    if (layer instanceof L.Polygon) return "Polygon";
    if (layer instanceof L.Polyline) return "Polyline";
    if (layer instanceof L.Marker) return "Marker";
    return "Shape";
}

export function getDrawFeatureProperties(layer) {
    const properties = { Type: shapeTypeLabel(layer) };

    try {
        const gj = layer.toGeoJSON();
        if (gj.geometry.type === "Polygon") {
            properties.Area = formatArea(turf.area(gj), getUnitSystem());
        } else if (gj.geometry.type === "LineString") {
            properties.Length = formatLength(turf.length(gj, { units: "meters" }), getUnitSystem());
        }
    } catch (e) {
        /* circles and some shapes may not convert cleanly */
    }

    return properties;
}

export function buildFeaturePopupHtml(properties) {
    const entries = Object.entries(properties || {}).filter(([k]) => k !== "__gvId");
    if (entries.length === 0) {
        return `<p class="text-sm text-gray-500">No attributes</p>`;
    }

    const rows = entries
        .map(
            ([k, v]) =>
                `<div class="feat-popup-row"><span class="feat-popup-key">${escapeHtml(k)}</span><span class="feat-popup-val">${escapeHtml(String(v ?? ""))}</span></div>`
        )
        .join("");

    return `<div class="feat-popup">${rows}</div>`;
}

/** Binds an info popup and feature-selected dispatch for a drawn shape. */
export function bindDrawFeatureLayer(layer, layerId) {
    layer.bindPopup(() => buildFeaturePopupHtml(getDrawFeatureProperties(layer)));
    layer.on("click", () => {
        layer.openPopup();
        document.dispatchEvent(
            new CustomEvent("geovista:feature-selected", {
                detail: { layerId, featureId: String(L.Util.stamp(layer)) }
            })
        );
    });
}
