// Importa y configura Firebase
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { auth, db } from "./firebase.js"; // Importa solo los componentes necesarios
import { showmessage } from "./showmessage.js";

const signInForm = document.querySelector("#login-form");

// Agrega un manejador de eventos al formulario de inicio de sesión
signInForm.addEventListener("submit", handleSignIn);

// Función para manejar el inicio de sesión
async function handleSignIn(e) {
  e.preventDefault();
  const email = signInForm["login-email"].value;
  const password = signInForm["login-password"].value;
  /*  if (email === "montoadmin@monto.com") {
      // Redireccionar a otra página HTML
      window.location.href = './html/indexadmin.html?login=true';
      return
    }*/
  try {
    // Iniciar sesión con Firebase Auth
    const userCredentials = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredentials.user.uid;
    // Obtener rol del usuario
    const userDoc = await getDocs(query(collection(db, 'clientes'), where('clienteUid', '==', userId)));
    
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      if (userData.rol === "admin") {
        showmessage("Modo Administrador \n Activado", "success");
        window.location.href = "./html/indexadmin.html";
        
      } else {
      //  showmessage("Acceso denegado. Solo para administradores.", "error");
      }
    } else {
      throw new Error("Usuario no encontrado en la base de datos.");
    }

    // Cierra el modal inicio de sesión
    const modal = bootstrap.Modal.getInstance(signInForm.closest('.modal'));
    modal.hide();

    // Restablece el formulario
    signInForm.reset();

    // Obtén el nombre del usuario desde la base de datos usando el correo electrónico
    const userName = await getUserNameFromDatabase(email);
  } catch (error) {
    // Manejo de errores mejorado
    if (error.code === 'auth/wrong-password') {
      showmessage("Contraseña incorrecta", "error");
    } else if (error.code === 'auth/user-not-found') {
      showmessage("Correo no encontrado", "error");
    } else {
      showmessage("Error al iniciar sesión. Por favor, inténtalo de nuevo.", "error");
      console.error("Error al iniciar sesión: ", error);
    }
  }
}

// Función para obtener el nombre del usuario desde la base de datos usando el correo electrónico
async function getUserNameFromDatabase(email) {
  const userQuerySnapshot = await getDocs(query(collection(db, 'clientes'), where('email', '==', email)));
  let userName = email; // Predeterminado: utilizar el correo electrónico si no se encuentra el nombre
  if (!userQuerySnapshot.empty) {
    const userDoc = userQuerySnapshot.docs[0];
    userName = userDoc.data().nombre;
  }
  return userName;
}
