import { showmessage } from '../showmessage.js';
import { isValidDate } from '../validarFecha.js'
import { calcularPuntos, totalPuntos, nuevosPuntos, puntosActuales } from './agregarPuntos.js';
import { showError, hideError, validacionAgregarValid } from '../manageError.js';
import { auth, db, firebaseConfig } from '../firebase.js';
import { deleteUser } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

firebase.initializeApp(firebaseConfig);
const clientesRef = firebase.firestore().collection('clientes');

// Elementos del DOM
const buscarForm = document.getElementById("form-buscar");
const datosClienteContainer = document.getElementById('datosClienteContainer');
const botonesContainer = document.getElementById('botonesContainer');
//const puntosContainer = document.getElementById('puntos-container');
const datosAdicionales = document.getElementById('datosAdicionales');
const flecha = document.getElementById('flecha');
const buscarInput = document.getElementById('buscarClienteInput');

// Función para realizar búsqueda genérica de cliente
async function buscarCliente(campo, valor) {
  try {
    let querySnapshot;

    if (campo === 'nombre') {
      // 🔍 Buscar por nombreNormalizado Y por nombre
      const [res1, res2] = await Promise.all([
        clientesRef.where('nombreNormalizado', '==', valor.toLowerCase().trim()).get(),
        clientesRef.where('nombre', '==', valor).get()
      ]);

      const docsUnicos = new Map();
      res1.forEach(doc => docsUnicos.set(doc.id, doc));
      res2.forEach(doc => docsUnicos.set(doc.id, doc));

      const resultadosUnicos = Array.from(docsUnicos.values());

      if (resultadosUnicos.length === 0) {
        showError('buscarClienteInput', 'No se encontró ningún cliente', 'mensajeErrorBuscar', `Ningún cliente coincide con ese nombre.`);
        return;
      }

      if (resultadosUnicos.length > 1) {
        mostrarListaClientes({ forEach: cb => resultadosUnicos.forEach(cb) });
      } else {
        mostrarDatosCliente(resultadosUnicos[0]);
        mostrarBotones();
      }

      return; // Salimos de la función porque ya gestionamos la búsqueda
    }

    // Para búsquedas normales (ID, teléfono, etc.)
    querySnapshot = await clientesRef.where(campo, '==', valor).get();

    if (querySnapshot.empty) {
      const campoAmigable = obtenerDescripcionCampo(campo);
      console.log(`No se encontró ningún cliente con ese ${campoAmigable}: ${valor}`);
      showError(
        'buscarClienteInput',
        `No se encontró ningún cliente con ese ${campoAmigable}`,
        'mensajeErrorBuscar',
        'Verifica el dato o intenta con otro campo como correo, teléfono o nombre.'
      );
      return;
    }

    if (querySnapshot.size > 1) {
      mostrarListaClientes(querySnapshot);
    } else {
      mostrarDatosCliente(querySnapshot.docs[0]);
      mostrarBotones();
    }
  } catch (error) {
    console.error('Error buscando cliente:', error);
    showError('buscarClienteInput', 'Error al buscar cliente', 'mensajeErrorBuscar', `Ocurrió un error al buscar el cliente con el campo ${campoAmigable}.`);
  }
}

// Event listener para buscar al cliente
buscarForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const clienteId = buscarInput.value.trim();
  ocultarContenedores();
  limpiarLabels();
  hideError('buscarClienteInput', 'mensajeErrorBuscar')

  if (clienteId === '') {
    console.log("no hay nada en id")
    showError('buscarClienteInput', 'Error ingrese un valor', 'mensajeErrorBuscar', 'Busqueda vacia, ingrese un valor a buscar.')
    return;
  }
  buscarCliente('clienteId', clienteId);
});

// Evento para buscar por ID
document.getElementById('buscarPorIdBtn').addEventListener('click', () => {
  const valor = buscarInput.value.trim();
  ocultarContenedores();
  limpiarLabels();
  hideError('buscarClienteInput', 'mensajeErrorBuscar')
  if (!valor) {
    showError('buscarClienteInput',
      'Error ingrese un valor',
      'mensajeErrorBuscar',
      'Busqueda vacia, ingrese un valor a buscar.')
    return;
  }

  // Validar que sea un número y no contenga texto
  if (!/^\d+$/.test(valor)) {
    showError(
      'buscarClienteInput',
      'Error al buscar por Id',
      'mensajeErrorBuscar',
      'El ID debe ser un número válido, sin letras ni caracteres especiales.'
    );
    return;
  }
  buscarCliente('clienteId', valor);
});

// Evento para buscar por Teléfono
document.getElementById('buscarPorTelefonoBtn').addEventListener('click', () => {
  const valor = buscarInput.value.trim();
  ocultarContenedores();
  limpiarLabels();
  hideError('buscarClienteInput', 'mensajeErrorBuscar')
  // Verifica si el input está vacío o no tiene exactamente 10 dígitos
  if (!/^\d{10}$/.test(valor)) {
    showError('buscarClienteInput', 'Error al buscar por Teléfono', 'mensajeErrorBuscar', 'Ingresa un número telefonico válido de 10 dígitos.');
    return;
  }

  // Agrega el prefijo +52 al número ingresado
  const telefonoConPrefijo = `+52${valor}`;

  // Llama a la función genérica de búsqueda con el número formateado
  buscarCliente('telefono', telefonoConPrefijo);
});

// Evento para buscar por Correo
document.getElementById('buscarPorCorreoBtn').addEventListener('click', () => {
  const valor = buscarInput.value.trim();
  ocultarContenedores();
  limpiarLabels();
  hideError('buscarClienteInput', 'mensajeErrorBuscar')
  if (!/\S+@\S+\.\S+/.test(valor)) {
    showError('buscarClienteInput', 'Error al buscar por correo', 'mensajeErrorBuscar', 'Por favor, ingresa un correo válido.');
    return;
  }
  buscarCliente('email', valor);
});

// Evento para buscar por Nombre
document.getElementById('buscarPorNombreBtn').addEventListener('click', () => {
  let valor = buscarInput.value.trim();
  ocultarContenedores();
  limpiarLabels();
  hideError('buscarClienteInput', 'mensajeErrorBuscar');

  if (!valor) {
    showError('buscarClienteInput', 'Error al buscar por nombre', 'mensajeErrorBuscar', 'Por favor, ingresa un nombre válido.');
    return;
  }

  buscarCliente('nombre', valor);
});

// Función para mostrar los datos del cliente seleccionado
function mostrarDatosCliente(doc) {
  datosClienteContainer.style.display = 'block';
  const clienteData = doc.data();

  // Verificar que los elementos existan antes de usarlos
  const mapeoElementos = {
    clienteId: clienteData.clienteId,
    clientePuntos: clienteData.puntos,
    clienteNombre: clienteData.nombre,
    clienteAlcaldia: clienteData.alcaldia,
    clienteColonia: clienteData.colonia,
    clienteNacimiento: clienteData.nacimiento,
    clienteTelefono: clienteData.telefono,
    clienteEmail: clienteData.email,
    clienteUltimaFecha: clienteData.ultimaFechaIngreso,
    clienteUltimosPuntos: clienteData.ultimosPuntos,
    clienteUltimaFechaGastar: clienteData.ultimaFechaIngresoGastar,
    clienteUltimosPuntosGastar: clienteData.ultimosPuntosGastar,
    fechaRegistro: clienteData.fechaRegistro
      ? clienteData.fechaRegistro.toDate()
      : '',
  };

  // Actualizar los elementos del DOM si existen
  for (const [id, value] of Object.entries(mapeoElementos)) {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = value || 'N/A'; // Manejar valores vacíos o nulos
    }
  }
}

// Funciones para ocultar los contenedores
function ocultarContenedores() {
  const contenedores = [
    'datosClienteContainer',
    'puntos-container',
    'botonesContainer',
    'puntosContainer',
    'datosPuntosCliente',
    'gastar-container',
    'actualizarClienteContainer',
    'mensajeEliminarContainer',
    'mensajeErrorPuntosContainer',
    'mensajeErrorGastarContainer',
    'mensajeActualizarContainer',
    'listaClientes'
  ];

  contenedores.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.style.display = 'none';
    }
  });
}

// Función para mostrar el contenedor de botones
function mostrarBotones() {
  botonesContainer.style.display = 'block';
}

// Función para limpiar las etiquetas
function limpiarLabels() {
  // IDs de los elementos cuyos textos deben limpiarse
  const elementosTexto = [
    'puntosAgregados',
    'puntosAnteriores',
    'totalCompra'
  ];

  // IDs de los elementos que deben ocultarse
  const elementosOcultar = [
    'datosGastarCliente',
    'mensajeEliminarContainer',
    'mensajeErrorPuntos',
    'mensajeErrorGastarContainer',
    'mensajeActualizarContainer',
    'mensajeErrorBuscarTelefono'
  ];

  // Limpia los textos
  elementosTexto.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = '';
    }
  });

  // Oculta los elementos
  elementosOcultar.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.style.display = 'none';
    }
  });
}

// Obtener referencias a los botones
const btnAgregarPuntos = document.getElementById('ingresarPuntosBtn');
const btnCalcularPuntos = document.getElementById('calcularPuntosBtn');

// Agregar eventos a los botones
btnAgregarPuntos.addEventListener('click', agregarPuntos);
btnCalcularPuntos.addEventListener('click', async () => {
  // Llamar a la función calcularPuntos() y pasar clientesRef como argumento
  const puntosActualizados = await calcularPuntos(clientesRef);
  if (puntosActualizados) {
    document.getElementById('datosPuntosCliente').style.display = 'block';
    //limpiarLabels();
    hideError('puntos', 'mensajeErrorPuntos')
    document.getElementById('puntos').style.borderBlockColor = "green";

    document.getElementById('totalCompra').textContent = "$" + document.getElementById('puntos').value;
    document.getElementById('puntosAnteriores').textContent = puntosActuales;
    document.getElementById('puntosAgregados').textContent = nuevosPuntos;
    document.getElementById('clientePuntos').textContent = totalPuntos;

    //Muestra los puntos con los que Finaliza
    const puntosFinales = document.getElementById('puntosFinales');
    puntosFinales.style.color = "green";
    puntosFinales.textContent = ` ${totalPuntos} `;
    document.getElementById('puntosAgregar').style.color = "green"
    document.getElementById('puntosAgregar').textContent = ` ${totalPuntos} `;
  } else {
    // Valor inválido, muestra un mensaje de error
    showError('puntos', 'Número no valido.', 'mensajeErrorPuntos', 'Ingresa un valor numérico válido.')
  }
});

function agregarPuntos() {
  ocultarContenedores(); //Oculta contenedores y botones
  mostrarBotones(); //Muestra los botones

  //Muestra contenedor de puntos
  const agregarPuntosContainer = document.getElementById('puntos-container');
  agregarPuntosContainer.style.display = 'block';

  // Limpia el input de puntos
  const puntosInput = document.getElementById('puntos');
  puntosInput.value = '';

  //Muestra el ID del cliente
  const clienteId = document.getElementById('buscarClienteInput').value;
  document.getElementById('clienteIdAgregar').textContent = clienteId;

  const puntosCliente = parseInt(document.getElementById('clientePuntos').textContent);
  document.getElementById('puntosAgregar').textContent = puntosCliente;
}
const btnGastarPuntos = document.getElementById('gastarPuntosBtn')

btnGastarPuntos.addEventListener('click', () => {
  //Oculta contenedores y botones
  ocultarContenedores();

  //Muestra los botones
  mostrarBotones();

  limpiarLabels();


  // Muestra el contenedor para gastar puntos
  const gastarContainer = document.getElementById('gastar-container');
  gastarContainer.style.display = 'block';

  // Limpia el input de puntos
  const puntosGastar = document.getElementById('puntosGastar');
  puntosGastar.value = '';

  const clienteId = document.getElementById('buscarClienteInput').value;
  document.getElementById('IdGastar').textContent = clienteId;

  const puntosCliente = parseInt(document.getElementById('clientePuntos').textContent);
  document.getElementById('PuntosGastar').textContent = puntosCliente;
})

actualizarDatosClienteBtn.addEventListener('click', () => {
  // Oculta contenedores y botones
  ocultarContenedores();
  mostrarBotones();

  // Mostrar la sección de actualización del cliente
  document.getElementById("actualizarClienteContainer").style.display = "block";

  // Recuperar los datos del cliente desde el DOM
  const clienteId = document.getElementById('clienteId').textContent.trim();
  const clienteNombre = document.getElementById('clienteNombre').textContent.trim();
  const clienteAlcaldia = document.getElementById('clienteAlcaldia').textContent.trim();
  const clienteColonia = document.getElementById('clienteColonia').textContent.trim();
  const clienteNacimiento = document.getElementById('clienteNacimiento').textContent.trim();
  let clienteTelefono = document.getElementById('clienteTelefono').textContent.trim();
  const clienteEmail = document.getElementById('clienteEmail').textContent.trim();

  // Eliminar el prefijo +52 del número de teléfono si existe
  if (clienteTelefono.startsWith('+52')) {
    clienteTelefono = clienteTelefono.substring(3); // Remueve los primeros 3 caracteres
  }

  // Asignar los valores a los inputs del formulario
  document.getElementById('inputClienteId').value = clienteId || "";
  document.getElementById('inputClienteNombre').value = clienteNombre || "";
  document.getElementById('inputClienteAlcaldia').value = clienteAlcaldia || "";
  document.getElementById('inputClienteColonia').value = clienteColonia || "";
  document.getElementById('inputClienteNacimiento').value = clienteNacimiento || "";
  document.getElementById('inputClienteTelefono').value = clienteTelefono || "";
  document.getElementById('inputClienteEmail').value = clienteEmail || "";
});


async function eliminarCliente() {
  const clienteId = document.getElementById('clienteId').textContent;

  // Función para restablecer campos y estilos de los inputs
  const resetInputs = () => {
    const inputIds = ['buscarClienteInput', 'inputClienteNombre', 'inputClienteAlcaldia', 'inputClienteColonia', 'inputClienteNacimiento', 'inputClienteTelefono'];
    inputIds.forEach((id) => {
      const inputElement = document.getElementById(id);
      inputElement.value = '';
      inputElement.classList.remove('input-actualizado');
    });
  };

  // Función para mostrar mensaje de éxito
  const showSuccessMessage = () => {
    const mensajeLabelEliminar = document.createElement('label');
    mensajeLabelEliminar.textContent = 'Cliente eliminado con éxito';
    mensajeLabelEliminar.style.color = 'red';
    mensajeLabelEliminar.style.fontSize = '13px';

    const mensajeEliminarContainer = document.getElementById('mensajeEliminarContainer');
    mensajeEliminarContainer.innerHTML = '';
    mensajeEliminarContainer.appendChild(mensajeLabelEliminar);
    mensajeEliminarContainer.style.display = 'block';
  };

  if (!clienteId) {
    console.error("Error: ID del cliente no proporcionado.");
    return;
  }

  try {
    // Llamada a la función HTTP de Firebase
    const response = await fetch("https://us-central1-sistema-de-puntos.cloudfunctions.net/eliminarCliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clienteId }), // Enviando el ID en el formato correcto
    });

    if (!response.ok) {
      throw new Error("Error en la eliminación del cliente");
    }

    const data = await response.json();
    console.log("Cliente eliminado:", data.message);

    // Resetea los inputs y muestra mensaje de éxito
    resetInputs();
    //  showSuccessMessage();
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
  }
}

// Función para gastar los puntos
function gastarPuntos(clientesRef, puntosGastarValue) {
  const puntosGastarInput = document.getElementById('puntosGastar');
  const clienteId = document.getElementById('clienteId').textContent;
  const puntosCliente = parseInt(document.getElementById('clientePuntos').textContent);
  const puntosGastados = parseInt(puntosGastarValue);

  limpiarLabels();



  // Verificar que los puntos a gastar sean un valor numérico mayor que 0
  if (isNaN(puntosGastados) || puntosGastados <= 0) {
    showError('puntusGastar', 'Número no valido.', 'mensajeErrorGastar', 'Ingresa un valor numérico válido para los puntos a gastar.')
    //  mostrarMensajeError('Ingresa un valor numérico válido para los puntos a gastar.', 'puntosGastar', 'datosGastarCliente', 'mensajeErrorGastar', 'mensajeErrorGastarContainer', 'Número no valido.');
    return 0;
  }

  // Verificar que los puntos a gastar no excedan los 100 puntos por ticket
  if (puntosGastados > 100) {
    showError('puntusGastar', 'No puedes gastar más de 100 puntos por ticket.', 'mensajeErrorGastar', 'Operación no valida.')
    //  mostrarMensajeError('No puedes gastar más de 100 puntos por ticket.', 'puntosGastar', 'datosGastarCliente', 'mensajeErrorGastar', 'mensajeErrorGastarContainer', 'Operación no valida.');
    return 0;
  }

  // Verificar que el cliente tenga suficientes puntos para realizar la transacción
  if (puntosGastados <= puntosCliente) {
    const nuevosPuntos = puntosCliente - puntosGastados;
    const fechaActualGastar = new Date().toLocaleDateString();
    document.getElementById('datosGastarCliente').style.display = 'block';
    // Actualizar el campo "puntos" en la base de datos de Firebase
    clientesRef.doc(clienteId).update({
      puntos: nuevosPuntos,
      ultimaFechaIngresoGastar: fechaActualGastar,
      ultimosPuntosGastar: puntosGastados
    }).then(() => {
      // Actualizar la etiqueta p de puntos con los nuevos puntos
      document.getElementById('clientePuntos').textContent = nuevosPuntos;
      document.getElementById('PuntosGastar').textContent = nuevosPuntos;
      document.getElementById('puntosAnt').textContent = puntosCliente;

      // Mostrar los puntos a gastar y el total restante en el elemento <p>
      const puntosGast = document.getElementById('puntosGastados');
      puntosGast.style.color = 'red';
      puntosGast.textContent = ` ${puntosGastados}`;

      const totalSobrante = document.getElementById('totalSobrante');
      totalSobrante.style.color = 'green';
      totalSobrante.textContent = ` ${nuevosPuntos} `;

      // Limpiar el campo de puntos a gastar y mostrar bordes en verde
      puntosGastarInput.value = '';
      puntosGastarInput.classList.add('is-valid');

    }).catch((error) => {
      console.error('Error al actualizar los puntos en la base de datos:', error);
      showError('puntusGastar', 'Error al gastar puntos.', 'mensajeErrorGastar', 'Error al gastar los puntos. Por favor, inténtalo de nuevo.')
      //  mostrarMensajeError('Error al gastar los puntos. Por favor, inténtalo de nuevo.', 'puntosGastar', 'datosGastarCliente', 'mensajeErrorGastar', 'mensajeErrorGastarContainer', 'Error al gastar puntos.');
    });
  } else {
    showError('puntosGastar', 'Ingresa un número valido.', 'mensajeErrorGastar', 'No tienes puntos suficientes para realizar esta transacción.')
    //  mostrarMensajeError('No tienes puntos suficientes para realizar esta transacción.', 'puntosGastar', 'datosGastarCliente', 'mensajeErrorGastar', 'mensajeErrorGastarContainer', 'Ingresa un número valido.');
  }
}

// Mostrar mensaje de error
function mostrarMensajeError(mensaje, input, contenedorExito, label, contenedorLabel, mnesajeFlo) {
  showmessage(mnesajeFlo, "error")
  input = document.getElementById(input);
  input.classList.add('is-invalid', 'error');

  document.getElementById(contenedorExito).style.display = 'none';
  limpiarLabels();

  label = document.getElementById(label);
  document.getElementById(contenedorLabel).style.display = 'block';
  label.classList.add('mensaje-error');
  label.style.display = 'block';
  label.textContent = mensaje;

  // Eliminar clase "error" después de 1s
  setTimeout(() => {
    input.classList.remove('error');
  }, 1000);
}

// Evento click del botón
calcularGastoPuntosBtn.addEventListener('click', () => {
  const puntosGastarInput = document.getElementById('puntosGastar');
  const puntosGastarValue = parseInt(puntosGastarInput.value);

  gastarPuntos(clientesRef, puntosGastarValue);
});


botonActualizar.addEventListener('click', async () => {
  // Obtener los valores de los inputs
  const clienteId = document.getElementById('inputClienteId').value.trim();
  const nombre = document.getElementById('inputClienteNombre').value.trim();
  const alcaldia = document.getElementById('inputClienteAlcaldia').value.trim();
  const colonia = document.getElementById('inputClienteColonia').value.trim();
  const nacimiento = document.getElementById('inputClienteNacimiento').value.trim();
  let telefono = document.getElementById('inputClienteTelefono').value.trim();
  const email = document.getElementById('inputClienteEmail').value.trim();

  // Limpiar errores previos
  hideError('mensajeActualizar');
  // Validaciones
  let errores = false;

  if (!nombre) {
    showError('inputClienteNombre', 'Error', 'mensajeActualizar', 'El nombre es obligatorio.');
    errores = true;
  }
  if (!alcaldia) {
    showError('inputClienteAlcaldia', 'Error', 'mensajeActualizar', 'La alcaldía es obligatoria.');
    errores = true;
  }
  if (!colonia) {
    showError('inputClienteColonia', 'Error', 'mensajeActualizar', 'La colonia es obligatoria.');
    errores = true;
  }
  if (!isValidDate(nacimiento)) {
    showError('inputClienteNacimiento', 'Error', 'mensajeActualizar', 'La fecha de nacimiento es inválida.');
    errores = true;
  }
  if (telefono && !/^\d{10}$/.test(telefono)) {
    showError('inputClienteTelefono', 'Error', 'mensajeActualizar', 'El número de teléfono debe tener exactamente 10 dígitos y solo números.');
    errores = true;
  }
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    showError('inputClienteEmail', 'Error', 'mensajeActualizar', 'El correo electrónico no tiene un formato válido.');
    errores = true;
  }

  if (errores) return; // Si hay errores, no continuar

  try {
    // Agregar el prefijo +52 antes de guardar el número en la base de datos si no lo tiene
    if (telefono && !telefono.startsWith('+52')) {
      telefono = `+52${telefono}`;
    }

    // Validar si teléfono o email ya existen en otro cliente
    const telefonoSnapshot = telefono
      ? await clientesRef.where('telefono', '==', telefono).where('clienteId', '!=', clienteId).limit(1).get()
      : { size: 0 };

    const emailSnapshot = email
      ? await clientesRef.where('email', '==', email).where('clienteId', '!=', clienteId).limit(1).get()
      : { size: 0 };

    if (telefonoSnapshot.size > 0) {
      showError('inputClienteTelefono', 'Error', 'mensajeActualizar', 'El número de teléfono ya está registrado con otro cliente.');
      return;
    }

    if (emailSnapshot.size > 0) {
      showError('inputClienteEmail', 'Error', 'mensajeActualizar', 'El correo electrónico ya está registrado con otro cliente.');
      return;
    }

    // Construir objeto solo con los campos que deben actualizarse
    const datosActualizar = {};
    if (nombre) datosActualizar.nombre = nombre;
    if (alcaldia) datosActualizar.alcaldia = alcaldia;
    if (colonia) datosActualizar.colonia = colonia;
    if (nacimiento) datosActualizar.nacimiento = nacimiento;
    if (telefono) datosActualizar.telefono = telefono;
    if (email) datosActualizar.email = email;

    // Actualizar los datos en Firestore
    await clientesRef.doc(clienteId).update(datosActualizar);

    // Validar visualmente los campos como correctos
    validacionAgregarValid([
      'inputClienteId', 'inputClienteNombre', 'inputClienteAlcaldia',
      'inputClienteColonia', 'inputClienteNacimiento', 'inputClienteTelefono', 'inputClienteEmail'
    ]);

    // Mostrar éxito y limpiar errores previos
    hideError('mensajeActualizar');
    showmessage("Clliente actualizado Correctamente", "success")

    // 🔹 Obtener los datos actualizados del cliente
    const clienteActualizado = await clientesRef.doc(clienteId).get();

    // Oculta contenedores y botones
    ocultarContenedores();
    mostrarBotones();
    // 🔹 LIMPIAR INPUTS DESPUÉS DE ACTUALIZAR
    limpiarInputs(['inputClienteId', 'inputClienteNombre', 'inputClienteAlcaldia',
      'inputClienteColonia', 'inputClienteNacimiento', 'inputClienteTelefono', 'inputClienteEmail']);
    if (clienteActualizado.exists) {
      mostrarDatosCliente(clienteActualizado); // Mostrar los datos actualizados en pantalla
    } else {
      showError('mensajeActualizar', 'Error', 'mensajeActualizar', 'No se pudieron recuperar los datos actualizados.');
    }
  } catch (error) {
    console.error('Error al actualizar los datos del cliente:', error);
    showError('inputClienteId', 'Error', 'mensajeActualizar', 'Hubo un error al actualizar el cliente. Inténtalo de nuevo.');
  }
});
function limpiarInputs(inputIds) {
  inputIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = ''; // Limpiar el valor
      input.classList.remove('is-valid', 'is-invalid'); // Quitar clases de validación
    }
  });
}

// Obtener referencia a la ventana emergente de confirmación
const confirmacionPopup = document.getElementById('confirmacionPopup');

// Obtener referencia a los botones dentro de la ventana emergente
const confirmarBtn = document.getElementById('confirmarBtn');
const cancelarBtn = document.getElementById('cancelarBtn');

// Event listener para el botón de eliminar cliente
eliminarClienteBtn.addEventListener('click', () => {
  // Mostrar la ventana emergente de confirmación
  confirmacionPopup.style.display = 'block';
});

// Event listener para el botón de confirmar
confirmarBtn.addEventListener('click', () => {
  // Ocultar la ventana emergente de confirmación
  confirmacionPopup.style.display = 'none';
  eliminarCliente(); // Eliminar cliente si el usuario confirma
});

// Event listener para el botón de cancelar
cancelarBtn.addEventListener('click', () => {
  // Ocultar la ventana emergente de confirmación si el usuario cancela
  confirmacionPopup.style.display = 'none';
});

// Agregar un evento click al elemento con clase "cliente-nombre"
document.querySelector('.cliente-nombre').addEventListener('click', () => {
  // Toggle la clase "active" para mostrar u ocultar los datos adicionales
  datosAdicionales.classList.toggle('active');
  // Cambiar la dirección de la flecha
  if (datosAdicionales.classList.contains('active')) {
    flecha.classList.replace('fa-chevron-down', 'fa-chevron-up');
  } else {
    flecha.classList.replace('fa-chevron-up', 'fa-chevron-down');
  }
});

// Función para mostrar el mensaje de éxito o error y aplicar las clases de validación
const showValidationAndMessage = (element, isValid, successMessage, errorMessage) => {
  element.classList.remove('is-valid', 'is-invalid');
  element.classList.add(isValid ? 'is-valid' : 'is-invalid');
  const mensajeExitoActualizar = document.getElementById('mensajeActualizar');
  document.getElementById('mensajeActualizarContainer').style.display = 'block';
  mensajeExitoActualizar.classList.remove('mensaje-exito', 'mensaje-error');
  mensajeExitoActualizar.classList.add(isValid ? 'mensaje-exito' : 'mensaje-error');
  mensajeExitoActualizar.style.display = 'block';
  mensajeExitoActualizar.textContent = isValid ? successMessage : errorMessage;
};

// Función auxiliar para obtener una descripción amigable del campo
function obtenerDescripcionCampo(campo) {
  switch (campo) {
    case 'telefono':
      return 'número de TELEFONO';
    case 'nombre':
      return 'NOMBRE';
    case 'email':
      return 'CORREO ELECTRÓNICO';
    case 'clienteId':
      return 'ID';
    default:
      return 'campo';
  }
}

// Función para mostrar una lista de clientes encontrados
function mostrarListaClientes(querySnapshot) {
  const contenedor = document.getElementById('clientesResultados'); // Contenedor para los resultados
  contenedor.innerHTML = ''; // Limpiar contenido previo

  querySnapshot.forEach((doc) => {
    const clienteData = doc.data();

    // Crear un elemento para cada cliente
    const clienteElemento = document.createElement('div');
    clienteElemento.classList.add('cliente-item'); // Clase opcional para estilos
    clienteElemento.style.border = '1px solid #ccc';
    clienteElemento.style.margin = '10px';
    clienteElemento.style.padding = '10px';

    clienteElemento.innerHTML = `
    <p><strong>Nombre:</strong> ${clienteData.nombre || 'No disponible'}</p>
    <p><strong>ID:</strong> ${clienteData.clienteId || 'No disponible'}</p>
    <p><strong>Teléfono:</strong> ${clienteData.telefono || 'No disponible'}</p>
    <p><strong>Correo:</strong> ${clienteData.email || 'No disponible'}</p>
    <p><strong>Fecha Registro:</strong> ${clienteData.fechaRegistro
        ? clienteData.fechaRegistro.toDate().toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        : 'No disponible'
      }</p>
    <button class="seleccionar-btn btn btn-primary" data-id="${doc.id}">Seleccionar</button>
  `;


    contenedor.appendChild(clienteElemento);
  });

  // Mostrar el contenedor del listado
  document.getElementById('listaClientes').style.display = 'block';

  // Agregar eventos a los botones "Seleccionar"
  document.querySelectorAll('.seleccionar-btn').forEach((boton) => {
    boton.addEventListener('click', (e) => {
      ocultarContenedores();
      const clienteId = e.target.getAttribute('data-id'); // Obtener el ID del documento
      seleccionarCliente(clienteId); // Pasar el ID a la función de selección
    });
  });
}

function seleccionarCliente(clienteId) {
  clientesRef
    .doc(clienteId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        mostrarDatosCliente(doc); // Mostrar los datos del cliente
        mostrarBotones()
        // Ocultar el listado y mostrar los datos individuales
        document.getElementById('listaClientes').style.display = 'none';
        document.getElementById('datosClienteContainer').style.display = 'block';
      } else {
        console.error('Cliente no encontrado.');
        showError('buscarClienteInput', 'Error cliente no encontrado', 'mensajeErrorBuscar', 'Cliente no encontrado.');
      }
    })
    .catch((error) => {
      console.error('Error al obtener el cliente:', error);
      showError('buscarClienteInput', 'Error al buscar cliente', 'mensajeErrorBuscar', 'Ocurrió un error al buscar el cliente.');
    });
}

