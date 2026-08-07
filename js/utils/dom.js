/**
 * Escapes text before it is interpolated into innerHTML strings.
 * @param {*} str
 */
export function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

/**
 * Re-renders Lucide icons. Safe to call even if lucide hasn't loaded yet.
 */
export function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
}
