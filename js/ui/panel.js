export function openPanel(title, html) {

    const panel = document.getElementById("toolPanel");

    document.getElementById("panelTitle").textContent = title;

    document.getElementById("panelContent").innerHTML = html;

    panel.classList.remove("hidden");

}

export function closePanel() {

    document
        .getElementById("toolPanel")
        .classList.add("hidden");

}