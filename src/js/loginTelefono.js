// Importa los módulos necesarios
import { firebaseConfig } from '../js/firebase.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { RecaptchaVerifier, signInWithPhoneNumber, getAuth } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { auth, db } from "./firebase.js";
import { showmessage } from "./showmessage.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

// Declarar la variable coderesult fuera de los eventos
let coderesult;

// Obtén referencias a los elementos del DOM
const signinmodal = document.querySelector("#signinModal");
const codigoModal = document.querySelector("#codigoModal");
const telefonoButton = document.querySelector("#signinModal button[data-bs-target='#signinModalTelefono']");
const telefonoForm = document.getElementById("telefono-form");
const codigoForm = document.getElementById("codigo-form");

// Agrega un controlador de eventos para el clic en el botón "Telefono"
telefonoButton.addEventListener("click", () => {
  // Oculta el modal "signinmodal"
  hideModal(signinmodal);
  // Muestra el modal "signinModalTelefono"
  showModal("#signinModalTelefono");
  // Crea y renderiza el RecaptchaVerifier
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' },);
  recaptchaVerifier.render();
});

// Agrega un controlador de eventos para el envío del formulario de teléfono
telefonoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  // Obtiene el valor del teléfono ingresado
  let telefono = document.getElementById("telefono").value;
  // Verificar si el número de teléfono tiene el prefijo "+52", si no lo tiene, agregarlo
  telefono = telefono.startsWith("+52") ? telefono : "+52" + telefono;

  // Verifica si el número de teléfono está registrado en la base de datos
  const userQuerySnapshot = await getDocs(query(collection(db, 'clientes'), where('telefono', '==', telefono)));
  if (!userQuerySnapshot.empty) {
    // Envia el código de verificación al número de teléfono
    firebase.auth().signInWithPhoneNumber(telefono, window.recaptchaVerifier)
      .then(function (confirmationResult) {
        window.confirmationResult = confirmationResult;
        coderesult = confirmationResult;
        // Guarda el objeto de confirmación en un atributo de datos del modal "codigoModal"
        document.getElementById("codigoModal").dataset.confirmationResult = JSON.stringify(confirmationResult);
        // Muestra el modal "codigoModal"
        showmessage("Enviando codigo...", "warning")
        showModal("#codigoModal");
      })
      .catch((error) => {
        if (error.code === "auth/too-many-requests") {
          showmessage("Demasiados intentos\nIntentelo mas tarde", "error");
        } else if (error.code === "auth/captcha-check-failed") {
          showmessage("Error en Captcha", "error");
        } else {
          console.error("Error al enviar el código de verificación", error);
        }
        showmessage("Error al enviar el código de verificación\nRecargar pagina", "error");
      });
  } else {
    // El número de teléfono no está registrado en la base de datos
    showmessage("Número de teléfono no encontrado. Por favor, regístrese primero.", "error");
  }
});

// Agrega un controlador de eventos para el envío del formulario de código de verificación
codigoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById('codigo').value;

  // Verifica el código ingresado
  coderesult.confirm(code)
    .then(() => {
      // Obtén el uid del usuario
      const uid = auth.currentUser.uid;

      // Guarda el uid en la base de datos
      db.collection('clientes').doc(uid).set({
        uid: uid,
        telefono: telefono,
        // Otros datos del usuario
      });
      // Oculta el modal "codigoModal" si el código es correcto
      hideModal(codigoModal);
      reloadPage()
    })
    .catch((error) => {
      // Muestra un mensaje de error si el código es inválido
      showmessage("Código inválido. Intente de nuevo.", "error");
      console.error("Error al verificar el código", error);
    });
});

// Función para mostrar un modal dado su ID
function showModal(modalId) {
  const modal = new bootstrap.Modal(document.querySelector(modalId));
  modal.show();
}

// Función para ocultar un modal dado su elemento DOM
function hideModal(modalElement) {
  const modal = bootstrap.Modal.getInstance(modalElement);
  modal.hide();
}

// Función para recargar la página sin forzar la recarga desde el servidor (puede usar caché)
function reloadPage() {
  location.reload();
}