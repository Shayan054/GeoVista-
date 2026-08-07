import { generateId } from "../utils/id.js";

/**
 * layerRegistry is the single source of truth for every layer living on the
 * GeoVista map (drawn shapes, markers, imported GeoJSON/CSV/KML, etc).
 * The Layers panel, Attributes panel, Spatial Data panel and sidebar stats
 * all read from here instead of keeping their own copies of state.
 */

const layers = [];
const listeners = [];

/**
 * Subscribe to registry changes (layer added/removed/renamed/visibility).
 * Returns an unsubscribe function.
 */
export function onLayersChange(cb) {
    listeners.push(cb);
    return () => {
        const idx = listeners.indexOf(cb);
        if (idx > -1) listeners.splice(idx, 1);
    };
}

function emit() {
    listeners.forEach((cb) => cb(layers));
}

/**
 * Force listeners to re-run (e.g. after Leaflet.draw edits/deletes features
 * inside a FeatureGroup we already registered, so feature counts change
 * without the registry itself being touched).
 */
export function refresh() {
    emit();
}

/**
 * Register a Leaflet layer with the app so it shows up in Layers/Attributes/
 * Spatial Data panels.
 *
 * @param {Object} options
 * @param {string} options.name
 * @param {string} options.type - e.g. "draw" | "marker" | "import"
 * @param {L.Layer} options.leafletLayer - must already be added to the map
 * @param {L.Map} options.map
 * @param {string} [options.geometryType] - "Point" | "LineString" | "Polygon" | "Mixed"
 * @param {string} [options.sourceFormat] - "Draw" | "Marker" | "GeoJSON" | "CSV" | "KML" | "Shapefile"
 * @param {string} [options.crs]
 * @param {boolean} [options.editableStyle] - whether Layers panel shows color/opacity controls
 * @param {boolean} [options.removable] - whether Layers panel allows deleting it
 * @param {string[]} [options.attributes] - known attribute field names
 */
export function registerLayer(options) {
    const entry = {
        id: generateId("layer"),
        name: options.name || "Untitled layer",
        type: options.type || "generic",
        leafletLayer: options.leafletLayer,
        map: options.map,
        geometryType: options.geometryType || "Mixed",
        sourceFormat: options.sourceFormat || "Unknown",
        crs: options.crs || "EPSG:4326",
        visible: true,
        opacity: options.opacity ?? 1,
        style: {
            color: options.style?.color || "#4f46e5",
            weight: options.style?.weight ?? 3,
            fillColor: options.style?.fillColor || options.style?.color || "#6366f1",
            fillOpacity: options.style?.fillOpacity ?? 0.3
        },
        editableStyle: options.editableStyle ?? true,
        removable: options.removable ?? true,
        attributes: options.attributes || [],
        createdAt: Date.now()
    };

    layers.push(entry);
    emit();
    return entry;
}

export function unregisterLayer(id) {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1) return;

    const entry = layers[idx];
    if (entry.map && entry.map.hasLayer(entry.leafletLayer)) {
        entry.map.removeLayer(entry.leafletLayer);
    }

    layers.splice(idx, 1);
    emit();
}

export function getLayer(id) {
    return layers.find((l) => l.id === id);
}

export function getAllLayers() {
    return layers;
}

export function setVisibility(id, visible) {
    const entry = getLayer(id);
    if (!entry) return;

    entry.visible = visible;

    if (visible) {
        if (!entry.map.hasLayer(entry.leafletLayer)) entry.map.addLayer(entry.leafletLayer);
    } else if (entry.map.hasLayer(entry.leafletLayer)) {
        entry.map.removeLayer(entry.leafletLayer);
    }

    emit();
}

export function renameLayer(id, name) {
    const entry = getLayer(id);
    if (!entry) return;
    entry.name = name || entry.name;
    emit();
}

/**
 * Opacity/style updates are intentionally "quiet" (no emit()) so dragging a
 * slider doesn't trigger a full panel re-render mid-drag.
 */
export function setOpacity(id, opacity) {
    const entry = getLayer(id);
    if (!entry) return;

    entry.opacity = opacity;
    applyOpacity(entry.leafletLayer, opacity, entry.style);
}

export function setStyle(id, styleProps) {
    const entry = getLayer(id);
    if (!entry) return;

    entry.style = { ...entry.style, ...styleProps };
    applyStyle(entry.leafletLayer, entry.style, entry.opacity);
}

export function zoomToLayer(id, map) {
    const entry = getLayer(id);
    if (!entry) return;

    const bounds = getLayerBounds(entry.leafletLayer);
    if (bounds && bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
}

export function getLayerBounds(leafletLayer) {
    try {
        if (typeof leafletLayer.getBounds === "function") {
            const b = leafletLayer.getBounds();
            if (b && b.isValid && b.isValid()) return b;
        }
    } catch (e) {
        /* layer may be empty */
    }
    return null;
}

export function getFeatureCount(id) {
    const entry = getLayer(id);
    if (!entry) return 0;
    return countFeatures(entry.leafletLayer);
}

function countFeatures(leafletLayer) {
    if (typeof leafletLayer.getLayers === "function") {
        return leafletLayer.getLayers().length;
    }
    return 1;
}

function applyOpacity(leafletLayer, opacity, style) {
    if (typeof leafletLayer.eachLayer === "function") {
        leafletLayer.eachLayer((sub) => applyOpacity(sub, opacity, style));
        return;
    }

    if (leafletLayer instanceof L.Marker) {
        leafletLayer.setOpacity(opacity);
    } else if (typeof leafletLayer.setStyle === "function") {
        leafletLayer.setStyle({
            opacity,
            fillOpacity: (style?.fillOpacity ?? 0.3) * opacity
        });
    }
}

function applyStyle(leafletLayer, style, opacity) {
    if (typeof leafletLayer.eachLayer === "function") {
        leafletLayer.eachLayer((sub) => applyStyle(sub, style, opacity));
        return;
    }

    if (typeof leafletLayer.setStyle === "function") {
        leafletLayer.setStyle({
            color: style.color,
            weight: style.weight,
            fillColor: style.fillColor,
            fillOpacity: style.fillOpacity * (opacity ?? 1)
        });
    }
}
