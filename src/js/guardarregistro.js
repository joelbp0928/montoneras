// Importa y configura Firebase
import { showmessage } from "./showmessage.js";
import { firebaseConfig } from './firebase.js';
import { isValidDate } from './validarFecha.js'
import { getLastClientId } from "./ultimoId.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js"
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getFirestore, collection, orderBy, limit, addDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

// Inicializa la aplicación de Firebase
firebase.initializeApp(firebaseConfig);

// Obtén una referencia a la colección de clientes en Firestore
const clientesRef = firebase.firestore().collection('clientes');

// Función para guardar el registro del cliente
export async function guardarregistro(email, auth, password) {
    // Deshabilitar el botón de registro para evitar clics múltiples durante el registro
    const registroButton = document.getElementById('registroButton');
    registroButton.disabled = true;

    try {
        // Obtén el último valor de clienteId de la base de datos
        /*  const querySnapshot = await clientesRef.orderBy('clienteId', 'desc').limit(1).get();
          let ultimoId = 0;
          querySnapshot.forEach((doc) => {
              ultimoId = parseInt(doc.data().clienteId);
          });
  
          // Incrementa el ID para el nuevo cliente
          const nuevoId = ultimoId + 1;*/
        // Obtén el último valor de clienteId de la base de datos
        const ultimoId = await getLastClientId(clientesRef);
        // Incrementa el ID
        const nuevoId = ultimoId + 1;

        // Obtén los datos del formulario de registro
        const nombre = document.getElementById('nombre').value;
        let telefono = document.getElementById('telefonoRegistro').value;
        const alcaldia = document.getElementById('alcaldia').value;
        const colonia = document.getElementById('colonia').value;
        const nacimiento = document.getElementById('nacimiento').value;

        // Realiza las validaciones
        // Verificar si el número de teléfono tiene el prefijo "+52", si no lo tiene, agregarlo
        telefono = telefono.startsWith("+52") ? telefono : "+52" + telefono;

        const fechaValida = isValidDate(nacimiento);

        // Remueve cualquier clase de error o validación previa en los campos del formulario
        const campos = document.querySelectorAll('.input-text, .input-date');
        campos.forEach((campo) => {
            campo.classList.remove('is-invalid', 'error', 'is-valid');
        });

        // Verifica las validaciones y muestra los errores o aplica validaciones
        if (!nombre || !telefono || !alcaldia || !colonia || !fechaValida) {
            // Mostrar mensajes de error y habilitar nuevamente el botón de registro
            showErrorMessage(nombre, telefonoValido, alcaldia, colonia, fechaValida);
            registroButton.disabled = false;
            return false;
        }

        // Aplica la clase de validación a los campos del formulario
        document.getElementById('telefonoRegistro').classList.add('is-valid');
        document.getElementById('alcaldia').classList.add('is-valid');
        document.getElementById('colonia').classList.add('is-valid');
        document.getElementById('nacimiento').classList.add('is-valid');

        //  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        //  const clienteUid = userCredential.user.uid;
        // Crea el objeto cliente con el nuevo ID y los datos del formulario
        const cliente = {
            clienteId: nuevoId.toString(),
            //    clienteUid: clienteUid,
            nombre: nombre,
            telefono: telefono,
            email: email,
            alcaldia: alcaldia,
            colonia: colonia,
            nacimiento: nacimiento,
            puntos: 0,
            fechaRegistro: firebase.firestore.Timestamp.now(), // Agrega la fecha y hora de registro
            ultimaFechaIngreso: "",
            ultimosPuntos: "",
            ultimaFechaIngresoGastar: "",
            ultimosPuntosGastar: ""
        };

        // Guarda el cliente en la base de datos de Firestore
        await clientesRef.doc(cliente.clienteId).set(cliente);

        // Borrar el contenido de los formularios después del registro exitoso
        resetFormFields()

        // Habilitar nuevamente el botón de registro después de completar el registro
        //  registroButton.disabled = false;

        // Mostrar mensaje de éxito
        showmessage("Registro exitoso", "success");
        showNumCliente(nuevoId)
        // Aquí ya sabemos que el registro fue exitoso, así que retornamos true
        return true;
    } catch (error) {
        // Habilitar nuevamente el botón de registro después de completar el registro
        registroButton.disabled = false;
        console.error('Error al registrar el cliente: ', error);
        showmessage('Error al registrar el cliente. Por favor, inténtalo de nuevo.', "error");
        return false;
    }
}

export function showNumCliente(nuevoId){
    return nuevoId.toString();
}

// Función para mostrar los mensajes de error en el formulario
function showErrorMessage(nombre, telefonoValido, alcaldia, colonia, fechaValida) {
    if (!nombre) document.getElementById('nombre').classList.add('error')
    else document.getElementById('nombre').classList.remove('error');

    if (!telefonoValido) {
        document.getElementById('telefonoRegistro').classList.add('error');
        showmessage("Error en Teléfono: ingrese (+52 10 dígitos) todo junto", "error");
    } else document.getElementById('telefonoRegistro').classList.remove('error');
    if (!alcaldia) document.getElementById('alcaldia').classList.add('error');
    else document.getElementById('alcaldia').classList.remove('error');

    if (!colonia) document.getElementById('colonia').classList.add('error');
    else document.getElementById('colonia').classList.remove('error');

    if (!fechaValida) {
        document.getElementById('nacimiento').classList.add('error');
        showmessage("Error en fecha de nacimiento. Ingrese una fecha valida", "error")
    } else document.getElementById('nacimiento').classList.remove('error');
    return false;
}
// Borrar el contenido de los formularios después del registro exitoso
function resetFormFields() {
    // reset the form
    const signupform = document.querySelector("#signup-form");
    signupform.reset()

    document.getElementById('telefonoRegistro').classList.remove('is-valid', 'error', 'is-invalid');
    document.getElementById('alcaldia').classList.remove('is-valid', 'error', 'is-invalid');
    document.getElementById('colonia').classList.remove('is-valid', 'error', 'is-invalid');
    document.getElementById('nacimiento').classList.remove('is-valid', 'error', 'is-invalid');
    document.getElementById('telefonoRegistro').classList.remove('is-valid', 'error', 'is-invalid');
    document.getElementById('alcaldia').classList.remove('is-valid', 'error', 'is-invalid');
    document.getElementById('colonia').classList.remove('is-valid', 'error', 'is-invalid');
    document.getElementById('nacimiento').classList.remove('is-valid', 'error', 'is-invalid');
}