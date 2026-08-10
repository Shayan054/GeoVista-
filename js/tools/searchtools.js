const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search?format=jsonv2&q=";
const COORD_REGEX = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/;

/** Detects a raw "lat,lng" input so it can skip geocoding entirely. */
export function parseCoordinateInput(text) {
    const match = text.match(COORD_REGEX);
    if (!match) return null;

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[3]);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
}

export async function geocode(query) {
    const res = await fetch(`${NOMINATIM_URL}${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error("Search request failed.");
    return res.json();
}
