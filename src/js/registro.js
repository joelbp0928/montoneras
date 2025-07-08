import { supabase } from './config-supabase.js';
import { showmessage } from './showmessage.js';
import { showError, hideError } from "./manageError.js";
import { isValidDate } from './validarFecha.js';

// Obtiene una referencia al formulario de registro
const signupForm = document.getElementById("signup-form");

// Controlador del evento submit del formulario de registro
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const registroButton = document.getElementById('registroButton');
  registroButton.disabled = true;

  showmessage("Registrando. Espere...", "warning");

  // Limpia errores previos
  validacionEliminarError(['nombre', 'telefonoRegistro', 'alcaldia', 'colonia', 'nacimiento', 'email', 'password', 'confirmPassword']);
  hideError("nacimiento", "mensajeErrorNacimiento");

  // Obtiene los valores del formulario
  const telefono = document.getElementById("telefonoRegistro").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const nombre = document.getElementById('nombre').value;
  const alcaldia = document.getElementById('alcaldia').value;
  const colonia = document.getElementById('colonia').value;
  const nacimiento = document.getElementById('nacimiento').value;

  try {
    // Validaciones (igual que antes)
    if (!(await validarYProcesarEmail(email))) {
      registroButton.disabled = false;
      return;
    }

    if (!(await validarYProcesarTelefono(telefono))) {
      registroButton.disabled = false;
      return;
    }

    if (!validaryProcesarPassword(password, confirmPassword)) {
      registroButton.disabled = false;
      return;
    }

    if (!isValidDate(nacimiento)) {
      showError("nacimiento", "Fecha inválida", "mensajeErrorNacimiento", "Debe ser mayor de 5 años.");
      registroButton.disabled = false;
      return;
    }

    hideError("nacimiento", "mensajeErrorNacimiento");
    validacionAgregarValid(['nacimiento']);

    if (!nombre || !alcaldia || !colonia) {
      showError("nombre", "Campo requerido", "mensajeErrorNombre", "El nombre es obligatorio.");
      registroButton.disabled = false;
      return;
    }

    validacionAgregarValid(['nombre', 'alcaldia', 'colonia']);

    // PASO 1: Crear usuario en Auth de Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw authError;
    }

    // Obtener el ID del cliente (auto-incremental desde 3001)
    const { data: idData, error: idError } = await supabase
      .rpc('get_next_client_id');

    if (idError) throw idError;

    const clienteId = idData;
    const clienteUid = authData.user.id; // Reemplazar con authData.user.id si se usa autenticación
    // PASO 2: Insertar datos del cliente en la tabla
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .insert([{
        cliente_id: clienteId,
        cliente_uid: clienteUid,
        nombre,
        nombre_normalizado: nombre.toLowerCase(),
        email,
        telefono,
        nacimiento: nacimiento,
        alcaldia,
        colonia,
        puntos_actuales: 3, // Puntos de bienvenida
        fechaRegistro: new Date().toISOString()
      }])
      .select();

    if (clienteError) throw clienteError;

    // Éxito - limpiar formulario
    resetFormFields();
    registroButton.disabled = false;

    const signupModal = document.querySelector('#signupModal');
    const modal = bootstrap.Modal.getInstance(signupModal);
    modal.hide();

    showmessage("Registro exitoso \n Te regalamos 3 puntos.", "success");

    // ✅ Iniciar sesión automáticamente tras registrar
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error("Error al iniciar sesión después del registro:", loginError);
    } else {
      import('./postPuntos.js').then(({ checkSupabaseSession }) => {
        setTimeout(() => {
          checkSupabaseSession();
        }, 400);
      });

    }
  } catch (error) {
    console.error("Error durante el registro: ", error);
    showmessage(error.message || "Ocurrió un error durante el registro. Intenta más tarde.", "error");
    registroButton.disabled = false;
  }
});

// Funciones de validación adaptadas para Supabase
async function validarYProcesarEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError("email", "Correo electrónico inválido", "mensajeErrorEmail", "Formato del correo no válido.");
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('email')
      .eq('email', email);

    if (data && data.length > 0) {
      showError("email", "Correo ya registrado", "mensajeErrorEmail", "Este correo ya está registrado.");
      return false;
    }
  } catch (error) {
    console.error("Error al verificar el correo:", error);
    showmessage("Error al verificar el correo. Intenta más tarde.", "error");
    return false;
  }

  hideError("email", "mensajeErrorEmail");
  validacionAgregarValid(['email']);
  return true;
}

async function validarYProcesarTelefono(telefono) {
  hideError("telefonoRegistro", "mensajeErrorTelefono");

  if (!validarFormatoTelefono(telefono)) {
    showError("telefonoRegistro", "Número no válido", "mensajeErrorTelefono", "El número debe tener 10 dígitos.");
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('telefono')
      .eq('telefono', telefono);

    if (data && data.length > 0) {
      showError("telefonoRegistro", "Número ya registrado", "mensajeErrorTelefono", "Este número ya está asociado a otra cuenta.");
      return false;
    }
  } catch (error) {
    console.error("Error al verificar teléfono:", error);
    showmessage("Error al verificar el teléfono. Intenta más tarde.", "error");
    return false;
  }

  hideError("telefonoRegistro", "mensajeErrorTelefono");
  validacionAgregarValid(['telefonoRegistro']);
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

document.getElementById('signupModal').addEventListener('hidden.bs.modal', function () {
  // Limpiar completamente el modal
  const modal = this;
  modal.style.display = 'none';

  // Eliminar todos los backdrops
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

  // Restaurar el body
  document.body.classList.remove('modal-open');
  document.body.style.paddingRight = '';

  // Forzar redibujado
  void modal.offsetHeight;
});