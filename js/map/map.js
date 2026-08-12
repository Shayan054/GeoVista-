import { baseMaps } from "./basemap.js";

export function createMap() {

    const map = L.map("map", {
        zoomControl: false
    }).setView([39.8283, -98.5795], 5);
    const drawnItems = new L.FeatureGroup();

    map.addLayer(drawnItems);

    baseMaps.OpenStreetMap.addTo(map);

    return {
        map,
        baseMaps,
        drawnItems
    };
}