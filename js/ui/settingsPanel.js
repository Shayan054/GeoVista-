import {
    getUnitSystem,
    setUnitSystem,
    getCoordinateFormat,
    setCoordinateFormat,
    getTheme,
    setTheme,
    onSettingsChange
} from "../core/settingsStore.js";
import { openPanel } from "./panel.js";
import { refreshIcons } from "../utils/dom.js";
import { isPanelOpenFor } from "./panelState.js";

let currentMap = null;

export function initSettingsPanel(map) {
    currentMap = map;
    onSettingsChange(() => {
        if (isPanelOpenFor("Settings")) renderSettingsPanel();
    });
}

export function renderSettingsPanel() {
    const unitSystem = getUnitSystem();
    const coordinateFormat = getCoordinateFormat();
    const theme = getTheme();

    openPanel(
        "Settings",
        `
        <div class="space-y-4">
            <div class="settings-row">
                <label>Theme</label>
                <div class="unit-toggle mt-1">
                    <button class="unit-btn ${theme === "light" ? "active" : ""}" data-theme="light">Light</button>
                    <button class="unit-btn ${theme === "dark" ? "active" : ""}" data-theme="dark">Dark</button>
                </div>
            </div>

            <div class="settings-row">
                <label>Units <span class="text-gray-400">(shared with Measure)</span></label>
                <div class="unit-toggle mt-1">
                    <button class="unit-btn ${unitSystem === "metric" ? "active" : ""}" data-units="metric">Metric</button>
                    <button class="unit-btn ${unitSystem === "imperial" ? "active" : ""}" data-units="imperial">Imperial</button>
                </div>
            </div>

            <div class="settings-row">
                <label>Coordinate Format</label>
                <div class="unit-toggle mt-1">
                    <button class="unit-btn ${coordinateFormat === "decimal" ? "active" : ""}" data-coord="decimal">Decimal</button>
                    <button class="unit-btn ${coordinateFormat === "dms" ? "active" : ""}" data-coord="dms">DMS</button>
                </div>
            </div>

            <button id="resetMapViewBtn" class="add-marker-btn mt-2">
                <i data-lucide="refresh-ccw"></i>
                <span>Reset Map View</span>
            </button>
        </div>
        `
    );

    document.querySelectorAll("[data-theme]").forEach((btn) => {
        btn.addEventListener("click", () => setTheme(btn.dataset.theme));
    });
    document.querySelectorAll("[data-units]").forEach((btn) => {
        btn.addEventListener("click", () => setUnitSystem(btn.dataset.units));
    });
    document.querySelectorAll("[data-coord]").forEach((btn) => {
        btn.addEventListener("click", () => setCoordinateFormat(btn.dataset.coord));
    });

    document.getElementById("resetMapViewBtn").addEventListener("click", () => {
        currentMap.flyTo([39.8283, -98.5795], 5);
    });

    refreshIcons();
}
