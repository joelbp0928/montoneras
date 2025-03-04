// Importar la función "signOut" del módulo "firebase-auth.js" para cerrar sesión
import { signOut } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { auth } from "./firebase.js"; // Importar el objeto "auth" para acceder a la autenticación
import { setupPosts } from "./postPuntos.js"; // Importar la función para configurar las publicaciones
import { showmessage } from "./showmessage.js"; // Importar la función para mostrar mensajes

// Obtener una referencia al botón de cierre de sesión con el id "logout"
const logoutButton = document.querySelector('#logout');

// Agregar un controlador de eventos para el clic en el botón de cierre de sesión
logoutButton.addEventListener('click', async () => {
    try {
        // Intentar cerrar sesión utilizando la función "signOut" del objeto "auth"
        await signOut(auth);

        // Si el cierre de sesión es exitoso, configurar las publicaciones con un arreglo vacío
        setupPosts([]);

        // Mostrar un mensaje de éxito indicando que se ha cerrado la sesión
        showmessage("Has cerrado sesión.", "warning");
    } catch (error) {
        // Si ocurre un error durante el cierre de sesión, mostrar un mensaje de error y registrar el error en la consola
        showmessage("Error al cerrar sesión.", "error");
        console.log(error);
    }
});
