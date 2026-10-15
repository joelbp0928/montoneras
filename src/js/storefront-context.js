export function obtenerStorefrontCode() {

    const partes = window.location.pathname
        .split("/")
        .filter(Boolean);
    console.log("Storefront code obtenido:", partes[1]);
    if (partes[0] !== "s" || !partes[1]) {
        return null;
    }

    return partes[1]
        .trim()
        .toUpperCase();

}
