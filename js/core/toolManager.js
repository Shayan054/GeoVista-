/**
 * Guarantees only one interactive map tool (Draw, Marker-add, Measure, ...)
 * is active at a time. Each tool registers a "deactivate" callback once;
 * activating a different tool automatically calls the previous tool's
 * deactivate callback first.
 */

let activeTool = null;
const deactivators = new Map();

export function registerTool(name, deactivateFn) {
    deactivators.set(name, deactivateFn);
}

export function activateTool(name) {
    if (activeTool && activeTool !== name) {
        const deactivate = deactivators.get(activeTool);
        if (deactivate) deactivate();
    }
    activeTool = name;
}

export function deactivateAll() {
    if (activeTool) {
        const deactivate = deactivators.get(activeTool);
        if (deactivate) deactivate();
    }
    activeTool = null;
}

export function getActiveTool() {
    return activeTool;
}
