import { getActiveLayerId, getLayer, onLayersChange } from "../core/layerRegistry.js";
import { getCoordinateFormat } from "../core/settingsStore.js";
import { formatCoordinate } from "../utils/units.js";

export function initMapStatusBar(map) {
    const coordsEl = document.getElementById("sbCoords");
    const zoomEl = document.getElementById("sbZoom");
    const scaleEl = document.getElementById("sbScale");
    const layerEl = document.getElementById("sbLayer");

    function updateScale() {
        if (!scaleEl) return;
        const zoom = map.getZoom();
        const lat = map.getCenter().lat;
        const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
        const denominator = Math.round(metersPerPixel / 0.00028); // OGC standard pixel size (0.28mm)
        scaleEl.textContent = `Scale: 1:${denominator.toLocaleString()}`;
    }

    function updateZoom() {
        if (zoomEl) zoomEl.textContent = `Zoom: ${map.getZoom()}`;
        updateScale();
    }

    function updateLayer() {
        if (!layerEl) return;
        const entry = getLayer(getActiveLayerId());
        layerEl.textContent = `Layer: ${entry ? entry.name : "—"}`;
    }

    map.on("mousemove", (e) => {
        if (coordsEl) coordsEl.textContent = `Coords: ${formatCoordinate(e.latlng.lat, e.latlng.lng, getCoordinateFormat())}`;
    });
    map.on("zoomend", updateZoom);
    map.on("moveend", updateScale);
    onLayersChange(updateLayer);

    updateZoom();
    updateLayer();
}
