import {
    getAllLayers,
    getLayer,
    onLayersChange,
    setActiveLayer,
    getActiveLayerId
} from "../core/layerRegistry.js";
import { getFeatureRows, findSubLayerByFeatureId, focusFeatureLayer } from "../tools/attributestools.js";
import { openPanel } from "./panel.js";
import { escapeHtml, refreshIcons } from "../utils/dom.js";
import { isPanelOpenFor } from "./panelState.js";

let currentMap = null;
let selectedFeatureId = null;

export function initAttributesPanel(map) {
    currentMap = map;

    onLayersChange(() => {
        if (isPanelOpenFor("Attributes")) renderAttributesPanel();
    });

    // Clicking any feature on the map (draw shape, marker, measurement, or
    // imported feature) selects its row here if the panel is open.
    document.addEventListener("geovista:feature-selected", (e) => {
        const { layerId, featureId } = e.detail || {};
        if (!layerId || !isPanelOpenFor("Attributes")) return;

        selectedFeatureId = featureId;
        setActiveLayer(layerId);
        renderAttributesPanel();
    });
}

export function renderAttributesPanel() {
    const layers = getAllLayers();

    if (layers.length === 0) {
        openPanel("Attributes", `<p class="text-gray-500 text-sm">No layers loaded yet.</p>`);
        return;
    }

    let activeId = getActiveLayerId();
    if (!activeId || !getLayer(activeId)) {
        activeId = layers[0].id;
        setActiveLayer(activeId);
    }

    const options = layers
        .map((l) => `<option value="${l.id}" ${l.id === activeId ? "selected" : ""}>${escapeHtml(l.name)}</option>`)
        .join("");

    openPanel(
        "Attributes",
        `
        <div>
            <label class="text-xs text-gray-500">Layer</label>
            <select id="attrLayerSelect" class="base-item mt-1">${options}</select>

            <input
                id="attrSearchInput"
                type="text"
                placeholder="Search attributes..."
                class="attr-search mt-3"
            />

            <p id="attrCount" class="text-xs text-gray-400 mt-2"></p>
            <div id="attrTableWrap" class="attr-table-wrap mt-2"></div>
        </div>
        `
    );

    document.getElementById("attrLayerSelect").addEventListener("change", (e) => {
        setActiveLayer(e.target.value);
        selectedFeatureId = null;
        renderAttributesPanel();
    });

    document.getElementById("attrSearchInput").addEventListener("input", renderAttrRows);

    renderAttrRows();
    refreshIcons();
}

/**
 * Re-renders only the table body/count, never the search <input> itself,
 * so typing a search query doesn't lose focus mid-keystroke.
 */
function renderAttrRows() {
    const entry = getLayer(getActiveLayerId());
    const wrap = document.getElementById("attrTableWrap");
    const countEl = document.getElementById("attrCount");
    if (!wrap || !entry) return;

    const query = (document.getElementById("attrSearchInput")?.value || "").trim().toLowerCase();
    const rows = getFeatureRows(entry);
    const fields = collectFields(rows);

    const filtered = query
        ? rows.filter((r) => Object.values(r.properties).some((v) => String(v ?? "").toLowerCase().includes(query)))
        : rows;

    if (countEl) {
        countEl.textContent = `${filtered.length} of ${rows.length} feature${rows.length === 1 ? "" : "s"}`;
    }

    if (filtered.length === 0) {
        wrap.innerHTML = `<p class="text-gray-500 text-sm">No matching features.</p>`;
        return;
    }

    const headerCells = fields.map((f) => `<th>${escapeHtml(f)}</th>`).join("");
    const bodyRows = filtered
        .map((r) => {
            const cells = fields.map((f) => `<td>${escapeHtml(String(r.properties[f] ?? ""))}</td>`).join("");
            const selectedClass = String(r.featureId) === String(selectedFeatureId) ? "attr-row-selected" : "";
            return `<tr class="attr-row ${selectedClass}" data-feature-id="${escapeHtml(String(r.featureId))}">${cells}</tr>`;
        })
        .join("");

    wrap.innerHTML = `
        <table class="attr-table">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
        </table>
    `;

    wrap.querySelectorAll(".attr-row").forEach((tr) => {
        tr.addEventListener("click", () => {
            selectedFeatureId = tr.dataset.featureId;
            const subLayer = findSubLayerByFeatureId(entry, selectedFeatureId);
            focusFeatureLayer(currentMap, subLayer);
            renderAttrRows();
        });
    });
}

function collectFields(rows) {
    const fields = new Set();
    rows.forEach((r) => Object.keys(r.properties).forEach((k) => fields.add(k)));
    return [...fields];
}
