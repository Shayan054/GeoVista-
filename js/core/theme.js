import { getTheme, setTheme, onSettingsChange } from "./settingsStore.js";

function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");
}

/** Applies the persisted theme on load and keeps it in sync with settingsStore. */
export function initTheme() {
    applyTheme(getTheme());
    onSettingsChange(() => applyTheme(getTheme()));
}

export function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
}
