// Importar las funciones y objetos necesarios
import { logincheck } from './js/logincheck.js'
import { setupPosts, checkSupabaseSession } from "./js/postPuntos.js"
import { showmessage } from "./js/showmessage.js"
import { loadConfigImages, listenForConfigChanges } from "./js/config.js";
import { initWelcome, renderWelcomeMessage, listenWelcomeChanges } from "./js/config/welcome.js";

// Importar los módulos necesarios para las funcionalidades específicas
import './js/config-supabase.js'
import './js/registro.js'
import './js/iniciar_sesion.js'
import './js/loginTelefono.js'
import './js/cerrar_sesion.js'
import './js/menu.js'

//Llamar la función para cargar las imágenes del logo y background
document.addEventListener("DOMContentLoaded", async() => {

    loadConfigImages();
    
    listenForConfigChanges(); // Para actualizar en tiempo real si cambia en Firestore

    await initWelcome();

    listenWelcomeChanges();
    
    await checkSupabaseSession();// Manejo de autenticación

});
