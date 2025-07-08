import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { showmessage } from "./showmessage.js";
import { supabase } from "./config-supabase.js";
import { logincheck } from "./logincheck.js";

const signInForm = document.querySelector("#login-form");

signInForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = signInForm["login-email"].value;
  const password = signInForm["login-password"].value;

  try {
    // Configurar persistencia de sesión
    await setPersistence(auth, browserSessionPersistence);

    // Intentar primero con Firebase Auth
    try {
      const userCredentials = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredentials.user.uid;
      await handleUserFound(userId);
      return;
    } catch (firebaseError) {
      console.log("Firebase Auth falló, intentando con Supabase...");
    }

    // Si Firebase falla, intentar con Supabase Auth
    const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (supabaseError) throw supabaseError;

    // Verifica que el UID sea correcto
    console.log("Usuario Supabase autenticado:", supabaseAuth.user);

    const userId = supabaseAuth.user.id;
    await handleUserFound(userId, true); // true indica que es usuario de Supabase

  } catch (error) {
    handleLoginError(error);
  }
});

export async function handleUserFound(userId, isSupabaseUser = false) {
  let userData = null;
  let isAdmin = false;

  // Buscar en Firebase Firestore
  if (!isSupabaseUser) {
    userData = await findUserInFirebase(userId);
    if (userData) {
      isAdmin = userData.rol === "admin";
    }
  }

  // Si no se encontró en Firebase o es usuario de Supabase, buscar en Supabase
  if (!userData || isSupabaseUser) {
    userData = await findUserInSupabase(userId);
    if (userData) {
      isAdmin = userData.rol === "admin";
    }
  }

  if (!userData) {
    throw new Error("Usuario no encontrado en la base de datos");
  }

  // Guardar datos en sessionStorage
  sessionStorage.setItem("clienteId", userData.clienteId || userData.cliente_id);
  sessionStorage.setItem("clienteNombre", userData.nombre);
  sessionStorage.setItem("clienteEmail", userData.email);

  if (isAdmin) {
    showmessage("Modo Administrador \n Activado", "success");
    window.location.href = "./html/indexadmin.html";
    return;
  }
  console.log("Datos del usuario:", userData);
  // Cerrar modal y recargar
  const modalElement = document.getElementById("signinModal"); // o usa el id directamente
  const modalInstance = bootstrap.Modal.getInstance(modalElement);
  modalInstance.hide();


  // 🔧 limpiar manualmente backdrop y body
  setTimeout(() => {
    document.body.classList.remove('modal-open');
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(el => el.remove());
  }, 300);

  signInForm.reset();
  logincheck({ uid: userId }); // Forzar visibilidad inmediata

  //window.location.reload();
  // Llamar manualmente setupPosts
  if (isSupabaseUser) {
    import('./postPuntos.js').then(({ setupPosts }) => {
      const formattedUser = {
        clienteId: userData.clienteId || userData.cliente_id,
        nombre: userData.nombre,
        email: userData.email,
        telefono: userData.telefono,
        puntos: userData.puntos_actuales || userData.puntos,
      };
      console.log("➡️ Mostrando datos directamente tras login Supabase", formattedUser);
      setupPosts([{ data: () => formattedUser }], formattedUser.email, formattedUser.telefono);
    });
  }
}

// Helper Functions (igual que en la solución anterior)
async function findUserInFirebase(userId) {
  try {
    const userQuery = await getDocs(query(collection(db, 'clientes'), where('clienteUid', '==', userId)));
    if (!userQuery.empty) {
      return userQuery.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error("Error buscando en Firebase:", error);
    return null;
  }
}

async function findUserInSupabase(userId) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cliente_uid', userId)
      .single();

    if (data && !error) {
      return {
        ...data,
        clienteId: data.cliente_id, // Mantener compatibilidad
        puntos: data.puntos_actuales
      };
    }
    return null;
  } catch (error) {
    console.error("Error buscando en Supabase:", error);
    return null;
  }
}

function handleLoginError(error) {
  console.error("Error completo:", error);

  if (error.message === "Usuario no encontrado en la base de datos") {
    showmessage("Usuario registrado pero no encontrado en la base de datos", "warning");
    return;
  }

  switch (error.code) {
    case 'auth/wrong-password':
    case 'invalid_credentials': // Supabase error code
      showmessage("🔐 Contraseña incorrecta", "warning");
      break;
    case 'auth/user-not-found':
    case 'user_not_found': // Supabase error code
      showmessage("📧 Correo no encontrado", "warning");
      break;
    case 'auth/too-many-requests':
      showmessage("🚫 Demasiados intentos. Intenta más tarde.", "warning");
      break;
    default:
      showmessage("❗Error al iniciar sesión. Por favor, inténtalo de nuevo.", "error");
  }
}