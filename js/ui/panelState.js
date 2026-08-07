/**
 * Returns true if the tool panel is open and currently showing `title`.
 * Used by panels that subscribe to data changes (Layers, Markers, ...) so
 * they only re-render themselves when they're the one actually visible.
 */
export function isPanelOpenFor(title) {
    const panel = document.getElementById("toolPanel");
    const panelTitle = document.getElementById("panelTitle");
    return (
        !!panel &&
        !panel.classList.contains("hidden") &&
        !!panelTitle &&
        panelTitle.textContent === title
    );
}
