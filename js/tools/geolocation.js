let accuracyCircle = null;
let locationMarker = null;

export function locateUser(map) {
    if (!navigator.geolocation) {
        alert("Geolocation isn't supported in this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const latlng = [latitude, longitude];

            if (locationMarker) map.removeLayer(locationMarker);
            if (accuracyCircle) map.removeLayer(accuracyCircle);

            accuracyCircle = L.circle(latlng, {
                radius: accuracy,
                color: "#3b82f6",
                weight: 1,
                fillColor: "#3b82f6",
                fillOpacity: 0.15
            }).addTo(map);

            locationMarker = L.circleMarker(latlng, {
                radius: 8,
                color: "#2563eb",
                weight: 2,
                fillColor: "#3b82f6",
                fillOpacity: 1
            }).addTo(map);

            map.flyTo(latlng, Math.max(map.getZoom(), 15));
        },
        () => {
            alert("Couldn't get your location. Check your browser's location permission.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}
