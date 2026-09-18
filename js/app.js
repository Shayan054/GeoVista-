import { createMap } from "./map/map.js";
import { initPanelModal, closePanel } from "./ui/panel.js";
import { showMapHud, hideMapHud } from "./ui/mapHud.js";
import { bindDrawFeatureLayer } from "./utils/featurePopup.js";
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

const { map, baseMaps, drawnItems } = createMap();

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
initPanelModal();

const sidebar = document.getElementById("appSidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
function setMobileMenu(open) {
    sidebar.classList.toggle("mobile-open", open);
    sidebarBackdrop.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
menuToggle.addEventListener("click", () => setMobileMenu(!sidebar.classList.contains("mobile-open")));
sidebarBackdrop.addEventListener("click", () => setMobileMenu(false));
sidebar.querySelectorAll(".menu-btn").forEach(button =>
    button.addEventListener("click", () => setMobileMenu(false))
);
document.addEventListener("keydown", event => {
    if (event.key === "Escape") setMobileMenu(false);
});
window.matchMedia("(min-width: 769px)").addEventListener("change", event => {
    if (event.matches) setMobileMenu(false);
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
    hideMapHud();
});

function showDrawHud() {
    showMapHud(`
        <div class="map-hud-draw">
            <p class="map-hud-title">Draw mode</p>
            <p class="map-hud-hint">Use the toolbar on the map to pick a shape, then click and drag on the map to draw.</p>
            <div class="map-hud-actions">
                <button id="drawDoneBtn" class="mp-save">Done drawing</button>
            </div>
        </div>
    `);

    document.getElementById("drawDoneBtn").addEventListener("click", () => {
        deactivateAll();
    });
}

document
    .getElementById("drawBtn")
    .addEventListener("click", () => {

        closePanel();
        activateTool("draw");

        if (!drawControlAdded) {

            map.addControl(drawControl);

            drawControlAdded = true;

        }

        showDrawHud();

    });

map.on(L.Draw.Event.CREATED, function (event) {

    const layer = event.layer;

    drawnItems.addLayer(layer);

    bindDrawFeatureLayer(layer, drawnFeaturesEntry.id);

    refreshLayers();

});

map.on(L.Draw.Event.EDITED, refreshLayers);
map.on(L.Draw.Event.DELETED, refreshLayers);

L.control.layers(baseMaps).addTo(map);



console.log(map);
