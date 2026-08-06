// 📦 Importamos las funciones necesarias desde otros archivos
import { showmessage } from "../showmessage.js";
import { initMenuConfig } from "./menuConfig.js";
import { initAdminConfig, setupAdminEventListeners } from "./configAdmin.js";
import "../cerrar_sesion.js";  // 🔒 Manejamos el cierre de sesión

// 🟢 Inicializar configuración del menú cuando la página cargue
document.addEventListener("DOMContentLoaded", function () {
  initMenuConfig(); 
  initAdminConfig(); 
  setupAdminEventListeners(); 
});

const cerrarSesionBtn = document.getElementById("logout");

cerrarSesionBtn.addEventListener("click", () => {
  // showmessage("Cerrando sesión...", "warning"); // Mostrar mensaje de "Cerrando sesión" por 1 segundo (1000 ms)
  setTimeout(() => {
    window.location.href = "../index.html"; // Redirigir a la página "../index.html" después de 1 segundo
  }, 1000);
});