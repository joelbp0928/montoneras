// =====================================================
// SEGURIDAD HTML
// =====================================================

export function escaparHTML(valor) {
    const div = document.createElement("div");
    div.textContent = String(valor ?? "");
    return div.innerHTML;
}
