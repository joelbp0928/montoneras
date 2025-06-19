// 📌 Importar Firestore
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { db } from "./firebase.js";

// 📌 Obtener referencias a los elementos HTML
const logoElement = document.querySelector(".logo");
const backgroundElement = document.querySelector(".background-image");

// 📌 Función para cargar configuración desde Firestore
export async function loadConfigImages() {
    try {
        const docRef = doc(db, "configuracion", "admin");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            updateUI(config);
            console.log()
        }
    } catch (error) {
        console.error("❌ Error al obtener configuración desde Firestore:", error);
    }
}

// 📌 Función para actualizar el logo y fondo dinámicamente
function updateUI(config) {
    if (config.logo) {
        logoElement.src = config.logo; // Actualiza el logo
    }

    if (config.background) {
        backgroundElement.style.backgroundImage = `url(${config.background})`; // Actualiza el fondo
    }
}

// 🎧 Escuchar cambios en Firestore en tiempo real
export function listenForConfigChanges() {
    onSnapshot(doc(db, "configuracion", "admin"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.logo) {
                document.getElementById("logoImage").src = data.logo;
                //    console.log("🔄 Logo actualizado en tiempo real:", data.logo);
            }

            if (data.background) {
                document.querySelector(".background-image").style.backgroundImage = `url(${data.background})`;
                //  console.log("🔄 Background actualizado en tiempo real:", data.background);
            }
        }
    });
}