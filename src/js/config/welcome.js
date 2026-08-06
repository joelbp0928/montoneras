import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { db } from "../firebase.js";


const postList = document.querySelector(".posts");

export async function initWelcome() {

    try {

        const config = await getConfig();

        renderWelcomeMessage(
            config.welcomeMessage,
            config.restaurantName
        );

    } catch(error){

        console.error(error);

        renderWelcomeMessage();

    }

}

export function renderWelcomeMessage(welcomeMessage = "", restaurantName = "") {
    console.log("Renderizando mensaje de bienvenida:", { welcomeMessage, restaurantName });
    if (!postList) return;

    const hasRestaurantName = restaurantName.trim() !== "";
    const hasWelcomeMessage = welcomeMessage.trim() !== "";

    postList.innerHTML = `
    <div class="welcome-container">
      <h2 class="welcome-message">
        <strong>${hasRestaurantName
            ? `¡Bienvenido al Programa de Recompensas de ${restaurantName}`
            : '¡Bienvenido a nuestro programa de recompensas!'}
        </strong>
      </h2>
      ${hasWelcomeMessage ? `<p class="text-center">${welcomeMessage}</p>` : ''}
    </div>
  `;
}

async function getConfig() {
    const docRef = doc(db, "configuracion", "admin");
    const docSnap = await getDoc(docRef);

    return {
        welcomeMessage: docSnap.exists() ? docSnap.data().welcomeMessage : "",
        restaurantName: docSnap.exists() ? docSnap.data().restaurantName : ""
    };
}

export function listenWelcomeChanges() {

    onSnapshot(doc(db, "configuracion", "admin"), (docSnap) => {

        if (!docSnap.exists()) return;

        const config = docSnap.data();

        renderWelcomeMessage(
            config.welcomeMessage,
            config.restaurantName
        );

    });

}