let counter = 0;

/**
 * Generates a unique, sortable-ish string id.
 * @param {string} prefix
 */
export function generateId(prefix = "id") {
    counter += 1;
    return `${prefix}_${Date.now().toString(36)}_${counter}`;
}
