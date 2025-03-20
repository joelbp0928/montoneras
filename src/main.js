// Importar las funciones y objetos necesarios
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js"
import { getDocs, collection } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js"
import { logincheck } from './js/logincheck.js'
import { auth, db } from "./js/firebase.js"
import { setupPosts } from "./js/postPuntos.js"
import { showmessage } from "./js/showmessage.js"
import { loadConfigImages, listenForConfigChanges } from "./js/config.js";

// Importar los módulos necesarios para las funcionalidades específicas
import './js/registro.js'
import './js/iniciar_sesion.js'
import './js/loginTelefono.js'
import './js/cerrar_sesion.js'
import './js/menu.js'

// 📌 Llamar la función para cargar las imágenes del logo y background
document.addEventListener("DOMContentLoaded", () => {
    loadConfigImages();
    listenForConfigChanges(); // Para actualizar en tiempo real si cambia en Firestore
});

// Manejo de autenticación
onAuthStateChanged(auth, async (user) => {
    // Verificar si el usuario está autenticado (logueado)
    if (user) {
        logincheck(user); // Realizar el checkeo del usuario logueado
        try {
            // Obtener el correo electrónico y el número de teléfono del usuario
            const email = user.email;
            const telefono = user.phoneNumber;

            // Obtener la colección de clientes desde Firestore
            const querySnapshot = await getDocs(collection(db, 'clientes'));

            // Configurar las publicaciones en la interfaz usando los datos obtenidos
            setupPosts(querySnapshot.docs, email, telefono);
            //    console.log("Usuario autenticado:", user); //muestra datos del usuario logeado
        } catch (error) {
            // Mostrar mensaje de error en caso de que ocurra algún problema
            console.log("Error al acceder a Firestore:", error);
            showmessage("Error al acceder.", "error");
        }
    } else {
        // Si el usuario no está autenticado (sin sesión activa)
        // Configurar las publicaciones en la interfaz con un arreglo vacío
        setupPosts([]);
        logincheck(user); // Realizar el checkeo para usuarios sin sesión activa
    }
});