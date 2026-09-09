const COLOR_PRIMARIO = "#2563eb";

export function mostrarError(titulo, mensaje) {
    return Swal.fire({
        icon: "error",
        title: titulo,
        text: mensaje,
        confirmButtonText: "Entendido",
        confirmButtonColor: COLOR_PRIMARIO
    });
}

export function mostrarAdvertencia(titulo, mensaje) {
    return Swal.fire({
        icon: "warning",
        title: titulo,
        text: mensaje,
        confirmButtonText: "Entendido",
        confirmButtonColor: COLOR_PRIMARIO
    });
}

export function mostrarCargando(titulo = "Procesando...") {
    return Swal.fire({
        title: titulo,
        text: "Espera un momento.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
}

export function cerrarCargando() {
    Swal.close();
}

export function mostrarExito(mensaje) {
    return Swal.fire({
        icon: "success",
        title: mensaje,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true
    });
}

export function mostrarToast(mensaje) {
    return Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true
    });
}