const METERS_PER_FOOT = 0.3048;
const FEET_PER_MILE = 5280;
const SQM_PER_ACRE = 4046.8564224;
const SQM_PER_SQMILE = 2589988.110336;

/**
 * Formats a length given in meters, auto-scaling the unit.
 * @param {number} meters
 * @param {"metric"|"imperial"} unitSystem
 */
export function formatLength(meters, unitSystem = "metric") {
    if (!Number.isFinite(meters)) return "-";

    if (unitSystem === "imperial") {
        const feet = meters / METERS_PER_FOOT;
        if (feet >= FEET_PER_MILE) return `${(feet / FEET_PER_MILE).toFixed(2)} mi`;
        return `${feet.toFixed(1)} ft`;
    }

    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${meters.toFixed(1)} m`;
}

/**
 * Formats an area given in square meters, auto-scaling the unit.
 * @param {number} sqMeters
 * @param {"metric"|"imperial"} unitSystem
 */
export function formatArea(sqMeters, unitSystem = "metric") {
    if (!Number.isFinite(sqMeters)) return "-";

    if (unitSystem === "imperial") {
        const acres = sqMeters / SQM_PER_ACRE;
        if (acres >= 640) return `${(sqMeters / SQM_PER_SQMILE).toFixed(2)} mi²`;
        return `${acres.toFixed(2)} ac`;
    }

    if (sqMeters >= 1e6) return `${(sqMeters / 1e6).toFixed(2)} km²`;
    return `${sqMeters.toFixed(1)} m²`;
}

function toDms(value, isLat) {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = (minFloat - min) * 60;
    const dir = isLat ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
    return `${deg}°${min}'${sec.toFixed(1)}"${dir}`;
}

/**
 * Formats a lat/lng pair as either decimal degrees or DMS.
 * @param {number} lat
 * @param {number} lng
 * @param {"decimal"|"dms"} coordinateFormat
 */
export function formatCoordinate(lat, lng, coordinateFormat = "decimal") {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "-";

    if (coordinateFormat === "dms") {
        return `${toDms(lat, true)}, ${toDms(lng, false)}`;
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
