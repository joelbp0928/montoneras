import { showmessage } from "./showmessage.js";
//import { ocultarContenedores } from "./admin/buscarAdmin.js";
// Función para mostrar un mensaje de error en un campo específico
export function showError(fieldId, errorMessage, etiquetaId = "", mensajeEtiqueta = "") {
  const field = document.getElementById(fieldId);
  const etiqueta = document.getElementById(etiquetaId);

  if (field) {
    // Quitar la clase para reiniciar el efecto
    field.classList.remove('error');

    // Reagregarla tras un pequeño delay para reiniciar animación CSS
    setTimeout(() => {
      field.classList.add('is-invalid', 'error');
    }, 10); // 10ms es suficiente
  }

  if (etiquetaId && etiqueta) {
    etiqueta.classList.add("mensaje-error");
    etiqueta.style.display = "block";
    etiqueta.textContent = mensajeEtiqueta;
    showmessage(errorMessage, "error");
  }
}

// Función para ocultar el mensaje de error y eliminar la clase de error del campo
export function hideError(fieldId, mensajeEtiqueta) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.remove("is-invalid", "error"); // Remueve las clases de error del campo
  }

  // Solo intenta manipular el mensaje si mensajeEtiqueta no es null o undefined
  if (mensajeEtiqueta) {
    const etiqueta = document.getElementById(mensajeEtiqueta);
    if (etiqueta) {
      etiqueta.style.display = 'none'; // Oculta el mensaje de error
    }
  }
}

export function validacionAgregarValid(ids) {
  ids.forEach(id => document.getElementById(id).classList.add('is-valid'));
}