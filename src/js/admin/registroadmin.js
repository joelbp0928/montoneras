// Importa y configura Firebase
import { showmessage } from '../showmessage.js'
import { agregarPuntos, calcularPuntos, totalPuntos } from './agregarPuntos.js';
import { isValidDate } from '../validarFecha.js'
import { getLastClientId } from '../ultimoId.js'
import { firebaseConfig } from '../firebase.js'

// Inicializa la aplicación de Firebase
firebase.initializeApp(firebaseConfig);

// Al principio del archivo
const totalPuntosElement = document.getElementById('totalPuntos');
const puntosInput = document.getElementById('puntos');
const mensajeErrorPuntosContainer = document.getElementById('mensajeErrorPuntosContainer');
// Obtén una referencia a la colección de clientes
const clientesRef = firebase.firestore().collection('clientes');
// Obtén una referencia al formulario de registro
const signupForm = document.getElementById("form-registrar");
// Obtener referencias a los botones
const btnAgregarPuntos = document.getElementById('btnAgregarPuntos');
const btnCalcularPuntos = document.getElementById('btnCalcularPuntos');

// Agregar eventos a los botones
btnAgregarPuntos.addEventListener('click', agregarPuntos);
btnCalcularPuntos.addEventListener('click', async () => {
  // Limpia las clases de validación de los campos
  clearValidationClasses();
  // Llamar a la función calcularPuntos() y pasar clientesRef como argumento
  const puntosActualizados = await calcularPuntos(clientesRef);

  if (puntosActualizados) {
    totalPuntosElement.textContent = 'Total de puntos: ' + totalPuntos;
    showElement(totalPuntosElement)
    hideElement(mensajeErrorPuntosContainer);
    puntosInput.classList.add('is-valid');
    showmessage("Puntos actualizados correctamente", "success");
  } else {
    hideElement(totalPuntosElement)
    showElement(mensajeErrorPuntosContainer);
    showError("puntos", "Ingresa un valor numérico válido y mayor que 0 para los puntos.");
  }
});


signupForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  showmessage("Guardando cliente...", "warning")
  let puntos = 0;
  // Obtén el último valor de clienteId de la base de datos
  const ultimoId = await getLastClientId(clientesRef);
  // Incrementa el ID
  const nuevoId = ultimoId + 1;

  const nombre = document.getElementById('nombre').value;
  const telefono = document.getElementById('telefono').value;
  const alcaldia = document.getElementById('alcaldia').value;
  const colonia = document.getElementById('colonia').value;
  const nacimiento = document.getElementById('nacimiento').value;

  // Limpia las clases de validación de los campos
  clearValidationClasses();

  // Aplica la clase de validación a los campos
  const camposInputText = signupForm.querySelectorAll('input[type="text"]');
  camposInputText.forEach((campo) => {
    campo.classList.add('is-valid');
  });
  document.getElementById('nacimiento').classList.add('is-valid');

  // Realiza las validaciones
  // Verificar si el número de teléfono tiene el prefijo "+52", si no lo tiene, agregarlo
  const telefonoValido = telefono.startsWith("+52") ? telefono : "+52" + telefono;
 // const telefonoValido = /^\+52\d{10}$/.test(telefono);
  const fechaValida = isValidDate(nacimiento);

  // Verifica las validaciones y muestra los errores
  if (!telefonoValido || !fechaValida) {
    if (!fechaValida) showError("nacimiento", "La fecha de nacimineto invalida\n Debe ser mayor a 5 años")
    if (!telefonoValido) showError("telefono", "Telefono invalido \nEjemplo\n(+521234567891)")
    return;
  }
  // Crea el objeto cliente con el nuevo ID
  const cliente = {
    clienteId: nuevoId.toString(),
    nombre: nombre,
    telefono: telefono,
    alcaldia: alcaldia,
    colonia: colonia,
    nacimiento: nacimiento,
    puntos: puntos,
    fechaRegistro: firebase.firestore.Timestamp.now(), // Agrega la fecha y hora de registro
    ultimaFechaIngreso: "",
    ultimosPuntos: "",
    ultimaFechaIngresoGastar: "",
    ultimosPuntosGastar: ""
  };
  // Guarda el cliente en la base de datos de Firebase
  clientesRef
    .doc(cliente.clienteId)
    .set(cliente)
    .then(() => {
      const mensaje = "Cliente registrado con éxito.\nID: " + cliente.clienteId
      showmessage(mensaje, "success")
      // Oculta el contenedor del formulario
      hideElement(formulario);

      // Muestra el contenedor de éxito
      showElement(exito);

      // Estilos para el texto "Cliente registrado con éxito"
      document.getElementById('exito-texto').classList.add('exito-texto');

      // Estilos para el ID del cliente
      // Muestra el ID del cliente registrado
      document.getElementById('clienteId').textContent = 'ID: ' + cliente.clienteId;
    })
    .catch((error) => {
      console.error('Error al registrar el cliente: ', error);
      alert('Error al registrar el cliente. Por favor, inténtalo de nuevo.');
    })
});

// Función para limpiar las clases de validación de los campos
function clearValidationClasses() {
  const inputsText = signupForm.querySelectorAll('input[type="text"]');
  inputsText.forEach((campo) => {
    campo.classList.remove('is-valid', 'is-invalid', 'error');
  });
  document.getElementById('nacimiento').classList.remove('is-invalid', 'is-valid', 'error');
  document.getElementById('puntos').classList.remove('is-invalid', 'is-valid', 'error');
}

// Función para mostrar un mensaje de error en un campo específico
function showError(fieldId, errorMessage) {
  const field = document.getElementById(fieldId);
  field.classList.add('is-invalid', "error");
  showmessage(errorMessage, "error");
}

// Función para mostrar un elemento del DOM
function showElement(element) {
  element.style.display = 'block';
}

// Función para ocultar un elemento del DOM
function hideElement(element) {
  element.style.display = 'none';
}
