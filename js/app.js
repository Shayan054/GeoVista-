import { createMap } from "./map/map.js";
import { openPanel, closePanel } from "./ui/panel.js";
import { initializeDrawTool } from "./tools/drawtools.js";
import { registerLayer, refresh as refreshLayers } from "./core/layerRegistry.js";
import { registerTool, activateTool, deactivateAll } from "./core/toolManager.js";
import { initLayersPanel, renderLayersPanel } from "./ui/layersPanel.js";
import { initMarkersPanel, renderMarkersPanel } from "./ui/markersPanel.js";
import { initMeasureTool } from "./tools/measuretools.js";
import { initMeasurePanel, renderMeasurePanel } from "./ui/measurePanel.js";
import { initImportPanel, renderImportPanel } from "./ui/importPanel.js";
import { initAttributesPanel, renderAttributesPanel } from "./ui/attributesPanel.js";
import { initSpatialDataPanel, renderSpatialDataPanel } from "./ui/spatialDataPanel.js";
import { initSettingsPanel, renderSettingsPanel } from "./ui/settingsPanel.js";
import { initSearch } from "./ui/search.js";
import { initMapStatusBar } from "./ui/mapStatusBar.js";
import { locateUser } from "./tools/geolocation.js";
import { initTheme, toggleTheme } from "./core/theme.js";
import { initStatsBar } from "./ui/statsbar.js";

initTheme();

const { map, baseMaps, switchBasemap, drawnItems } = createMap();

const drawControl = initializeDrawTool(map, drawnItems);

// --- Register the built-in "Drawn Features" layer with the layer registry
// so it shows up in the Layers panel, Attributes panel, sidebar count, etc.
const drawnFeaturesEntry = registerLayer({
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
initMeasureTool(map);
initMeasurePanel(map);
initImportPanel(map);
initAttributesPanel(map);
initSpatialDataPanel(map);
initSettingsPanel(map);
initSearch(map);
initMapStatusBar(map);
initStatsBar(map);

document
    .getElementById("closePanel")
    .addEventListener("click", closePanel);

document
    .getElementById("basemapBtn")
    .addEventListener("click", () => {

        deactivateAll();

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
    .addEventListener("click", () => {
        deactivateAll();
        renderLayersPanel();
    });

document
    .getElementById("markersBtn")
    .addEventListener("click", () => {
        deactivateAll();
        renderMarkersPanel();
    });

// Measure's own button intentionally skips deactivateAll() - reopening its
// panel should resume an in-progress measurement, not cancel it.
document
    .getElementById("measureBtn")
    .addEventListener("click", renderMeasurePanel);

document
    .getElementById("importBtn")
    .addEventListener("click", () => {
        deactivateAll();
        renderImportPanel();
    });

document
    .getElementById("attributesBtn")
    .addEventListener("click", () => {
        deactivateAll();
        renderAttributesPanel();
    });

document
    .getElementById("spatialDataBtn")
    .addEventListener("click", () => {
        deactivateAll();
        renderSpatialDataPanel();
    });

document
    .getElementById("settingsBtn")
    .addEventListener("click", () => {
        deactivateAll();
        renderSettingsPanel();
    });

document
    .getElementById("headerSettingsBtn")
    .addEventListener("click", () => {
        deactivateAll();
        renderSettingsPanel();
    });

document
    .getElementById("locateBtn")
    .addEventListener("click", () => locateUser(map));

document
    .getElementById("themeToggleBtn")
    .addEventListener("click", toggleTheme);

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

    layer.on("click", () => {
        document.dispatchEvent(
            new CustomEvent("geovista:feature-selected", {
                detail: { layerId: drawnFeaturesEntry.id, featureId: String(L.Util.stamp(layer)) }
            })
        );
    });

    refreshLayers(); // update layer count / feature count everywhere

});

map.on(L.Draw.Event.EDITED, refreshLayers);
map.on(L.Draw.Event.DELETED, refreshLayers);

L.control.layers(baseMaps).addTo(map);



console.log(map);
