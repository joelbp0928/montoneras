// 📌 Importar Firestore
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { db } from "./firebase.js";

// 📌 Obtener referencias a los elementos HTML
const logoElement = document.getElementById("logoImage");
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

function initTempusDominus() {
    const signupModal = document.getElementById("signupModal");

    if (!signupModal) return;

    // Inicializa solo cuando el modal se muestra
    signupModal.addEventListener("shown.bs.modal", function () {
        const nacimientoField = document.getElementById("nacimiento");

        if (!nacimientoField || nacimientoField._picker) return;

        try {
            // Añadimos estilos para las flechas
            const style = document.createElement("style");
            style.textContent = `
              .tempus-dominus-widget .toolbar .chevron-container::before {
                font-family: 'bootstrap-icons';
                content: "\\F284"; /* Icono de flecha izquierda */
                font-size: 1.5rem;
              }
              .tempus-dominus-widget .toolbar .chevron-container.chevron-next::before {
                content: "\\F285"; /* Icono de flecha derecha */
              }
            `;
            document.head.appendChild(style);

            const picker = new tempusDominus.TempusDominus(nacimientoField, {
                localization: {
                    locale: "es",
                    format: "yyyy-dd-MM",
                },
                display: {
                    icons: {
                        previous: "bi bi-chevron-left",
                        next: "bi bi-chevron-right"
                    },
                    theme: "dark",
                    viewMode: "years", // Inicia en selección de año
                    components: {
                        decades: true,
                        year: true,
                        month: true,
                        date: true,
                        hours: false,
                        minutes: false,
                        seconds: false,
                    },
                    buttons: {
                        today: false,
                        clear: false,
                        close: true,
                    },

                    theme: window.innerWidth < 768 ? "light" : "auto",
                },
                restrictions: {
                    maxDate: new Date(
                        new Date().setFullYear(new Date().getFullYear() - 16)
                    ),
                    minDate: new Date(1950, 0, 1), // Año mínimo 1950
                },
                defaultDate: new Date(1990, 0, 1), // Fecha por defecto en el medio del rango
                viewDate: new Date(2000, 0, 1), // Vista inicial centrada en 1980
            });

            // Marca el campo como inicializado
            nacimientoField._picker = true;

            // Ajustes específicos para móviles
            if (window.innerWidth < 768) {
                const pickerElement = picker._element;
                pickerElement.style.fontSize = "14px";
            }
        } catch (error) {
            console.error("Error al inicializar Tempus Dominus:", error);
        }
    });

    // También inicializa si el modal ya está abierto al cargar
    if (signupModal.classList.contains("show")) {
        const event = new Event("shown.bs.modal");
        signupModal.dispatchEvent(event);
    }
}

// Inicialización segura cuando todo esté listo
document.addEventListener("DOMContentLoaded", function () {
    // Verifica si Tempus Dominus está cargado
    if (typeof tempusDominus === "undefined") {
        console.error("Tempus Dominus no está cargado correctamente");
        return;
    }

    initTempusDominus();
});

// Maneja posibles redimensionamientos
window.addEventListener("resize", function () {
    const pickerInstance = document.getElementById("nacimiento")?._picker;
    if (pickerInstance) {
        pickerInstance.updateOptions({
            display: {
                theme: window.innerWidth < 768 ? "light" : "auto",
            },
        });
    }
});