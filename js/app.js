import { createMap } from "./map/map.js";
import { openPanel, closePanel } from "./ui/panel.js";
import { initializeDrawTool } from "./tools/drawtools.js";
import { registerLayer, refresh as refreshLayers } from "./core/layerRegistry.js";
import { registerTool, activateTool } from "./core/toolManager.js";
import { initLayersPanel, renderLayersPanel } from "./ui/layersPanel.js";
import { initMarkersPanel, renderMarkersPanel } from "./ui/markersPanel.js";
import { initStatsBar } from "./ui/statsbar.js";

const { map, baseMaps, switchBasemap, drawnItems } = createMap();

const drawControl = initializeDrawTool(map, drawnItems);

// --- Register the built-in "Drawn Features" layer with the layer registry
// so it shows up in the Layers panel, Attributes panel, sidebar count, etc.
registerLayer({
    name: "Drawn Features",
    type: "draw",
    leafletLayer: drawnItems,
    map,
    geometryType: "Mixed",
    sourceFormat: "Draw",
    editableStyle: false,
    removable: false
});

// --- Feature panels
initLayersPanel(map);
initMarkersPanel(map);
initStatsBar(map);

document
    .getElementById("closePanel")
    .addEventListener("click", closePanel);

document
    .getElementById("basemapBtn")
    .addEventListener("click", () => {

        openPanel(
            "Basemaps",
            `
            <button class="base-item" data-map="OpenStreetMap">OpenStreetMap</button>

            <button class="base-item" data-map="Satellite">Satellite</button>

            <button class="base-item" data-map="Dark">Dark</button>

            <button class="base-item" data-map="Topographic">Topographic</button>
            `
        );

        // Add click events after the panel content exists
        document.querySelectorAll(".base-item").forEach(button => {

            button.addEventListener("click", () => {

                const mapName = button.dataset.map;

                switchBasemap(mapName);

            });

        });

    });

document
    .getElementById("layersBtn")
    .addEventListener("click", renderLayersPanel);

document
    .getElementById("markersBtn")
    .addEventListener("click", renderMarkersPanel);

let drawControlAdded = false;

// Register Draw with the tool manager so activating Markers/Measure/etc.
// later automatically retracts the Draw toolbar (mutual exclusivity),
// without changing what happens when you click Draw itself.
registerTool("draw", () => {
    if (drawControlAdded) {
        map.removeControl(drawControl);
        drawControlAdded = false;
    }
});

document
    .getElementById("drawBtn")
    .addEventListener("click", () => {

        activateTool("draw");

        if (!drawControlAdded) {

            map.addControl(drawControl);

            drawControlAdded = true;

        }

    });

map.on(L.Draw.Event.CREATED, function (event) {

    const layer = event.layer;

    drawnItems.addLayer(layer);

    refreshLayers(); // update layer count / feature count everywhere

});

map.on(L.Draw.Event.EDITED, refreshLayers);
map.on(L.Draw.Event.DELETED, refreshLayers);

L.control.layers(baseMaps).addTo(map);



console.log(map);
