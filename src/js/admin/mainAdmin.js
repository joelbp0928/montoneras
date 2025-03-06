import { auth, db, firebaseConfig } from "../firebase.js";
import { showmessage } from "../showmessage.js";
import "../cerrar_sesion.js";

// 🔹 Importar funciones de Firestore necesarias
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";


// 🔹 Cargar configuración almacenada en Firestore al abrir la página
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const docRef = doc(db, "configuracion", "admin"); // Referencia al documento en Firestore
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data.restaurantName) {
        document.getElementById("restaurantName").value = data.restaurantName;
      }
      if (data.logo) {
        document.querySelector(".logo").src = data.logo;
      }
      if (data.background) {
        document.querySelector(".background-image").style.backgroundImage = `url(${data.background})`;
      }
    }
  } catch (error) {
    console.error("Error al recuperar configuración:", error);
  }
});

// 🔹 Funcionalidad para abrir y cerrar el modal de configuración
document.addEventListener("DOMContentLoaded", function () {
  const configButton = document.getElementById("configButton");
  const configModal = document.getElementById("configModal");
  const closeConfig = document.querySelector(".close-config");

  configButton.addEventListener("click", function () {
    configModal.style.display = "flex";
  });

  closeConfig.addEventListener("click", function () {
    configModal.style.display = "none";
  });

  window.addEventListener("click", function (event) {
    if (event.target === configModal) {
      configModal.style.display = "none";
    }
  });
});

// 🔹 Guardar configuración en Firestore
document.getElementById("saveConfig").addEventListener("click", async function () {
  const restaurantName = document.getElementById("restaurantName").value;
  const logoInput = document.getElementById("logoUpload").files[0];
  const backgroundInput = document.getElementById("backgroundUpload").files[0];

  let configData = { restaurantName: restaurantName };

  if (logoInput) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      configData.logo = e.target.result;
      await saveConfigToFirestore(configData);
    };
    reader.readAsDataURL(logoInput);
  }

  if (backgroundInput) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      configData.background = e.target.result;
      await saveConfigToFirestore(configData);
    };
    reader.readAsDataURL(backgroundInput);
  }

  if (!logoInput && !backgroundInput) {
    await saveConfigToFirestore(configData);
  }

  configModal.style.display = "none";
});

// 🔹 Función para guardar la configuración en Firestore
async function saveConfigToFirestore(configData) {
  try {
    await setDoc(doc(db, "configuracion", "admin"), configData);
    alert("Configuración guardada correctamente en Firebase Firestore.");
  } catch (error) {
    console.error("Error guardando en Firestore:", error);
  }
}
