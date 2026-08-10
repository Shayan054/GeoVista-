/**
 * settingsStore is the single persisted (localStorage) source of truth for
 * app-wide preferences. Measure, Attributes, Spatial Analysis, the status
 * bar and the Settings panel all read/write through here so toggling a
 * setting in one place (e.g. units in the Measure panel) stays in sync
 * everywhere else (e.g. the Settings panel).
 */

const STORAGE_KEY = "geovista.settings";

const defaults = {
    unitSystem: "metric", // "metric" | "imperial"
    coordinateFormat: "decimal", // "decimal" | "dms"
    theme: "light" // "light" | "dark"
};

let settings = loadSettings();
const listeners = [];

function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...defaults };
        return { ...defaults, ...JSON.parse(raw) };
    } catch (e) {
        return { ...defaults };
    }
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        /* localStorage unavailable (e.g. private mode) - settings just won't persist */
    }
}

function emit() {
    listeners.forEach((cb) => cb(settings));
}

export function onSettingsChange(cb) {
    listeners.push(cb);
    return () => {
        const idx = listeners.indexOf(cb);
        if (idx > -1) listeners.splice(idx, 1);
    };
}

export function getSettings() {
    return settings;
}

export function getUnitSystem() {
    return settings.unitSystem;
}

export function setUnitSystem(value) {
    settings.unitSystem = value;
    persist();
    emit();
}

export function getCoordinateFormat() {
    return settings.coordinateFormat;
}

export function setCoordinateFormat(value) {
    settings.coordinateFormat = value;
    persist();
    emit();
}

export function getTheme() {
    return settings.theme;
}

export function setTheme(value) {
    settings.theme = value;
    persist();
    emit();
}
