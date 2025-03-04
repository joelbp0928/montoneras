// Importa los módulos necesarios
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
//import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { auth, db, firebaseConfig } from "./firebase.js";
import { showmessage } from './showmessage.js';
//import { setupPosts } from './postPuntos.js';
import { showError, hideError } from "./manageError.js";
import { getLastClientId } from "./ultimoId.js";
import { isValidDate } from './validarFecha.js'

// Inicializa la aplicación de Firebase
firebase.initializeApp(firebaseConfig);

// Obtén una referencia a la colección de clientes en Firestore
const clientesRef = firebase.firestore().collection('clientes');

// Obtiene una referencia al formulario de registro
const signupForm = document.getElementById("signup-form");

// Agrega un controlador de eventos para manejar el envío del formulario
// Controlador del evento submit del formulario de registro
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Previene el envío del formulario por defecto

  const registroButton = document.getElementById('registroButton');
  registroButton.disabled = true; // Deshabilita el botón para evitar múltiples envíos

  showmessage("Registrando. Espere...", "warning"); // Mensaje inicial de registro en proceso

  // Limpia errores previos en todos los campos
  validacionEliminarError(['nombre', 'telefonoRegistro', 'alcaldia', 'colonia', 'nacimiento', 'email', 'password', 'confirmPassword']);
  hideError("nacimiento", "mensajeErrorNacimiento");
  // Obtiene los valores ingresados en el formulario
  const telefono = document.getElementById("telefonoRegistro").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const nombre = document.getElementById('nombre').value;
  const alcaldia = document.getElementById('alcaldia').value;
  const colonia = document.getElementById('colonia').value;
  const nacimiento = document.getElementById('nacimiento').value;

  try {
    // Valida el correo electrónico
    if (!(await validarYProcesarEmail(email))) {
      registroButton.disabled = false;
      return;
    }

    // Valida el número de teléfono
    if (!(await validarYProcesarTelefono(telefono))) {
      registroButton.disabled = false;
      return;
    }

    // Valida las contraseñas
    if (!validaryProcesarPassword(password, confirmPassword)) {
      registroButton.disabled = false;
      return;
    }

    // Valida la fecha de nacimiento
    if (!isValidDate(nacimiento)) {
      showError("nacimiento", "Fecha inválida", "mensajeErrorNacimiento", "Debe ser mayor de 5 años.");
      registroButton.disabled = false;
      return;
    }
    hideError("nacimiento", "mensajeErrorNacimiento");
    validacionAgregarValid(['nacimiento'])
    // Valida campos obligatorios como nombre, alcaldía y colonia
    if (!nombre || !alcaldia || !colonia) {
      showError("nombre", "Campo requerido", "mensajeErrorNombre", "El nombre es obligatorio.");
      registroButton.disabled = false;
      return;
    }
    validacionAgregarValid(['nombre', 'alcaldia','colonia'])

    // Obtiene el último cliente ID y genera uno nuevo
    const ultimoId = await getLastClientId(clientesRef);
    const nuevoId = ultimoId + 1;

    // Crea un objeto cliente con los datos ingresados
    const cliente = {
      clienteId: nuevoId.toString(),
      nombre,
      telefono,
      email,
      alcaldia,
      colonia,
      nacimiento,
      puntos: 5, // Asigna 5 puntos como bienvenida
      fechaRegistro: firebase.firestore.Timestamp.now(), // Fecha de registro actual
      ultimaFechaIngreso: "",
      ultimosPuntos: "",
      ultimaFechaIngresoGastar: "",
      ultimosPuntosGastar: "",
      nombreNormalizado: nombre.toLowerCase()
    };

    // Guarda el cliente en Firestore
    const clienteDocRef = clientesRef.doc(cliente.clienteId);
    await clienteDocRef.set(cliente);

    try {
      // Crea el usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const clienteUid = userCredential.user.uid; // Obtiene el UID del usuario creado

      // Actualiza el cliente en Firestore con el UID
      await clienteDocRef.update({ clienteUid });

      validacionAgregarValid(['nombre', 'telefono','alcaldia','colonia', 'nacimiento', 'email', 'password', 'confirmPassword'],)

      // Si todo fue exitoso, limpia el formulario y muestra un mensaje de éxito
      resetFormFields();
      registroButton.disabled = false;

      const signupModal = document.querySelector('#signupModal');
      const modal = bootstrap.Modal.getInstance(signupModal);
      modal.hide();

      showmessage("Registro exitoso \n Te regalamos 5 puntos.", "success");
    } catch (authError) {
      // Si falla la autenticación, elimina el cliente en Firestore
      await deleteDoc(clienteDocRef);
      console.error("Error al crear el usuario en Authentication. Registro revertido.", authError);
      showmessage("Error al registrar el cliente. Por favor, inténtalo de nuevo.", "error");
    }
  } catch (error) {
    // Manejo de errores generales durante el registro
    console.error("Error durante el registro: ", error);
    showmessage("Ocurrió un error durante el registro. Intenta más tarde.", "error");
  } finally {
    registroButton.disabled = false; // Habilita el botón de registro al final del flujo
  }
});

// Valida y procesa el correo electrónico
async function validarYProcesarEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Expresión regular para validar formato de correo
  if (!emailRegex.test(email)) {
    showError("email", "Correo electrónico inválido", "mensajeErrorEmail", "Formato del correo no válido.");
    return false;
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods.length > 0) {
      showError("email", "Correo ya registrado", "mensajeErrorEmail", "Este correo ya está registrado.");
      return false;
    }
  } catch (error) {
    console.error("Error al verificar el correo:", error);
    showmessage("Error al verificar el correo. Intenta más tarde.", "error");
    return false;
  }

  hideError("email", "mensajeErrorEmail");
  validacionAgregarValid(['email'])
  return true;
}

// Valida y procesa el número de teléfono
async function validarYProcesarTelefono(telefono) {
  hideError("telefonoRegistro", "mensajeErrorTelefono");
  if (!validarFormatoTelefono(telefono)) {
    showError("telefonoRegistro", "Número no válido", "mensajeErrorTelefono", "El número debe tener 10 dígitos.");
    return false;
  }

  try {
    const snapshot = await getDocs(query(collection(db, "clientes"), where("telefono", "==", telefono)));
    if (!snapshot.empty) {
      showError("telefonoRegistro", "Número ya registrado", "mensajeErrorTelefono", "Este número ya está asociado a otra cuenta.");
      return false;
    }
  } catch (error) {
    console.error("Error al verificar teléfono:", error);
    showmessage("Error al verificar el teléfono. Intenta más tarde.", "error");
    return false;
  }

  hideError("telefonoRegistro", "mensajeErrorTelefono");
  validacionAgregarValid(['telefonoRegistro'])
  return true;
}

// Valida el formato del número de teléfono
function validarFormatoTelefono(telefono) {
  const telefonoLimpio = telefono.replace(/[^\d]/g, ""); // Limpia caracteres no numéricos
  return telefonoLimpio.length === 10; // Verifica que tenga exactamente 10 dígitos
}

// Valida y procesa las contraseñas
function validaryProcesarPassword(password, confirmPassword) {
  hideError("password", "mensajeErrorPassword");
  hideError("confirmPassword", "mensajeErrorPassword");

  if (password !== confirmPassword) {
    showError("password", "Las contraseñas no coinciden", "mensajeErrorPassword", "Verifica que coincidan.");
    showError("confirmPassword", "", "", ""); // Evita duplicidad de mensajes
    return false;
  }

  if (password.length < 6) {
    showError("password", "Contraseña débil", "mensajeErrorPassword", "Debe tener al menos 6 caracteres.");
    showError("confirmPassword", "", "", "");
    return false;
  }

  hideError("password", "mensajeErrorPassword");
  hideError("confirmPassword", "mensajeErrorPassword");
  validacionAgregarValid(['password', 'confirmPassword'])
  return true;
}

// Limpia los campos del formulario después de un registro exitoso
function resetFormFields() {
  signupForm.reset();
  validacionEliminarError(['nombre', 'telefonoRegistro', 'alcaldia', 'colonia', 'nacimiento', 'email', 'password', 'confirmPassword']);
}

// Elimina clases de error en campos específicos
function validacionEliminarError(ids) {
  ids.forEach(id => document.getElementById(id).classList.remove('is-valid', 'error', 'is-invalid'));
}

// Marca campos como válidos
function validacionAgregarValid(ids) {
  ids.forEach(id => document.getElementById(id).classList.add('is-valid'));
}