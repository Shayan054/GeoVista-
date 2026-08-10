import { generateId } from "./id.js";
import { escapeHtml } from "./dom.js";

const LAT_NAMES = ["lat", "latitude", "y"];
const LON_NAMES = ["lon", "lng", "long", "longitude", "x"];

function getFeatures(geojson) {
    return geojson.type === "FeatureCollection" ? geojson.features : [geojson];
}

/**
 * Gives every feature a stable internal id (used to link map clicks to
 * Attributes-panel rows, and to find a feature's sub-layer later).
 */
export function annotateFeatureIds(geojson) {
    getFeatures(geojson).forEach((f) => {
        f.properties = f.properties || {};
        if (!f.properties.__gvId) f.properties.__gvId = generateId("feat");
    });
    return geojson;
}

export function detectGeometryType(geojson) {
    const types = new Set(getFeatures(geojson).map((f) => f.geometry?.type).filter(Boolean));
    if (types.size === 0) return "Unknown";
    if (types.size > 1) return "Mixed";

    const t = [...types][0];
    if (t.includes("Point")) return "Point";
    if (t.includes("LineString")) return "LineString";
    if (t.includes("Polygon")) return "Polygon";
    return t;
}

export function collectAttributeFields(geojson) {
    const fields = new Set();
    getFeatures(geojson).forEach((f) => {
        Object.keys(f.properties || {}).forEach((k) => {
            if (k !== "__gvId") fields.add(k);
        });
    });
    return [...fields];
}

/** Guesses which CSV headers hold latitude/longitude. */
export function detectLatLonColumns(headers) {
    const norm = (h) => h.trim().toLowerCase();
    const lat = headers.find((h) => LAT_NAMES.includes(norm(h)));
    const lon = headers.find((h) => LON_NAMES.includes(norm(h)));
    return { lat, lon };
}

/** Converts parsed CSV rows (array of objects) into a Point FeatureCollection. */
export function csvRowsToGeoJSON(rows, latCol, lonCol) {
    const features = [];
    for (const row of rows) {
        const lat = parseFloat(row[latCol]);
        const lon = parseFloat(row[lonCol]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lon, lat] },
            properties: { ...row }
        });
    }
    return { type: "FeatureCollection", features };
}

function buildFeaturePopupHtml(props) {
    const entries = Object.entries(props).filter(([k]) => k !== "__gvId");
    if (entries.length === 0) return `<p class="text-sm text-gray-500">No attributes</p>`;

    const rows = entries
        .slice(0, 10)
        .map(
            ([k, v]) =>
                `<div class="feat-popup-row"><span class="feat-popup-key">${escapeHtml(k)}</span><span class="feat-popup-val">${escapeHtml(String(v))}</span></div>`
        )
        .join("");

    return `<div class="feat-popup">${rows}</div>`;
}

/**
 * Builds a Leaflet GeoJSON layer styled to match the default layerRegistry
 * style, with popups and a "geovista:feature-selected" click dispatch so
 * this layer is wired for the Attributes panel from the moment it's created.
 * `layerIdRef` is a mutable { current } set once the registry id is known
 * (registerLayer needs the leaflet layer to exist first).
 */
export function buildLeafletLayer(geojson, layerIdRef) {
    return L.geoJSON(geojson, {
        style: () => ({ color: "#4f46e5", weight: 3, fillColor: "#6366f1", fillOpacity: 0.3 }),
        pointToLayer: (feature, latlng) =>
            L.circleMarker(latlng, {
                radius: 6,
                color: "#4f46e5",
                weight: 2,
                fillColor: "#6366f1",
                fillOpacity: 0.8
            }),
        onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(() => buildFeaturePopupHtml(props));
            layer.on("click", () => {
                document.dispatchEvent(
                    new CustomEvent("geovista:feature-selected", {
                        detail: { layerId: layerIdRef.current, featureId: props.__gvId }
                    })
                );
            });
        }
    });
}

/** Finds the Leaflet sub-layer for a given feature id inside a GeoJSON layer group. */
export function findSubLayerByFeatureId(leafletLayer, featureId) {
    let found = null;
    if (typeof leafletLayer.eachLayer !== "function") return null;

    leafletLayer.eachLayer((sub) => {
        if (found) return;
        if (sub.feature?.properties?.__gvId === featureId) found = sub;
    });
    return found;
}
