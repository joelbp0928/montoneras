// Importar las funciones y objetos necesarios
import { checkSupabaseSession } from "./js/postPuntos.js"
import { loadConfigImages, listenForConfigChanges } from "./js/config.js";
import { initWelcome, listenWelcomeChanges } from "./js/config/welcome.js";
import { supabase } from "./js/config-supabase.js";
import { obtenerStorefrontCode } from "./js/storefront.js";

// Importar los módulos necesarios para las funcionalidades específicas
import './js/config-supabase.js'
import './js/registro.js'
import './js/iniciar_sesion.js'
import './js/loginTelefono.js'
import './js/cerrar_sesion.js'
import './js/menu.js'

//Llamar la función para cargar las imágenes del logo y background
document.addEventListener("DOMContentLoaded", async () => {

    const storefront = await cargarStorefront();

    if (storefront) {
     //   console.log("Portal encontrado:", storefront);
    }

    loadConfigImages();

    listenForConfigChanges(); // Para actualizar en tiempo real si cambia en Firestore

    await initWelcome();

    listenWelcomeChanges();

    await checkSupabaseSession();// Manejo de autenticación

});

async function cargarStorefront() {
    const code = obtenerStorefrontCode();

    if (!code) {
        return null;
    }

    const { data, error } = await supabase.rpc("resolve_storefront", { p_code: code });

    if (error) {
        console.error("Error resolviendo portal:", error);
        return null;
    }

    if (!data?.success) {
        console.warn("Portal no encontrado:", data);
        return null;
    }

    return data.data;
}