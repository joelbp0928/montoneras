// Importar módulos de Firestore y mensaje emergente
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { showmessage } from '../js/showmessage.js';
import { db } from "./firebase.js";

// 📌 Obtener referencia al contenedor de los mensajes
const postList = document.querySelector(".posts");

// 📌 Configurar los posts y mostrar mensaje de bienvenida personalizado
export const setupPosts = async (data, email, telefono) => {
  if (!postList) return;

  // 🔍 Obtener datos de configuración desde Firestore
  const docRef = doc(db, "configuracion", "admin");
  const docSnap = await getDoc(docRef);
  let welcomeMessage = "";
  let restaurantName = "";

  if (docSnap.exists()) {
    const config = docSnap.data();
    welcomeMessage = config.welcomeMessage || welcomeMessage;
    restaurantName = config.restaurantName || "";
  }

  // 📌 Si el usuario está registrado, mostrar su información
  if (Array.isArray(data) && data.length > 0) {
    let html = "";

    data.forEach((doc) => {
      const post = doc.data ? doc.data() : doc;

      if (post.email === email || post.telefono === telefono) {
        html += `
  <div class="cliente-card-vip">
    <div class="cliente-card-vip-header">
      <h2><i class="fas fa-crown me-2"></i>¡Hola, ${post.nombre}!</h2>
      <p>Cliente Frecuente</p>
      <div class="qr-button-container">
        <a class="menu-button mostrar-qr-btn" data-id="${post.clienteId}" data-nombre="${post.nombre}">Mostrar mi QR</a>
      </div>
    </div>
    <div class="cliente-card-vip-body">
      <p><i class="fas fa-id-card me-2"></i><strong>ID Cliente:</strong> ${post.clienteId}</p>
      <p><i class="fas fa-star me-2"></i><strong>Puntos acumulados:</strong> ${post.puntos}</p>
      ${post.email ? `<p><i class="fas fa-envelope me-2"></i><strong>Email:</strong> ${post.email}</p>` : ""}
      ${post.telefono ? `<p><i class="fas fa-phone-alt me-2"></i><strong>Teléfono:</strong> ${post.telefono}</p>` : ""}
      <div class="cliente-card-vip-footer">
        <i class="fas fa-info-circle me-2"></i>
        Recuerda dar tu número al cajero en cada compra para acumular puntos. 💳
      </div>
    </div>
  </div>

  <!-- Modal para mostrar QR -->
  <div class="modal fade" id="qrModal" tabindex="-1" aria-labelledby="qrModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content qr-modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="qrModalLabel">Tu Código de Cliente</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body text-center">
          <div class="qr-modal-inner">
            <canvas id="qrCanvas"></canvas>
            <p class="mt-3 qr-modal-nombre" id="qrClientName"></p>
          </div>
        </div>
        <div class="modal-footer justify-content-center">
          <a type="button" class="menu-button" data-bs-dismiss="modal">Cerrar</a>
        </div>
      </div>
    </div>
  </div>
`;
        // 🎉 Mostrar mensaje de bienvenida
        showWelcomeMessage(`¡Bienvenid@ ${post.nombre}!`);
      }
    });

    postList.innerHTML = html;

    setTimeout(() => {
      const qrBtn = document.querySelector(".mostrar-qr-btn");
      if (qrBtn) {
        qrBtn.addEventListener("click", () => {
          const qrId = qrBtn.getAttribute("data-id");
          const nombre = qrBtn.getAttribute("data-nombre");

          new QRious({
            element: document.getElementById("qrCanvas"),
            value: qrId,
            size: 200
          });

          document.getElementById("qrClientName").innerText = `ID Cliente: ${qrId}\nNombre: ${nombre}`;

          const qrModal = new bootstrap.Modal(document.getElementById("qrModal"));
          qrModal.show();
        });
      }
    }, 100);

  } else {
    // 📌 Mostrar mensaje de bienvenida para usuarios no registrados
    updateWelcomeMessage(welcomeMessage, restaurantName);
  }
};

// 📌 Función para actualizar el mensaje de bienvenida en la UI
function updateWelcomeMessage(welcomeMessage, restaurantName) {
  if (!postList) return;

  let messageHTML = `
    <div class="welcome-container">
      <h2 class="welcome-message">`;

  // 🏪 Mostrar el nombre del restaurante solo si existe en Firestore
  if (restaurantName.trim() !== "") {
    messageHTML += `<strong>¡Bienvenido al Programa de Recompensas de ${restaurantName} </strong>`
  } else {
    messageHTML += `<strong>¡Bienvenido a nuestro programa de recompensas!</strong>`
  }

  messageHTML += `</h2>`;

  // 🏪 Mostrar el nombre del restaurante solo si existe en Firestore
  if (welcomeMessage.trim() !== "") {
    messageHTML += `<p class="text-center">${welcomeMessage}</p>`;
  }

  messageHTML += `</div>`;

  postList.innerHTML = messageHTML;
}

// 📌 Función para mostrar mensaje emergente de bienvenida
function showWelcomeMessage(message) {
  showmessage(message, "success");
}

// 🎧 Escuchar cambios en Firestore en tiempo real y actualizar el mensaje de bienvenida automáticamente
onSnapshot(doc(db, "configuracion", "admin"), (docSnap) => {
  if (docSnap.exists()) {
    const config = docSnap.data();
    const updatedWelcomeMessage = config.welcomeMessage || "¡Bienvenid@ a nuestro programa de recompensas!";
    const updatedRestaurantName = config.restaurantName || "";

    updateWelcomeMessage(updatedWelcomeMessage, updatedRestaurantName);
  }
});
