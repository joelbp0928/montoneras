// Importar las funciones y objetos necesarios
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js"
import { getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js"
import { logincheck } from './js/logincheck.js'
import { auth, db } from "./js/firebase.js"
import { setupPosts, checkSupabaseSession } from "./js/postPuntos.js"
import { showmessage } from "./js/showmessage.js"
import { loadConfigImages, listenForConfigChanges } from "./js/config.js";

// Importar los módulos necesarios para las funcionalidades específicas
import './js/config-supabase.js'
import './js/registro.js'
import './js/iniciar_sesion.js'
import './js/loginTelefono.js'
import './js/cerrar_sesion.js'
import './js/menu.js'

// 📌 Llamar la función para cargar las imágenes del logo y background
document.addEventListener("DOMContentLoaded", () => {
    loadConfigImages();

    listenForConfigChanges(); // Para actualizar en tiempo real si cambia en Firestore
    // Manejo de autenticación
    onAuthStateChanged(auth, async (user) => {
        logincheck(user);
        if (user) {
            try {
                // 🔍 Buscar en Firebase
                const userQuery = await getDocs(query(collection(db, 'clientes'), where('clienteUid', '==', user.uid)));

                if (!userQuery.empty) {
                    const userData = userQuery.docs[0].data();
                    setupPosts([{ data: () => userData }], user.email, user.phoneNumber || userData.telefono);
                } else {
                    // 🔁 Buscar en Supabase como fallback
                    console.log("Usuario no encontrado en Firebase, intentando en Supabase...");
                    await checkSupabaseSession(); // Usa tu función de postPuntos.js
                }
            } catch (error) {
                console.error("Error accediendo a los datos:", error);
                setupPosts([]);
            }
        } else {
            console.log("Usuario no autenticado");
            // ✅ Firebase no detecta sesión → intentamos en Supabase
            await checkSupabaseSession();
        }
    });

});




