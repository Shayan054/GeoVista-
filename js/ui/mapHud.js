export function showMapHud(html) {
    const hud = document.getElementById("mapHud");
    document.getElementById("mapHudContent").innerHTML = html;
    hud.classList.remove("hidden");
}

export function hideMapHud() {
    const hud = document.getElementById("mapHud");
    hud.classList.add("hidden");
    document.getElementById("mapHudContent").innerHTML = "";
}

export function isMapHudVisible() {
    const hud = document.getElementById("mapHud");
    return !!hud && !hud.classList.contains("hidden");
}
