import {
    armDistanceMeasure,
    armAreaMeasure,
    finishMeasurement,
    cancelActiveMeasurement,
    getMeasureState,
    getMeasurements,
    onMeasurementsChange,
    deleteMeasurement,
    focusMeasurement
} from "../tools/measuretools.js";
import { openPanel, closePanel } from "./panel.js";
import { showMapHud, hideMapHud } from "./mapHud.js";
import { escapeHtml, refreshIcons } from "../utils/dom.js";
import { isPanelOpenFor } from "./panelState.js";
import { getUnitSystem, setUnitSystem, onSettingsChange } from "../core/settingsStore.js";
import { formatLength, formatArea } from "../utils/units.js";

let initialized = false;

export function initMeasurePanel(map) {
    if (initialized) return;
    initialized = true;

    onMeasurementsChange(() => {
        const state = getMeasureState();
        if (state.active) {
            closePanel();
            renderMeasureHud(state, getUnitSystem());
            return;
        }

        hideMapHud();
        if (isPanelOpenFor("Measure")) {
            renderMeasurePanel();
        }
    });

    onSettingsChange(() => {
        const state = getMeasureState();
        if (state.active) {
            renderMeasureHud(state, getUnitSystem());
            return;
        }
        if (isPanelOpenFor("Measure")) {
            renderMeasurePanel();
        }
    });
}

export function renderMeasurePanel() {
    const state = getMeasureState();
    const unitSystem = getUnitSystem();

    if (state.active) {
        closePanel();
        renderMeasureHud(state, unitSystem);
        return;
    }

    renderIdleState(unitSystem);
}

function renderMeasureHud(state, unitSystem) {
    const liveText = state.mode === "distance"
        ? formatLength(state.liveValueMeters, unitSystem)
        : formatArea(state.liveValueMeters, unitSystem);

    showMapHud(`
        <div class="map-hud-measure">
            <p class="map-hud-title">
                ${state.mode === "distance" ? "Measuring distance" : "Measuring area"}
            </p>
            <p class="map-hud-hint">
                ${state.mode === "distance"
                    ? "Click the map to add points along the line."
                    : "Click the map to add polygon corners."}
            </p>
            <div class="measure-live-value map-hud-value">${liveText}</div>
            <p class="map-hud-meta">${state.pointCount} point${state.pointCount === 1 ? "" : "s"} placed · min ${state.minPoints}</p>
            <div class="map-hud-actions">
                <button id="finishMeasureBtn" class="mp-save">Finish</button>
                <button id="cancelMeasureBtn" class="mp-delete">Cancel</button>
            </div>
        </div>
    `);

    document.getElementById("finishMeasureBtn").addEventListener("click", () => {
        finishMeasurement();
        renderMeasurePanel();
    });

    document.getElementById("cancelMeasureBtn").addEventListener("click", () => {
        cancelActiveMeasurement();
        renderMeasurePanel();
    });
}

function renderIdleState(unitSystem) {
    const measurements = getMeasurements();

    const list = measurements.length === 0
        ? `<p class="text-gray-500 text-sm mt-3">No measurements yet. Choose Distance or Area, then click the map.</p>`
        : `<div class="space-y-2 mt-3">
            ${measurements
                .map((m) => {
                    const valueText = m.type === "distance"
                        ? formatLength(m.valueMeters, unitSystem)
                        : formatArea(m.valueMeters, unitSystem);
                    const perimeterText = m.perimeterMeters != null
                        ? `Perimeter ${formatLength(m.perimeterMeters, unitSystem)}`
                        : (m.type === "distance" ? "Line measurement" : "Area measurement");

                    return `
                    <div class="marker-row" data-id="${m.id}">
                        <span class="cat-dot" style="background:${m.type === "distance" ? "#4f46e5" : "#f59e0b"}"></span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">${m.type === "distance" ? "Distance" : "Area"}: ${escapeHtml(valueText)}</p>
                            <p class="text-xs text-gray-400 truncate">${escapeHtml(perimeterText)}</p>
                        </div>
                        <button class="icon-sm measure-focus" data-id="${m.id}" title="Zoom to measurement">
                            <i data-lucide="crosshair"></i>
                        </button>
                        <button class="icon-sm marker-del measure-del" data-id="${m.id}" title="Delete measurement">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>`;
                })
                .join("")}
        </div>`;

    openPanel(
        "Measure",
        `
        <div>
            <div class="unit-toggle">
                <button class="unit-btn ${unitSystem === "metric" ? "active" : ""}" data-unit="metric">Metric</button>
                <button class="unit-btn ${unitSystem === "imperial" ? "active" : ""}" data-unit="imperial">Imperial</button>
            </div>

            <button id="measureDistanceBtn" class="add-marker-btn mt-3">
                <i data-lucide="ruler"></i>
                <span>Measure Distance</span>
            </button>
            <button id="measureAreaBtn" class="add-marker-btn mt-2">
                <i data-lucide="shapes"></i>
                <span>Measure Area</span>
            </button>

            ${list}
        </div>
        `
    );

    document.querySelectorAll(".unit-btn").forEach((btn) => {
        btn.addEventListener("click", () => setUnitSystem(btn.dataset.unit));
    });

    document.getElementById("measureDistanceBtn").addEventListener("click", () => {
        closePanel();
        armDistanceMeasure();
    });

    document.getElementById("measureAreaBtn").addEventListener("click", () => {
        closePanel();
        armAreaMeasure();
    });

    document.querySelectorAll(".measure-focus").forEach((btn) => {
        btn.addEventListener("click", () => {
            const found = measurements.find((m) => m.id === btn.dataset.id);
            if (found) focusMeasurement(found.layer);
        });
    });

    document.querySelectorAll(".measure-del").forEach((btn) => {
        btn.addEventListener("click", () => {
            const found = measurements.find((m) => m.id === btn.dataset.id);
            if (found && confirm("Delete this measurement?")) deleteMeasurement(found.layer);
        });
    });

    refreshIcons();
}
