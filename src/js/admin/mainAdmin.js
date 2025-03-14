// 📦 Importamos las funciones necesarias desde otros archivos
import { uploadImage, saveConfigToFirestore, getConfigFromFirestore } from "../storage.js";
import { auth, db, firebaseConfig, storage } from "../firebase.js";
import { showmessage } from "../showmessage.js";
import "../cerrar_sesion.js";  // 🔒 Manejamos el cierre de sesión
import { initMenuConfig } from "./menuConfig.js";

// 🟢 Inicializar configuración del menú cuando la página cargue
document.addEventListener("DOMContentLoaded", function () {
  initMenuConfig();
});


// 🟢 Evento que se ejecuta cuando la página ha cargado completamente
document.addEventListener("DOMContentLoaded", async function () {
  const loadingElement = document.getElementById("loading"); // 🔹 Referencia al loader

  try {
    loadingElement.style.display = "flex"; // 🔹 Mostrar loader

    const config = await getConfigFromFirestore();

    if (config) {
      document.getElementById("restaurantName").value = config.restaurantName || "";
      if (config.logo) document.querySelector(".logo").src = config.logo;
      if (config.background) document.querySelector(".background-image").style.backgroundImage = `url(${config.background})`;
    }
  } catch (error) {
    showmessage("❌ Error al cargar configuración.", "error");
    console.error("❌ Error al cargar configuración:", error);
  } finally {
    loadingElement.style.display = "none"; // 🔹 Ocultar loader después de la carga
  }
});


// 🔹 Evento que se ejecuta cuando el usuario guarda la configuración
document.getElementById("saveConfig").addEventListener("click", async function () {
  // 📦 Capturamos los valores ingresados en los inputs
  const restaurantName = document.getElementById("restaurantName").value;
  const logoInput = document.getElementById("logoUpload").files[0];  // 🖼️ Archivo de logo
  const backgroundInput = document.getElementById("backgroundUpload").files[0];  // 🎨 Archivo de fondo

  try {
    // 🔹 Obtenemos la configuración actual de Firestore para mantener los valores previos
    const currentConfig = await getConfigFromFirestore();

    let logoURL = currentConfig.logo || null;  // 🖼️ Mantener logo anterior si no se sube uno nuevo
    let backgroundURL = currentConfig.background || null;  // 🎨 Mantener fondo anterior si no se sube uno nuevo

    // 📤 Subimos las imágenes a Firebase Storage si el usuario seleccionó alguna nueva
    if (logoInput) logoURL = await uploadImage(logoInput, "logo.png");
    if (backgroundInput) backgroundURL = await uploadImage(backgroundInput, "background.png");

    // 📦 Creamos un objeto con la nueva configuración, asegurando que los valores previos sean respetados
    const updatedConfig = {
      restaurantName: restaurantName || currentConfig.restaurantName,  // ✅ Si no se cambia el nombre, mantener el anterior
      logo: logoURL,  // ✅ Mantiene la imagen anterior si no se sube una nueva
      background: backgroundURL  // ✅ Mantiene la imagen anterior si no se sube una nueva
    };

    // 💾 Guardamos la configuración actualizada en Firestore
    await saveConfigToFirestore({
      restaurantName: updatedConfig.restaurantName,
      logo: updatedConfig.logo,
      background: updatedConfig.background
    }, "admin");


    // 🔄 Actualizamos la vista con los nuevos valores guardados
    if (updatedConfig.logo) document.querySelector(".logo").src = updatedConfig.logo;
    if (updatedConfig.background) document.querySelector(".background-image").style.backgroundImage = `url(${updatedConfig.background})`;

    // 🟢 Cerrar modal con Bootstrap después de guardar
    const modalElement = document.getElementById("configModal");
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();

    // ✅ Notificamos al usuario que la configuración se guardó correctamente
    showmessage("✔ Configuración guardada correctamente.", "success");

  } catch (error) {
    // ❌ Si hay un error, lo notificamos
    showmessage("❌ Error al guardar la configuración.", "error");
    console("❌ Error al guardar la configuración.", error);
    // alert("❌ Error al guardar la configuración.");
  }
});


const cerrarSesionBtn = document.getElementById("logout");

cerrarSesionBtn.addEventListener("click", () => {
  // showmessage("Cerrando sesión...", "warning"); // Mostrar mensaje de "Cerrando sesión" por 1 segundo (1000 ms)
  setTimeout(() => {
    window.location.href = "../index.html"; // Redirigir a la página "../index.html" después de 1 segundo
  }, 1000);
});