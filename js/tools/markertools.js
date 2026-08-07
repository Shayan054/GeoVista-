import { registerLayer } from "../core/layerRegistry.js";
import { registerTool, activateTool, deactivateAll } from "../core/toolManager.js";
import { generateId } from "../utils/id.js";
import { escapeHtml, refreshIcons } from "../utils/dom.js";

export const MARKER_CATEGORIES = {
    general: { label: "General", icon: "map-pin", color: "#4f46e5" },
    poi: { label: "Point of Interest", icon: "star", color: "#f59e0b" },
    warning: { label: "Warning", icon: "triangle-alert", color: "#ef4444" },
    home: { label: "Home", icon: "home", color: "#10b981" },
    business: { label: "Business", icon: "briefcase", color: "#0ea5e9" }
};

let map = null;
let markersLayer = null;
let markerLayerId = null;
let selectedCategory = "general";
const markerData = new Map(); // L.Marker -> { id, name, category, description }
const listeners = [];

export function initMarkerTool(leafletMap) {
    if (markersLayer) return { markersLayer }; // already initialized

    map = leafletMap;
    markersLayer = L.featureGroup().addTo(map);

    const entry = registerLayer({
        name: "Markers",
        type: "marker",
        leafletLayer: markersLayer,
        map,
        geometryType: "Point",
        sourceFormat: "Marker",
        editableStyle: false,
        removable: false
    });
    markerLayerId = entry.id;

    registerTool("marker-add", () => {
        map.getContainer().classList.remove("crosshair-cursor");
        map.off("click", handleMapClick);
    });

    return { markersLayer };
}

export function setSelectedCategory(category) {
    selectedCategory = category;
}

export function getSelectedCategory() {
    return selectedCategory;
}

export function armMarkerAdd() {
    activateTool("marker-add");
    map.getContainer().classList.add("crosshair-cursor");
    map.once("click", handleMapClick);
}

function handleMapClick(e) {
    createMarker(e.latlng, { name: "New Marker", category: selectedCategory, description: "" }, true);
    deactivateAll();
}

function makeIcon(category) {
    const cfg = MARKER_CATEGORIES[category] || MARKER_CATEGORIES.general;
    return L.divIcon({
        className: "geovista-marker-icon",
        html: `<div class="marker-pin" style="background:${cfg.color}"><i data-lucide="${cfg.icon}"></i></div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 38],
        popupAnchor: [0, -34]
    });
}

export function createMarker(latlng, data, openPopupForEdit = false) {
    const id = generateId("marker");
    const marker = L.marker(latlng, {
        icon: makeIcon(data.category),
        draggable: true
    });

    markerData.set(marker, {
        id,
        name: data.name || "Untitled marker",
        category: data.category || "general",
        description: data.description || ""
    });

    marker.bindPopup(() => buildPopupContent(marker));
    marker.on("popupopen", () => bindPopupEvents(marker));
    marker.on("dragend", notify);

    markersLayer.addLayer(marker);
    refreshIcons();
    notify();

    if (openPopupForEdit) marker.openPopup();

    return marker;
}

function buildPopupContent(marker) {
    const record = markerData.get(marker);
    const options = Object.entries(MARKER_CATEGORIES)
        .map(
            ([key, cfg]) =>
                `<option value="${key}" ${record.category === key ? "selected" : ""}>${cfg.label}</option>`
        )
        .join("");

    return `
    <div class="marker-popup">
        <input class="mp-name" type="text" value="${escapeHtml(record.name)}" placeholder="Marker name" />
        <select class="mp-category">${options}</select>
        <textarea class="mp-desc" placeholder="Description">${escapeHtml(record.description)}</textarea>
        <div class="mp-actions">
            <button class="mp-save">Save</button>
            <button class="mp-delete">Delete</button>
        </div>
    </div>
    `;
}

function bindPopupEvents(marker) {
    const popupEl = marker.getPopup().getElement();
    if (!popupEl) return;

    popupEl.querySelector(".mp-save").addEventListener("click", () => {
        const record = markerData.get(marker);
        record.name = popupEl.querySelector(".mp-name").value.trim() || "Untitled marker";
        record.category = popupEl.querySelector(".mp-category").value;
        record.description = popupEl.querySelector(".mp-desc").value;

        marker.setIcon(makeIcon(record.category));
        refreshIcons();
        marker.closePopup();
        notify();
    });

    popupEl.querySelector(".mp-delete").addEventListener("click", () => {
        deleteMarker(marker);
    });
}

export function deleteMarker(marker) {
    markersLayer.removeLayer(marker);
    markerData.delete(marker);
    notify();
}

export function getMarkers() {
    return markersLayer.getLayers().map((marker) => ({
        marker,
        ...markerData.get(marker)
    }));
}

export function focusMarker(marker) {
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15));
    marker.openPopup();
}

export function onMarkersChange(cb) {
    listeners.push(cb);
}

function notify() {
    listeners.forEach((cb) => cb());
}

export function getMarkerLayerId() {
    return markerLayerId;
}
