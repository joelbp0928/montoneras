export function obtenerStorefrontCode() {
    console.log("Storefront code obtenido:", partes[1]);
    const partes = window.location.pathname
        .split("/")
        .filter(Boolean);

    if (partes[0] !== "s" || !partes[1]) {
        return null;
    }

    return partes[1]
    .trim()
    .toUpperCase();
    
}
