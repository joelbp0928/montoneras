import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { uploadImage, saveConfigToFirestore, getConfigFromFirestore } from "../storage.js";
import { storage } from "../firebase.js"; // 🔹 Asegúrate de importar storage


// 📌 Inicializar la configuración del menú
export async function initMenuConfig() {
  const config = await getConfigFromFirestore();
  
  if (config && config.menuImages) {
    loadMenuImages(config.menuImages);
  }
}

// 📌 Cargar imágenes del menú
function loadMenuImages(images) {
  const container = document.getElementById("menuImagesContainer");
  container.innerHTML = ""; // 🧹 Limpiar contenedor antes de cargar

  images.forEach((imageURL, index) => {
    const imageItem = createMenuImageElement(imageURL, index);
    container.appendChild(imageItem);
  });

  makeImagesDraggable();
}

// 📌 Crear un elemento de imagen del menú
function createMenuImageElement(imageURL, index) {
  const div = document.createElement("div");
  div.classList.add("menu-image-item");
  div.draggable = true;
  div.dataset.index = index;

  const img = document.createElement("img");
  img.src = imageURL;

  const removeBtn = document.createElement("button");
  removeBtn.innerHTML = "❌";
  removeBtn.classList.add("remove-image");
  removeBtn.onclick = () => removeImage(index);

  div.appendChild(img);
  div.appendChild(removeBtn);
  return div;
}

// 📌 Evento para agregar nueva imagen
document.getElementById("addImageButton").addEventListener("click", function () {
  document.getElementById("menuImageInput").click();
});

// 📌 Manejar la carga de imágenes
document.getElementById("menuImageInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const imageURL = await uploadImage(file, `${file.name}`, "imgMenu"); // 📂 Guardar en `imgMenu`
  const config = await getConfigFromFirestore();
  const images = config.menuImages || [];

  if (images.length < 10) {
    images.push(imageURL);
    await saveConfigToFirestore({ menuImages: images });
    loadMenuImages(images);
  } else {
    alert("🔟 Límite de 10 imágenes alcanzado.");
  }
});

// 📌 Función para eliminar una imagen del menú de Firestore y Storage
async function removeImage(index) {
  const config = await getConfigFromFirestore();
  const images = config.menuImages || [];

  if (index < 0 || index >= images.length) {
    console.warn("⚠️ Índice inválido, no se puede eliminar la imagen.");
    return;
  }

  const imageURL = images[index]; // 🖼️ Obtener URL de la imagen
  images.splice(index, 1); // 🗑️ Eliminar de la lista

  try {
    // 🔥 Eliminar la imagen de Firebase Storage
    const storageRef = ref(storage, imageURL);
    await deleteObject(storageRef);

    console.log("🗑️ Imagen eliminada de Storage correctamente.");

    // 💾 Actualizar Firestore eliminando la URL de la imagen
    await saveConfigToFirestore({ menuImages: images }, "menu");

    console.log("✔ Imagen eliminada de Firestore correctamente.");

    // 🔄 Recargar la lista de imágenes en la UI
    loadMenuImages(images);
  } catch (error) {
    console.error("❌ Error al eliminar la imagen:", error);
  }
}


// 📌 Hacer imágenes arrastrables
function makeImagesDraggable() {
  const container = document.getElementById("menuImagesContainer");
  let draggedItem = null;

  container.querySelectorAll(".menu-image-item").forEach(item => {
    item.addEventListener("dragstart", function () {
      draggedItem = this;
      setTimeout(() => (this.style.display = "none"), 0);
    });

    item.addEventListener("dragend", function () {
      setTimeout(() => {
        this.style.display = "block";
        draggedItem = null;
        saveNewOrder();
      }, 0);
    });

    item.addEventListener("dragover", function (event) {
      event.preventDefault();
      this.style.border = "2px solid #007bff";
    });

    item.addEventListener("dragleave", function () {
      this.style.border = "none";
    });

    item.addEventListener("drop", function () {
      this.style.border = "none";
      if (this !== draggedItem) {
        const items = [...container.children];
        const draggedIndex = items.indexOf(draggedItem);
        const targetIndex = items.indexOf(this);

        items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, draggedItem);

        container.innerHTML = "";
        items.forEach(item => container.appendChild(item));

        saveNewOrder();
      }
    });
  });
}

// 📌 Guardar el nuevo orden de imágenes en Firestore
async function saveNewOrder() {
  const container = document.getElementById("menuImagesContainer");
  const newOrder = [...container.children].map(item => item.querySelector("img").src);
  
  await saveConfigToFirestore({ menuImages: newOrder });
}
