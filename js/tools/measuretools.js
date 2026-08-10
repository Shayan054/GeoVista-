import { registerLayer } from "../core/layerRegistry.js";
import { registerTool, activateTool, deactivateAll } from "../core/toolManager.js";
import { generateId } from "../utils/id.js";
import { formatLength, formatArea } from "../utils/units.js";
import { getUnitSystem } from "../core/settingsStore.js";
import { escapeHtml } from "../utils/dom.js";

let map = null;
let measureLayer = null; // FeatureGroup holding finished measurements
let measureLayerId = null;
const measurementData = new Map(); // leafletLayer -> { id, type, valueMeters, perimeterMeters }
const listeners = [];

// --- live drawing state (while a distance/area measurement is in progress)
let activeMode = null; // "distance" | "area" | null
let activePoints = [];
let liveLayer = null;
let previewLine = null;
let vertexMarkers = [];

export function initMeasureTool(leafletMap) {
    if (measureLayer) return; // already initialized

    map = leafletMap;
    measureLayer = L.featureGroup().addTo(map);

    const entry = registerLayer({
        name: "Measurements",
        type: "measurement",
        leafletLayer: measureLayer,
        map,
        geometryType: "Mixed",
        sourceFormat: "Measure",
        editableStyle: false,
        removable: false
    });
    measureLayerId = entry.id;

    registerTool("measure", () => {
        cancelActiveMeasurement();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && activeMode) cancelActiveMeasurement();
    });
}

export function armDistanceMeasure() {
    startMeasuring("distance");
}

export function armAreaMeasure() {
    startMeasuring("area");
}

function startMeasuring(mode) {
    cancelActiveMeasurement();
    activateTool("measure");

    activeMode = mode;
    activePoints = [];
    map.getContainer().classList.add("crosshair-cursor");
    map.doubleClickZoom.disable();
    map.on("click", handleMapClick);
    map.on("mousemove", handleMouseMove);
    notify();
}

function handleMapClick(e) {
    activePoints.push(e.latlng);
    rebuildLiveLayer();
    addVertexMarker(e.latlng);
    notify();
}

function handleMouseMove(e) {
    if (!activeMode || activePoints.length === 0) return;
    drawPreview([...activePoints, e.latlng]);
}

function drawPreview(pts) {
    if (previewLine) map.removeLayer(previewLine);
    previewLine = L.polyline(pts, { color: "#f59e0b", weight: 2, dashArray: "6,6" }).addTo(map);
}

function rebuildLiveLayer() {
    if (liveLayer) map.removeLayer(liveLayer);
    if (activePoints.length < 2) return;

    liveLayer = activeMode === "distance"
        ? L.polyline(activePoints, { color: "#4f46e5", weight: 3 }).addTo(map)
        : L.polygon(activePoints, { color: "#4f46e5", weight: 3, fillOpacity: 0.2 }).addTo(map);
}

function addVertexMarker(latlng) {
    const m = L.circleMarker(latlng, {
        radius: 5,
        color: "#4f46e5",
        weight: 2,
        fillColor: "#fff",
        fillOpacity: 1
    }).addTo(map);
    vertexMarkers.push(m);
}

function pointsToLngLat(points) {
    return points.map((p) => [p.lng, p.lat]);
}

function computeLiveValueMeters() {
    if (activePoints.length < 2) return 0;
    const coords = pointsToLngLat(activePoints);

    if (activeMode === "distance") {
        return turf.length(turf.lineString(coords), { units: "meters" });
    }

    if (activePoints.length < 3) return 0;
    const ring = [...coords, coords[0]];
    return turf.area(turf.polygon([ring]));
}

/**
 * Current in-progress measurement state, used by the Measure panel to
 * render the live "Finish/Cancel" view with a running total.
 */
export function getMeasureState() {
    return {
        active: !!activeMode,
        mode: activeMode,
        pointCount: activePoints.length,
        minPoints: activeMode === "area" ? 3 : 2,
        liveValueMeters: computeLiveValueMeters()
    };
}

export function finishMeasurement() {
    if (!activeMode) return;

    const minPoints = activeMode === "area" ? 3 : 2;
    if (activePoints.length < minPoints) {
        cancelActiveMeasurement();
        return;
    }

    const latlngs = [...activePoints];
    const coords = pointsToLngLat(latlngs);

    let finalLayer;
    let valueMeters;
    let perimeterMeters = null;

    if (activeMode === "distance") {
        valueMeters = turf.length(turf.lineString(coords), { units: "meters" });
        finalLayer = L.polyline(latlngs, { color: "#4f46e5", weight: 3 });
    } else {
        const ring = [...coords, coords[0]];
        valueMeters = turf.area(turf.polygon([ring]));
        perimeterMeters = turf.length(turf.lineString(ring), { units: "meters" });
        finalLayer = L.polygon(latlngs, { color: "#4f46e5", weight: 3, fillOpacity: 0.25 });
    }

    const id = generateId("measure");
    const record = { id, type: activeMode, valueMeters, perimeterMeters };
    measurementData.set(finalLayer, record);

    // Leaflet's toGeoJSON() only includes properties if `layer.feature` is
    // set - needed so Export (GeoJSON/CSV) carries the measurement's value.
    finalLayer.feature = {
        type: "Feature",
        properties: { type: record.type, valueMeters: record.valueMeters, perimeterMeters: record.perimeterMeters }
    };

    finalLayer.bindPopup(() => buildPopupContent(finalLayer));
    finalLayer.on("popupopen", () => bindPopupEvents(finalLayer));
    finalLayer.on("click", () => {
        document.dispatchEvent(
            new CustomEvent("geovista:feature-selected", {
                detail: { layerId: measureLayerId, featureId: id }
            })
        );
    });

    measureLayer.addLayer(finalLayer);
    clearActiveDrawing();
    activeMode = null;
    map.getContainer().classList.remove("crosshair-cursor");
    map.doubleClickZoom.enable();
    map.off("click", handleMapClick);
    map.off("mousemove", handleMouseMove);
    deactivateAll();
    notify();
}

export function cancelActiveMeasurement() {
    clearActiveDrawing();
    if (!activeMode) return;

    activeMode = null;
    map.getContainer().classList.remove("crosshair-cursor");
    map.doubleClickZoom.enable();
    map.off("click", handleMapClick);
    map.off("mousemove", handleMouseMove);
    notify();
}

function clearActiveDrawing() {
    activePoints = [];
    if (liveLayer) {
        map.removeLayer(liveLayer);
        liveLayer = null;
    }
    if (previewLine) {
        map.removeLayer(previewLine);
        previewLine = null;
    }
    vertexMarkers.forEach((m) => map.removeLayer(m));
    vertexMarkers = [];
}

function buildPopupContent(layer) {
    const record = measurementData.get(layer);
    const unitSystem = getUnitSystem();
    const valueText = record.type === "distance"
        ? formatLength(record.valueMeters, unitSystem)
        : formatArea(record.valueMeters, unitSystem);

    const perimeterRow = record.perimeterMeters != null
        ? `<p class="text-xs text-gray-500">Perimeter: ${escapeHtml(formatLength(record.perimeterMeters, unitSystem))}</p>`
        : "";

    return `
    <div class="marker-popup">
        <p class="text-sm font-semibold">${record.type === "distance" ? "Distance" : "Area"}: ${escapeHtml(valueText)}</p>
        ${perimeterRow}
        <div class="mp-actions">
            <button class="mp-delete measure-popup-delete">Delete</button>
        </div>
    </div>
    `;
}

function bindPopupEvents(layer) {
    const popupEl = layer.getPopup().getElement();
    if (!popupEl) return;

    popupEl.querySelector(".measure-popup-delete").addEventListener("click", () => {
        deleteMeasurement(layer);
    });
}

export function getMeasurements() {
    return measureLayer.getLayers().map((layer) => ({
        layer,
        ...measurementData.get(layer)
    }));
}

export function deleteMeasurement(layer) {
    measureLayer.removeLayer(layer);
    measurementData.delete(layer);
    notify();
}

export function focusMeasurement(layer) {
    const bounds = typeof layer.getBounds === "function" ? layer.getBounds() : null;
    if (bounds && bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
    layer.openPopup();
}

export function onMeasurementsChange(cb) {
    listeners.push(cb);
}

function notify() {
    listeners.forEach((cb) => cb());
}

export function getMeasureLayerId() {
    return measureLayerId;
}
