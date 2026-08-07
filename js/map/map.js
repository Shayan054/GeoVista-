import { baseMaps } from "./basemap.js";

export function createMap() {

    const map = L.map("map", {
        zoomControl: false
    }).setView([39.8283, -98.5795], 5);
    const drawnItems = new L.FeatureGroup();

    map.addLayer(drawnItems);

    baseMaps.OpenStreetMap.addTo(map);

    function switchBasemap(name) {

        Object.values(baseMaps).forEach(layer => {

            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }

        });

        baseMaps[name].addTo(map);
    }

    return {
        map,
        baseMaps,
        switchBasemap,
        drawnItems
    };
}