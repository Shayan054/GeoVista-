import { onLayersChange, getAllLayers } from "../core/layerRegistry.js";

export function initStatsBar(map) {
    const layerCountEl = document.getElementById("layerCount");
    const zoomEl = document.getElementById("zoomLevel");

    function updateLayerCount() {
        if (layerCountEl) layerCountEl.textContent = getAllLayers().length;
    }

    function updateZoom() {
        if (zoomEl) zoomEl.textContent = map.getZoom();
    }

    onLayersChange(updateLayerCount);
    map.on("zoomend", updateZoom);

    updateLayerCount();
    updateZoom();
}
