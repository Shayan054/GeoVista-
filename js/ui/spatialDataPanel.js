import {
    getAllLayers,
    getLayer,
    onLayersChange,
    setActiveLayer,
    getActiveLayerId,
    getLayerBounds,
    getFeatureCount
} from "../core/layerRegistry.js";
import { getFeatureRows } from "../tools/attributestools.js";
import {
    runBuffer,
    runCentroid,
    runBoundingBox,
    runPointInPolygon,
    runNearestFeature,
    runIntersect,
    runUnion,
    runSpatialSelection
} from "../tools/spatialtools.js";
import { exportLayerAsGeoJSON, exportLayerAsCSV } from "../tools/exporttools.js";
import { openPanel } from "./panel.js";
import { escapeHtml, refreshIcons } from "../utils/dom.js";
import { isPanelOpenFor } from "./panelState.js";
import { getCoordinateFormat } from "../core/settingsStore.js";
import { formatCoordinate } from "../utils/units.js";

let currentMap = null;

export function initSpatialDataPanel(map) {
    currentMap = map;
    onLayersChange(() => {
        if (isPanelOpenFor("Spatial Data")) renderSpatialDataPanel();
    });
}

export function renderSpatialDataPanel() {
    const layers = getAllLayers();

    if (layers.length === 0) {
        openPanel("Spatial Data", `<p class="text-gray-500 text-sm">No layers loaded yet.</p>`);
        return;
    }

    let activeId = getActiveLayerId();
    if (!activeId || !getLayer(activeId)) {
        activeId = layers[0].id;
        setActiveLayer(activeId);
    }
    const entry = getLayer(activeId);

    openPanel(
        "Spatial Data",
        `
        <div class="space-y-4">
            <div>
                <label class="text-xs text-gray-500">Layer</label>
                <select id="sdLayerSelect" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
            </div>

            <div id="sdMeta">${renderMetadata(entry)}</div>

            <div class="flex gap-2">
                <button id="exportGeojsonBtn" class="analysis-btn flex-1">Export GeoJSON</button>
                <button id="exportCsvBtn" class="analysis-btn flex-1">Export CSV</button>
            </div>
            <div id="exportFeedback"></div>

            <hr class="border-gray-200" />

            <div>
                <h3 class="font-semibold text-sm mb-2">Spatial Analysis</h3>
                ${renderAnalysisControls(layers, activeId)}
                <div id="analysisFeedback" class="mt-2"></div>
            </div>
        </div>
        `
    );

    document.getElementById("sdLayerSelect").addEventListener("change", (e) => {
        setActiveLayer(e.target.value);
        renderSpatialDataPanel();
    });

    bindExportEvents();
    bindAnalysisEvents();
    refreshIcons();
}

function renderMetadata(entry) {
    const bounds = getLayerBounds(entry.leafletLayer);
    const fields = collectFields(entry);
    const chips = fields.length
        ? fields.map((f) => `<span class="attr-chip">${escapeHtml(f)}</span>`).join("")
        : `<span class="text-xs text-gray-400">No attribute fields</span>`;

    return `
    <div class="sd-meta-grid">
        <div><span>Geometry</span><b>${escapeHtml(entry.geometryType)}</b></div>
        <div><span>Features</span><b>${getFeatureCount(entry.id)}</b></div>
        <div><span>CRS</span><b>${escapeHtml(entry.crs)}</b></div>
        <div><span>Source</span><b>${escapeHtml(entry.sourceFormat)}</b></div>
    </div>
    <div class="mt-2 text-xs text-gray-500">Bounds</div>
    <div class="text-xs text-gray-700">${escapeHtml(formatBounds(bounds))}</div>
    <div class="mt-2 text-xs text-gray-500">Attribute fields</div>
    <div class="attr-chip-row">${chips}</div>
    `;
}

function collectFields(entry) {
    const fields = new Set();
    getFeatureRows(entry).forEach((r) => Object.keys(r.properties).forEach((k) => fields.add(k)));
    return [...fields];
}

function formatBounds(bounds) {
    if (!bounds || !bounds.isValid || !bounds.isValid()) return "Not available";
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const fmt = getCoordinateFormat();
    return `SW ${formatCoordinate(sw.lat, sw.lng, fmt)}  ·  NE ${formatCoordinate(ne.lat, ne.lng, fmt)}`;
}

function layerSelectOptions(layers, selectedId) {
    return layers
        .map((l) => `<option value="${l.id}" ${l.id === selectedId ? "selected" : ""}>${escapeHtml(l.name)}</option>`)
        .join("");
}

function renderAnalysisControls(layers, activeId) {
    return `
    <div class="analysis-row">
        <label>Buffer (meters)</label>
        <div class="flex gap-2 mt-1">
            <input id="bufferMeters" type="number" min="1" value="500" class="attr-search flex-1" />
            <button id="runBuffer" class="analysis-btn">Run</button>
        </div>
    </div>

    <div class="analysis-row">
        <div class="flex gap-2">
            <button id="runCentroid" class="analysis-btn flex-1">Centroid</button>
            <button id="runBbox" class="analysis-btn flex-1">Bounding Box</button>
        </div>
    </div>

    <div class="analysis-row">
        <label>Point in Polygon</label>
        <select id="pipPoints" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <select id="pipPolygon" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <button id="runPip" class="analysis-btn mt-1 w-full">Run</button>
    </div>

    <div class="analysis-row">
        <label>Nearest Feature</label>
        <select id="nearFrom" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <select id="nearTarget" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <button id="runNearest" class="analysis-btn mt-1 w-full">Run</button>
    </div>

    <div class="analysis-row">
        <label>Intersect <span class="text-gray-400">(first polygon of each layer)</span></label>
        <select id="intA" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <select id="intB" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <button id="runIntersect" class="analysis-btn mt-1 w-full">Run</button>
    </div>

    <div class="analysis-row">
        <label>Union <span class="text-gray-400">(first polygon of each layer)</span></label>
        <select id="unionA" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <select id="unionB" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <button id="runUnion" class="analysis-btn mt-1 w-full">Run</button>
    </div>

    <div class="analysis-row">
        <label>Spatial Selection <span class="text-gray-400">(by most recent drawn polygon/rectangle)</span></label>
        <select id="selTarget" class="base-item mt-1">${layerSelectOptions(layers, activeId)}</select>
        <button id="runSelection" class="analysis-btn mt-1 w-full">Run</button>
    </div>
    `;
}

function setFeedback(html) {
    const el = document.getElementById("analysisFeedback");
    if (el) el.innerHTML = html;
}

function runSafely(fn) {
    try {
        const entry = fn();
        setFeedback(`<p class="import-feedback import-feedback-success">Created layer "${escapeHtml(entry.name)}".</p>`);
        renderSpatialDataPanel();
    } catch (err) {
        setFeedback(`<p class="import-feedback import-feedback-error">${escapeHtml(err.message || String(err))}</p>`);
    }
}

function bindExportEvents() {
    const feedbackEl = document.getElementById("exportFeedback");
    const setExportFeedback = (html) => {
        if (feedbackEl) feedbackEl.innerHTML = html;
    };

    document.getElementById("exportGeojsonBtn").addEventListener("click", () => {
        try {
            exportLayerAsGeoJSON(getLayer(getActiveLayerId()));
            setExportFeedback("");
        } catch (err) {
            setExportFeedback(`<p class="import-feedback import-feedback-error">${escapeHtml(err.message || String(err))}</p>`);
        }
    });

    document.getElementById("exportCsvBtn").addEventListener("click", () => {
        try {
            exportLayerAsCSV(getLayer(getActiveLayerId()));
            setExportFeedback("");
        } catch (err) {
            setExportFeedback(`<p class="import-feedback import-feedback-error">${escapeHtml(err.message || String(err))}</p>`);
        }
    });
}

function bindAnalysisEvents() {
    document.getElementById("runBuffer").addEventListener("click", () => {
        const meters = parseFloat(document.getElementById("bufferMeters").value);
        if (!Number.isFinite(meters) || meters <= 0) {
            setFeedback(`<p class="import-feedback import-feedback-error">Enter a valid buffer distance in meters.</p>`);
            return;
        }
        runSafely(() => runBuffer(getLayer(getActiveLayerId()), currentMap, meters));
    });

    document.getElementById("runCentroid").addEventListener("click", () => {
        runSafely(() => runCentroid(getLayer(getActiveLayerId()), currentMap));
    });

    document.getElementById("runBbox").addEventListener("click", () => {
        runSafely(() => runBoundingBox(getLayer(getActiveLayerId()), currentMap));
    });

    document.getElementById("runPip").addEventListener("click", () => {
        const pointsEntry = getLayer(document.getElementById("pipPoints").value);
        const polyEntry = getLayer(document.getElementById("pipPolygon").value);
        runSafely(() => runPointInPolygon(pointsEntry, polyEntry, currentMap));
    });

    document.getElementById("runNearest").addEventListener("click", () => {
        const fromEntry = getLayer(document.getElementById("nearFrom").value);
        const targetEntry = getLayer(document.getElementById("nearTarget").value);
        runSafely(() => runNearestFeature(fromEntry, targetEntry, currentMap));
    });

    document.getElementById("runIntersect").addEventListener("click", () => {
        const a = getLayer(document.getElementById("intA").value);
        const b = getLayer(document.getElementById("intB").value);
        runSafely(() => runIntersect(a, b, currentMap));
    });

    document.getElementById("runUnion").addEventListener("click", () => {
        const a = getLayer(document.getElementById("unionA").value);
        const b = getLayer(document.getElementById("unionB").value);
        runSafely(() => runUnion(a, b, currentMap));
    });

    document.getElementById("runSelection").addEventListener("click", () => {
        const targetEntry = getLayer(document.getElementById("selTarget").value);
        const drawEntry = getAllLayers().find((l) => l.type === "draw");
        runSafely(() => runSpatialSelection(targetEntry, drawEntry, currentMap));
    });
}
