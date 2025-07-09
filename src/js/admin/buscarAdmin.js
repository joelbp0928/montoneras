import { showmessage } from '../showmessage.js';
import { isValidDate, convertirFechaParaInput, formatearFechaNacimiento } from '../validarFecha.js'
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

// Importar módulos adicionales para Supabase
import { supabase } from '../config-supabase.js';

// Función para determinar dónde buscar basado en el ID
function determinarFuenteBusqueda(valor) {
  // Si es búsqueda por ID numérico
  if (/^\d+$/.test(valor)) {
    const id = parseInt(valor);
    return id >= 3000 ? 'supabase' : 'firebase';
  }
  // Para otros campos (nombre, teléfono, email) buscar en ambos
  return 'ambos';
}

// Función modificada para buscar cliente
async function buscarCliente(campo, valor) {
  try {
    const fuente = determinarFuenteBusqueda(valor);
    let resultados = [];

    // Buscar en Firebase si corresponde
    if (fuente === 'firebase' || fuente === 'ambos') {
      const firebaseResults = await buscarEnFirebase(campo, valor);
      resultados = resultados.concat(firebaseResults);
    }

    // Buscar en Supabase si corresponde
    if (fuente === 'supabase' || fuente === 'ambos') {
      const supabaseResults = await buscarEnSupabase(campo, valor);
      // Marcar los resultados como de Supabase
      const resultadosSupabase = supabaseResults.map(item => ({
        ...item,
        _fuente: 'supabase'
      }));
      resultados = resultados.concat(resultadosSupabase);
    }

    // Manejar los resultados
    if (resultados.length === 0) {
      mostrarErrorNoEncontrado(campo, valor);
      return;
    }

    if (resultados.length > 1) {
      mostrarListaClientes(resultados);
    } else {
      mostrarDatosCliente(resultados[0]);
      mostrarBotones();
    }
  } catch (error) {
    console.error('Error buscando cliente:', error);
    showError('buscarClienteInput', 'Error al buscar cliente', 'mensajeErrorBuscar', `Ocurrió un error al buscar el cliente.`);
  }
}

// Función para buscar en Firebase
async function buscarEnFirebase(campo, valor) {
  let querySnapshot;

  if (campo === 'nombre') {
    const [res1, res2] = await Promise.all([
      clientesRef.where('nombreNormalizado', '==', valor.toLowerCase().trim()).get(),
      clientesRef.where('nombre', '==', valor).get()
    ]);

    const docsUnicos = new Map();
    res1.forEach(doc => docsUnicos.set(doc.id, doc));
    res2.forEach(doc => docsUnicos.set(doc.id, doc));

    return Array.from(docsUnicos.values());
  }

  querySnapshot = await clientesRef.where(campo, '==', valor).get();
  return querySnapshot.docs;
}

// Función para buscar en Supabase
async function buscarEnSupabase(campo, valor) {
  let query = supabase.from('clientes').select('*');

  // Mapear nombres de campos diferentes entre Firebase y Supabase
  const campoMapeado = {
    'clienteId': 'cliente_id',
    'puntos': 'puntos_actuales',
    'nombreNormalizado': 'nombre_normalizado'
  }[campo] || campo;

  if (campo === 'nombre') {
    query = query.ilike('nombre', `%${valor}%`);
  } else {
    query = query.eq(campoMapeado, valor);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Devolver los datos directamente sin envolverlos
  return data;
}

// Función para mostrar error cuando no se encuentra cliente
function mostrarErrorNoEncontrado(campo, valor) {
  const campoAmigable = obtenerDescripcionCampo(campo);
  showError(
    'buscarClienteInput',
    `No se encontró ningún cliente con ese ${campoAmigable}`,
    'mensajeErrorBuscar',
    'Verifica el dato o intenta con otro campo como correo, teléfono o nombre.'
  );
}

// Event listener para buscar al cliente
buscarForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const clienteId = buscarInput.value.trim();
  ocultarContenedores();
  limpiarLabels();
  hideError('buscarClienteInput', 'mensajeErrorBuscar')

  if (clienteId === '') {
    console.error('El campo de búsqueda está vacío.');
    showError('buscarClienteInput', 'ingrese un valor', 'mensajeErrorBuscar', 'Busqueda vacia, ingrese un valor a buscar.');
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

// Función para formatear la fecha de Supabase
function formatearFechaSupabase(fechaString) {
  if (!fechaString) return 'N/A';

  try {
    const fecha = new Date(fechaString);

    if (isNaN(fecha.getTime())) {
      console.warn('Fecha inválida:', fechaString);
      return 'N/A';
    }

    // Opciones de formato para fecha y hora
    const opcionesFecha = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };

    const opcionesHora = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    const fechaFormateada = fecha.toLocaleDateString('es-MX', opcionesFecha);
    const horaFormateada = fecha.toLocaleTimeString('es-MX', opcionesHora);

    return `${fechaFormateada} ${horaFormateada}`;
  } catch (error) {
    console.error('Error formateando fecha:', error, 'Fecha original:', fechaString);
    return 'N/A';
  }
}

// Función para mostrar los datos del cliente seleccionado
function mostrarDatosCliente(doc) {
  datosClienteContainer.style.display = 'block';

  // Determinar la fuente real basada en la estructura del objeto
  let fuente;
  let clienteData;

  if (doc._firestore) {
    // Es un documento de Firebase directamente
    fuente = 'firebase';
    clienteData = doc.data();
  } else if (doc.data && typeof doc.data === 'function') {
    // Fue formateado para parecer Firebase (resultado de buscarEnSupabase)
    fuente = 'supabase';
    clienteData = doc.data();
  } else {
    // Es un objeto plano de Supabase
    fuente = 'supabase';
    clienteData = doc;
  }

  // Obtener ID del cliente según la fuente
  const idCliente = fuente === 'firebase' ?
    (doc.id || clienteData.clienteId) :
    (clienteData.cliente_id || clienteData.clienteId);

  // Verificar consistencia de la fuente con el ID
  const idNumerico = parseInt(idCliente);
  if ((idNumerico >= 3000 && fuente === 'firebase') ||
    (idNumerico < 3000 && fuente === 'supabase')) {
    console.warn(`Inconsistencia: ID ${idCliente} no coincide con fuente ${fuente}`);
    fuente = idNumerico >= 3000 ? 'supabase' : 'firebase';
    console.log("Fuente corregida:", fuente);
  }

  // Función para formatear fechas según la fuente
  const formatearFecha = (fecha, esFirebase = false) => {
    if (!fecha) return 'N/A';

    try {
      if (esFirebase) {
        return fecha.toDate ?
          fecha.toDate().toLocaleString('es-MX') :
          new Date(fecha).toLocaleString('es-MX');
      }
      return formatearFechaSupabase(fecha);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'N/A';
    }
  };

  // Mapeo de campos según la fuente
  const mapeoElementos = {
    clienteId: idCliente,
    clientePuntos: fuente === 'firebase' ?
      clienteData.puntos :
      clienteData.puntos_actuales,
    clienteNombre: clienteData.nombre,
    clienteAlcaldia: clienteData.alcaldia,
    clienteColonia: clienteData.colonia,
    clienteNacimiento: formatearFechaNacimiento(clienteData.nacimiento),
    clienteTelefono: clienteData.telefono,
    clienteEmail: clienteData.email,
    clienteUltimaFecha: formatearFecha(
      fuente === 'firebase' ?
        clienteData.ultimaFechaIngreso :
        clienteData.ultima_actualizacion,
      fuente === 'firebase'
    ),
    clienteUltimosPuntos: fuente === 'firebase' ?
      clienteData.ultimosPuntos :
      clienteData.ultimos_puntos,
    clienteUltimaFechaGastar: formatearFecha(
      fuente === 'firebase' ?
        clienteData.ultimaFechaIngresoGastar :
        clienteData.ultima_fecha_ingreso_gastar,
      fuente === 'firebase'
    ),
    clienteUltimosPuntosGastar: fuente === 'firebase' ?
      clienteData.ultimosPuntosGastar :
      clienteData.ultimos_puntos_gastar,
    fechaRegistro: formatearFecha(
      clienteData.fechaRegistro,
      fuente === 'firebase'
    )
  };

  // Actualizar la UI
  for (const [id, value] of Object.entries(mapeoElementos)) {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = value || 'N/A';
    }
  }

  // Guardar referencia al cliente
  sessionStorage.setItem('clienteActual', JSON.stringify({
    id: idCliente,
    fuente: fuente,
    data: clienteData
  }));
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
  const totalCompra = parseFloat(document.getElementById('puntos').value);

  if (isNaN(totalCompra)) {
    showError('puntos', 'Número no válido.', 'mensajeErrorPuntos', 'Ingresa un valor numérico válido.');
    return;
  }

  try {
    // Calcular puntos a agregar (1 punto por cada $10)
    const puntosAAgregar = Math.floor(totalCompra / 10);

    // Obtener cliente actual desde sessionStorage
    const clienteActual = JSON.parse(sessionStorage.getItem('clienteActual'));
    if (!clienteActual) {
      throw new Error("No se encontró información del cliente actual");
    }

    // Actualizar puntos según la fuente (Firebase o Supabase)
    const nuevosPuntos = await actualizarPuntosCliente(
      clienteActual.id,
      clienteActual.fuente,
      puntosAAgregar
    );

    // Actualizar UI
    document.getElementById('datosPuntosCliente').style.display = 'block';
    hideError('puntos', 'mensajeErrorPuntos');
    document.getElementById('puntos').style.borderBlockColor = "green";

    document.getElementById('totalCompra').textContent = "$" + totalCompra.toFixed(2);
    document.getElementById('puntosAnteriores').textContent = clienteActual.data.puntos || clienteActual.data.puntos_actuales;
    document.getElementById('puntosAgregados').textContent = puntosAAgregar;
    document.getElementById('clientePuntos').textContent = nuevosPuntos;

    // Actualizar puntos finales
    const puntosFinales = document.getElementById('puntosFinales');
    puntosFinales.style.color = "green";
    puntosFinales.textContent = ` ${nuevosPuntos} `;
    document.getElementById('puntosAgregar').style.color = "green";
    document.getElementById('puntosAgregar').textContent = ` ${nuevosPuntos} `;

    // Actualizar datos en sessionStorage
    clienteActual.data.puntos = nuevosPuntos;
    clienteActual.data.puntos_actuales = nuevosPuntos;
    sessionStorage.setItem('clienteActual', JSON.stringify(clienteActual));

    showmessage("Puntos actualizados correctamente", "success");
  } catch (error) {
    console.error("Error al actualizar puntos:", error);
    showError('puntos', 'Error al actualizar puntos.', 'mensajeErrorPuntos', "Error al actualizar puntos." || 'Ocurrió un error al actualizar los puntos');
  }
});

async function actualizarPuntosCliente(clienteId, fuente, puntosAAgregar) {
  const fechaActual = new Date().toISOString();
  console.log("Actualizando puntos para el cliente:", clienteId, "Fuente:", fuente, "Puntos a agregar:", puntosAAgregar);
  try {
    if (fuente === 'firebase') {
      // Actualizar en Firebase
      const clienteRef = clientesRef.doc(clienteId);
      const doc = await clienteRef.get();

      if (!doc.exists) {
        throw new Error("Cliente no encontrado en Firebase");
      }

      const puntosActuales = doc.data().puntos || 0;
      const nuevosPuntos = puntosActuales + puntosAAgregar;

      await clienteRef.update({
        puntos: nuevosPuntos,
        ultimaFechaIngreso: firebase.firestore.Timestamp.now(),
        ultimosPuntos: puntosAAgregar
      });

      return nuevosPuntos;
    } else {
      // Actualizar en Supabase
      // Usar la función RPC para actualizar puntos e historial
      const { data: nuevosPuntos, error } = await supabase
        .rpc('actualizar_puntos', {
          p_cliente_id: clienteId,
          p_puntos_cambio: puntosAAgregar,
          p_tipo_operacion: 'acumulacion',
        });

      if (error) throw error;

      return nuevosPuntos;
    }
  } catch (error) {
    console.error("Error en actualizarPuntosCliente:", error);
    throw error; // Re-lanzar el error para manejarlo en el llamador
  }
}

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

  // Asignar los valores a los inputs del formulario
  document.getElementById('inputClienteId').value = clienteId || "";
  document.getElementById('inputClienteNombre').value = clienteNombre || "";
  document.getElementById('inputClienteAlcaldia').value = clienteAlcaldia || "";
  document.getElementById('inputClienteColonia').value = clienteColonia || "";
  document.getElementById('inputClienteNacimiento').value = convertirFechaParaInput(clienteNacimiento) || "";
  document.getElementById('inputClienteTelefono').value = clienteTelefono || "";
  document.getElementById('inputClienteEmail').value = clienteEmail || "";
});

// Función para actualizar los datos del cliente
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
async function gastarPuntos(puntosGastados) {
  const puntosGastarInput = document.getElementById('puntosGastar');
  const clienteActual = JSON.parse(sessionStorage.getItem('clienteActual'));

  if (!clienteActual) {
    showError('puntosGastar', 'Error interno', 'mensajeErrorGastar', 'Cliente no encontrado.');
    return;
  }

  const puntosCliente = clienteActual.data.puntos || clienteActual.data.puntos_actuales;

  limpiarLabels();

  // Validaciones
  if (isNaN(puntosGastados) || puntosGastados <= 0) {
    showError('puntosGastar', 'Número no válido', 'mensajeErrorGastar', 'Ingresa un número mayor que cero.');
    return;
  }

  if (puntosGastados > 100) {
    showError('puntosGastar', 'Máximo 100 puntos por ticket', 'mensajeErrorGastar', 'Reduce los puntos a gastar.');
    return;
  }

  if (puntosGastados > puntosCliente) {
    showError('puntosGastar', 'Puntos insuficientes', 'mensajeErrorGastar', 'No tienes puntos suficientes.');
    return;
  }

  try {
    const nuevosPuntos = await gastarPuntosCliente(clienteActual.id, clienteActual.fuente, puntosGastados);

    document.getElementById('datosGastarCliente').style.display = 'block';
    document.getElementById('clientePuntos').textContent = nuevosPuntos;
    document.getElementById('PuntosGastar').textContent = nuevosPuntos;
    document.getElementById('puntosAnt').textContent = puntosCliente;
    document.getElementById('puntosGastados').textContent = ` ${puntosGastados}`;
    document.getElementById('totalSobrante').textContent = ` ${nuevosPuntos}`;

    // Marcar input como válido
    puntosGastarInput.classList.add('is-valid');
    puntosGastarInput.value = '';

    // Actualizar en sessionStorage
    clienteActual.data.puntos = nuevosPuntos;
    clienteActual.data.puntos_actuales = nuevosPuntos;
    sessionStorage.setItem('clienteActual', JSON.stringify(clienteActual));
  } catch (error) {
    showError('puntosGastar', 'Ocurrió un error al procesar la solicitud.', 'mensajeErrorGastar', 'Error al gastar puntos.');
  }
}

async function gastarPuntosCliente(clienteId, fuente, puntosAGastar) {
  try {
    if (fuente === 'firebase') {
      const clienteRef = clientesRef.doc(clienteId);
      const doc = await clienteRef.get();

      if (!doc.exists) {
        throw new Error("Cliente no encontrado en Firebase");
      }

      const data = doc.data();
      const puntosActuales = data.puntos || 0;
      const nuevosPuntos = puntosActuales - puntosAGastar;

      if (nuevosPuntos < 0) throw new Error("No tiene suficientes puntos");

      await clienteRef.update({
        puntos: nuevosPuntos,
        ultimaFechaIngresoGastar: firebase.firestore.Timestamp.now(),
        ultimosPuntosGastar: puntosAGastar
      });

      return nuevosPuntos;

    } else {
      // Llama a función RPC en Supabase
      const { data: nuevosPuntos, error } = await supabase
        .rpc('actualizar_puntos', {
          p_cliente_id: clienteId,
          p_puntos_cambio: puntosAGastar,
          p_tipo_operacion: 'canje'
        });


      if (error) throw error;
      return nuevosPuntos;
    }
  } catch (error) {
    console.error("Error al gastar puntos:", error);
    throw error;
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

  gastarPuntos(puntosGastarValue);
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
    showError('inputClienteNombre', 'Error nombre', 'mensajeActualizar', 'El nombre es obligatorio.');
    errores = true;
  }
  if (!alcaldia) {
    showError('inputClienteAlcaldia', 'Error alcaldia', 'mensajeActualizar', 'La alcaldía es obligatoria.');
    errores = true;
  }
  if (!colonia) {
    showError('inputClienteColonia', 'Error colonia', 'mensajeActualizar', 'La colonia es obligatoria.');
    errores = true;
  }
  if (!isValidDate(nacimiento)) {
    showError('inputClienteNacimiento', 'Error nacimiento', 'mensajeActualizar', 'La fecha de nacimiento es inválida.');
    errores = true;
  }
  if (telefono && !/^\d{10}$/.test(telefono)) {
    showError('inputClienteTelefono', 'Error telefono', 'mensajeActualizar', 'El número de teléfono debe tener exactamente 10 dígitos y solo números.');
    errores = true;
  }
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    showError('inputClienteEmail', 'Error mail', 'mensajeActualizar', 'El correo electrónico no tiene un formato válido.');
    errores = true;
  }

  if (errores) return; // Si hay errores, no continuar

  try {
    // Validar si teléfono o email ya existen en otro cliente
    const telefonoSnapshot = telefono
      ? await clientesRef.where('telefono', '==', telefono).where('clienteId', '!=', clienteId).limit(1).get()
      : { size: 0 };

    const emailSnapshot = email
      ? await clientesRef.where('email', '==', email).where('clienteId', '!=', clienteId).limit(1).get()
      : { size: 0 };

    if (telefonoSnapshot.size > 0) {
      showError('inputClienteTelefono', 'Error telefono', 'mensajeActualizar', 'El número de teléfono ya está registrado con otro cliente.');
      return;
    }

    if (emailSnapshot.size > 0) {
      showError('inputClienteEmail', 'Error mail', 'mensajeActualizar', 'El correo electrónico ya está registrado con otro cliente.');
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
    const clienteActual = JSON.parse(sessionStorage.getItem("clienteActual"));
    const fuente = clienteActual?.fuente || (parseInt(clienteId) >= 3000 ? "supabase" : "firebase");

    if (fuente === "firebase") {
      await clientesRef.doc(clienteId).update(datosActualizar);
    } else {
      const { error } = await supabase
        .from("clientes")
        .update(datosActualizar)
        .eq("cliente_id", clienteId);

      if (error) {
        throw new Error("Error al actualizar cliente en Supabase: " + error.message);
      }
    }

    // Validar visualmente los campos como correctos
    validacionAgregarValid([
      'inputClienteId', 'inputClienteNombre', 'inputClienteAlcaldia',
      'inputClienteColonia', 'inputClienteNacimiento', 'inputClienteTelefono', 'inputClienteEmail'
    ]);

    // Mostrar éxito y limpiar errores previos
    hideError('mensajeActualizar');
    showmessage("Clliente actualizado Correctamente", "success")

    // 🔹 Obtener los datos actualizados del cliente
    let clienteActualizado;
    if (fuente === "firebase") {
      clienteActualizado = await clientesRef.doc(clienteId).get();
    } else {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("cliente_id", clienteId)
        .single();

      if (error || !data) {
        throw new Error("Error al obtener cliente actualizado desde Supabase");
      }

      clienteActualizado = data;
    }

    // Oculta contenedores y botones
    ocultarContenedores();
    mostrarBotones();
    // 🔹 LIMPIAR INPUTS DESPUÉS DE ACTUALIZAR
    limpiarInputs(['inputClienteId', 'inputClienteNombre', 'inputClienteAlcaldia',
      'inputClienteColonia', 'inputClienteNacimiento', 'inputClienteTelefono', 'inputClienteEmail']);
    if ((fuente === "firebase" && clienteActualizado.exists) || (fuente === "supabase" && clienteActualizado)) {
      mostrarDatosCliente(clienteActualizado);
    } else {
      showError('mensajeActualizar', 'Error al recuperar datos', 'mensajeActualizar', 'No se pudieron recuperar los datos actualizados.');
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
function mostrarListaClientes(resultados) {
  const contenedor = document.getElementById('clientesResultados');
  contenedor.innerHTML = '';

  resultados.forEach((clienteData) => {
    const clienteElemento = document.createElement('div');
    clienteElemento.classList.add('cliente-item');

    // Determinar si es de Firebase o Supabase
    const esFirebase = clienteData._firestore !== undefined;
    const idCliente = esFirebase ? clienteData.id : clienteData.cliente_id;
    const fuente = esFirebase ? 'firebase' : 'supabase';

    clienteElemento.innerHTML = `
      <p><strong>Nombre:</strong> ${clienteData.nombre || 'No disponible'}</p>
      <p><strong>ID:</strong> ${idCliente || 'No disponible'}</p>
      <p><strong>Teléfono:</strong> ${clienteData.telefono || 'No disponible'}</p>
      <p><strong>Correo:</strong> ${clienteData.email || 'No disponible'}</p>
      <p><strong>Fuente:</strong> ${fuente}</p>
      <button class="seleccionar-btn btn btn-primary" data-id="${idCliente}" data-fuente="${fuente}">Seleccionar</button>
    `;

    contenedor.appendChild(clienteElemento);
  });

  document.getElementById('listaClientes').style.display = 'block';

  // Agregar eventos a los botones
  document.querySelectorAll('.seleccionar-btn').forEach((boton) => {
    boton.addEventListener('click', (e) => {
      const clienteId = e.target.getAttribute('data-id');
      const fuente = e.target.getAttribute('data-fuente');

      // Encontrar el cliente seleccionado
      const clienteSeleccionado = resultados.find(c =>
        (fuente === 'firebase' && c.id === clienteId) ||
        (fuente === 'supabase' && c.cliente_id === clienteId)
      );

      if (clienteSeleccionado) {
        ocultarContenedores();
        mostrarDatosCliente(clienteSeleccionado);
        mostrarBotones();
      }
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

