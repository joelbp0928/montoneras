// Importar el módulo showmessage para mostrar mensajes en la interfaz
import { showmessage } from '../js/showmessage.js';

// Obtener una referencia al elemento HTML con la clase "posts"
const postList = document.querySelector(".posts");

// Definir la función setupPosts que se encargará de configurar las publicaciones en la interfaz
export const setupPosts = (data, email, telefono) => {
  if (!postList) return;

  const clientData = Array.isArray(data) ? data : [data];
  if (clientData.length > 0) {
    let html = ""; 

    clientData.forEach((doc) => {
      const post = doc.data ? doc.data() : doc; 

      if (post.email === email || post.telefono === telefono) {
        html += `
          <div class="list-group-item list-group-item-black">
            <h2 class="text-center welcome-message"><strong>¡Hola, ${post.nombre}! 🎉</strong></h2>
            <h3 class="text-center">Tu número de cliente: <strong>${post.clienteId}</strong></h3>
            <h4 class="text-center">Puntos acumulados: <strong>${post.puntos}</strong></h4>
            ${post.email === email ? `<p class="text-center">📧 ${post.email}</p>` : ""}
            ${post.telefono === telefono ? `<p class="text-center">📱 ${post.telefono}</p>` : ""}
          </div>
        `;
        showWelcomeMessage(post.nombre);
      }
    });

    postList.innerHTML = html;
  } else {
    // Mensaje de bienvenida para usuarios no registrados
    postList.innerHTML = `
      <div class="welcome-container">
        <h2 class="welcome-message">
          ✨ <strong>¡Bienvenido al Programa de Recompensas de Mr. Donut! 🍩</strong>
        </h2>
        <p class="text-center">Disfruta de deliciosas recompensas acumulando puntos en cada compra.🏆</p>
      </div>
    `;
  }
};

function showWelcomeMessage(nombre) {
  showmessage(`¡Bienvenid@, ${nombre}! 🎊`, "success");
}
