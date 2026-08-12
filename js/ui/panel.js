export function initPanelModal() {
    document.getElementById("toolModalBackdrop").addEventListener("click", () => {
        if (document.getElementById("mapHud") && !document.getElementById("mapHud").classList.contains("hidden")) {
            return;
        }
        closePanel();
    });
    document.getElementById("closePanel").addEventListener("click", closePanel);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isPanelOpen()) {
            closePanel();
        }
    });
}

export function openPanel(title, html, options = {}) {
    const modal = document.getElementById("toolModal");
    const dialog = document.getElementById("toolPanel");

    document.getElementById("panelTitle").textContent = title;
    document.getElementById("panelContent").innerHTML = html;

    dialog.classList.toggle("tool-modal-dialog--wide", options.wide === true);
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

export function closePanel() {
    document.getElementById("toolModal").classList.add("hidden");
    document.body.classList.remove("modal-open");
}

export function isPanelOpen() {
    const modal = document.getElementById("toolModal");
    return !!modal && !modal.classList.contains("hidden");
}
