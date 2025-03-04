import { showmessage } from "../showmessage.js";
import '../cerrar_sesion.js'
/*const urlParams = new URLSearchParams(window.location.search);
const loginParam = urlParams.get('login');

if (loginParam === 'true') {
    showmessage("Modo Administrador \n Activado", "success");
}*/
//showmessage("Modo Administrador \n Activado", "success");
const cerrarSesionBtn = document.getElementById("logout");

cerrarSesionBtn.addEventListener("click", () => {
   // showmessage("Cerrando sesión...", "warning"); // Mostrar mensaje de "Cerrando sesión" por 1 segundo (1000 ms)
    setTimeout(() => {
        window.location.href = "../index.html"; // Redirigir a la página "../index.html" después de 1 segundo
    }, 1000);
});
