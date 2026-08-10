import { getMarkers } from "./markertools.js";
import { getMeasurements } from "./measuretools.js";
import { formatLength, formatArea } from "../utils/units.js";
import { getUnitSystem } from "../core/settingsStore.js";

function shapeTypeLabel(layer) {
    if (layer instanceof L.Circle) return "Circle";
    if (layer instanceof L.Rectangle) return "Rectangle";
    if (layer instanceof L.Polygon) return "Polygon";
    if (layer instanceof L.Polyline) return "Polyline";
    if (layer instanceof L.Marker) return "Marker";
    return "Shape";
}

function drawFeatureRows(entry) {
    const unitSystem = getUnitSystem();
    const rows = [];

    entry.leafletLayer.eachLayer((sub) => {
        const properties = { Type: shapeTypeLabel(sub) };

        try {
            const gj = sub.toGeoJSON();
            if (gj.geometry.type === "Polygon") {
                properties.Area = formatArea(turf.area(gj), unitSystem);
            } else if (gj.geometry.type === "LineString") {
                properties.Length = formatLength(turf.length(gj, { units: "meters" }), unitSystem);
            }
        } catch (e) {
            /* some drawn shapes (e.g. circles) don't convert cleanly - skip extra stats */
        }

        rows.push({ featureId: String(L.Util.stamp(sub)), properties, subLayer: sub });
    });

    return rows;
}

function markerFeatureRows() {
    return getMarkers().map((m) => ({
        featureId: m.id,
        properties: { Name: m.name, Category: m.category, Description: m.description || "" },
        subLayer: m.marker
    }));
}

function measurementFeatureRows() {
    const unitSystem = getUnitSystem();
    return getMeasurements().map((m) => ({
        featureId: m.id,
        properties: {
            Type: m.type === "distance" ? "Distance" : "Area",
            Value: m.type === "distance" ? formatLength(m.valueMeters, unitSystem) : formatArea(m.valueMeters, unitSystem),
            ...(m.perimeterMeters != null ? { Perimeter: formatLength(m.perimeterMeters, unitSystem) } : {})
        },
        subLayer: m.layer
    }));
}

function importFeatureRows(entry) {
    const rows = [];

    entry.leafletLayer.eachLayer((sub) => {
        const properties = { ...(sub.feature?.properties || {}) };
        delete properties.__gvId;
        const featureId = sub.feature?.properties?.__gvId ?? String(L.Util.stamp(sub));
        rows.push({ featureId, properties, subLayer: sub });
    });

    return rows;
}

/**
 * Returns [{ featureId, properties, subLayer }] for any registered layer,
 * regardless of which tool created it (draw, marker, measure, import).
 */
export function getFeatureRows(entry) {
    if (!entry) return [];

    switch (entry.type) {
        case "draw":
            return drawFeatureRows(entry);
        case "marker":
            return markerFeatureRows();
        case "measurement":
            return measurementFeatureRows();
        case "import":
            return importFeatureRows(entry);
        default:
            return [];
    }
}

export function findSubLayerByFeatureId(entry, featureId) {
    const row = getFeatureRows(entry).find((r) => String(r.featureId) === String(featureId));
    return row ? row.subLayer : null;
}

/** Pans/zooms to a feature and briefly flashes it so the selection is visible. */
export function focusFeatureLayer(map, subLayer) {
    if (!subLayer) return;

    if (typeof subLayer.getBounds === "function") {
        const bounds = subLayer.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 17 });
        }
    } else if (typeof subLayer.getLatLng === "function") {
        map.flyTo(subLayer.getLatLng(), Math.max(map.getZoom(), 15));
    }

    flashHighlight(subLayer);
}

function flashHighlight(subLayer) {
    if (typeof subLayer.setStyle === "function") {
        const original = { ...subLayer.options };
        subLayer.setStyle({ color: "#f59e0b", weight: (original.weight || 3) + 2 });
        setTimeout(() => {
            subLayer.setStyle({
                color: original.color,
                weight: original.weight,
                fillColor: original.fillColor,
                fillOpacity: original.fillOpacity
            });
        }, 1200);
        return;
    }

    if (typeof subLayer.getElement === "function") {
        const el = subLayer.getElement();
        if (el) {
            el.classList.add("gv-highlight-bounce");
            setTimeout(() => el.classList.remove("gv-highlight-bounce"), 1200);
        }
    }
}
