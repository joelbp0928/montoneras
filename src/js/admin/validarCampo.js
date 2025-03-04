import { showmessage } from "../showmessage.js";

export function validarCampo(campo, mensaje, inputField) {
    if (campo === "" || campo === "Selecciona nivel de importancia" || campo === "Selecciona como se mide") {
        showmessage(mensaje, "error");
        inputField.classList.remove("is-valid");
        inputField.classList.add("is-invalid");
        return false;
    }
    inputField.classList.remove("is-invalid");
    inputField.classList.add("is-valid");
    return true;
}

export function limpiarCampos(campo, valido) {
    if (!valido) {
        campo.classList.remove("is-valid")
        campo.classList.add("is-invalid")
    } else {
        campo.classList.remove("is-invalid")
        campo.classList.add("is-valid")
        setTimeout(() => {
            campo.className = "form-control"
            campo.value = ""
        }, 1000);

    }
}