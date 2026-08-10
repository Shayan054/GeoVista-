import {
    importGeoJSONFile,
    importCSVFile,
    importKMLFile,
    importShapefileFile
} from "../tools/importtools.js";
import { openPanel } from "./panel.js";
import { escapeHtml, refreshIcons } from "../utils/dom.js";

let currentMap = null;

export function initImportPanel(map) {
    currentMap = map;
}

export function renderImportPanel() {
    openPanel(
        "Import Data",
        `
        <div class="space-y-4">
            <div class="import-row">
                <label class="import-label">GeoJSON <span class="text-gray-400">(.geojson, .json)</span></label>
                <input type="file" id="importGeojson" accept=".geojson,.json,application/geo+json" class="import-input" />
            </div>

            <div class="import-row">
                <label class="import-label">CSV <span class="text-gray-400">(auto-detects lat/lon columns)</span></label>
                <input type="file" id="importCsv" accept=".csv,text/csv" class="import-input" />
            </div>

            <div class="import-row">
                <label class="import-label">KML <span class="text-gray-400">(.kml)</span></label>
                <input type="file" id="importKml" accept=".kml" class="import-input" />
            </div>

            <div class="import-row">
                <label class="import-label">Shapefile <span class="text-gray-400">(.zip with .shp/.dbf/.prj)</span></label>
                <input type="file" id="importShp" accept=".zip" class="import-input" />
            </div>

            <div id="importFeedback"></div>
        </div>
        `
    );

    document.getElementById("importGeojson").addEventListener("change", (e) =>
        handleImport(e, importGeoJSONFile, "GeoJSON")
    );
    document.getElementById("importCsv").addEventListener("change", (e) =>
        handleImport(e, importCSVFile, "CSV")
    );
    document.getElementById("importKml").addEventListener("change", (e) =>
        handleImport(e, importKMLFile, "KML")
    );
    document.getElementById("importShp").addEventListener("change", (e) =>
        handleImport(e, importShapefileFile, "Shapefile")
    );

    refreshIcons();
}

function setFeedback(html) {
    const el = document.getElementById("importFeedback");
    if (el) el.innerHTML = html;
}

async function handleImport(event, importFn, label) {
    const file = event.target.files[0];
    if (!file) return;

    setFeedback(`<p class="import-feedback import-feedback-loading">Importing "${escapeHtml(file.name)}"...</p>`);

    try {
        const result = await importFn(file, currentMap);
        const results = Array.isArray(result) ? result : [result];
        const totalFeatures = results.reduce((sum, r) => sum + r.count, 0);

        setFeedback(
            `<p class="import-feedback import-feedback-success">Imported "${escapeHtml(file.name)}" as ${label} &mdash; ${totalFeatures} feature${totalFeatures === 1 ? "" : "s"}.</p>`
        );
    } catch (err) {
        setFeedback(
            `<p class="import-feedback import-feedback-error">Failed to import "${escapeHtml(file.name)}": ${escapeHtml(err.message || String(err))}</p>`
        );
    } finally {
        event.target.value = "";
    }
}
