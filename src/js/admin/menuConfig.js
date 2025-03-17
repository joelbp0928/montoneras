import { ref, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { doc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { uploadImage, saveConfigToFirestore, getConfigFromFirestore } from "../storage.js";
import { storage, db } from "../firebase.js"; // 🔹 Asegúrate de importar storage
import { showmessage } from "../showmessage.js";

// 📌 Inicializar la configuración del menú y escuchar cambios en tiempo real
export async function initMenuConfig() {
  const config = await getConfigFromFirestore();

  // 🔹 Cargar imágenes iniciales si existen
  if (config && config.menuImages) {
    loadMenuImages(config.menuImages);
  }

  // 🎧 Escuchar cambios en Firestore en tiempo real
  const docRef = doc(db, "configuracion", "admin");
  onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.menuImages) {
        //console.log("🔄 Se detectaron cambios en Firestore. Actualizando imágenes...");
        loadMenuImages(data.menuImages);
      }
    } else {
      console.warn("⚠️ No se encontró el documento en Firestore.");
    }
  });
}

// 📌 Cargar imágenes del menú en la UI
function loadMenuImages(images) {
  const container = document.getElementById("menuImagesContainer");
  container.innerHTML = ""; // 🧹 Limpiar contenedor antes de cargar

  images.forEach((imageURL, index) => {
    const imageItem = createMenuImageElement(imageURL, index);
    container.appendChild(imageItem);
  });

  makeImagesDraggable(); // Habilitar funcionalidad de arrastrar
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

// 📌 Función para contar imágenes en la carpeta "imgMenu"
async function countMenuImages() {
  try {
    const folderRef = ref(storage, "imgMenu"); // 📂 Referencia a la carpeta imgMenu
    const listResult = await listAll(folderRef); // 🔍 Listar archivos en la carpeta
    return listResult.items.length; // 🔢 Retornar cantidad de imágenes
  } catch (error) {
    console.error("❌ Error al contar imágenes en Storage:", error);
    return 0; // En caso de error, devolver 0
  }
}

// 📌 Manejar la carga de imágenes
document.getElementById("menuImageInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;
  // 📌 Contar imágenes existentes antes de subir una nueva
  const existingImageCount = await countMenuImages();

  console.log("filemenu", file)
  console.log("count", existingImageCount )


  const config = await getConfigFromFirestore();
  const images = config.menuImages || [];

  if (images.length < 10) {
    const imageURL =  await uploadImage(file, "menu", existingImageCount); // 📂 Pasar el conteo de imágenes
    images.push(imageURL);
    await saveConfigToFirestore({ menuImages: images });
    loadMenuImages(images);
  } else {
    showmessage("🔟 Límite de 10 imágenes alcanzado.", "warning");
  }
});

// 📌 Función para eliminar una imagen del menú de Firestore y Storage
async function removeImage(index) {
  const docRef = doc(db, "configuracion", "admin"); // 📍Referencia al documento `admin` dentro de `configuracion`
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    console.warn("⚠️ No existe el documento 'admin' en Firestore.");
    showmessage("⚠️ No existe el documento 'admin' en Firestore.", "warning");
    return;
  }

  let images = docSnap.data().menuImages || []; // 📥 Obtener el array de imágenes

  if (index < 0 || index >= images.length) {
    // console.warn("⚠️ Índice inválido, no se puede eliminar la imagen.");
    showmessage("⚠️ Índice inválido, no se puede eliminar la imagen.", "warning");
    return;
  }

  const imageURL = images[index]; // 🖼️ Obtener la URL de la imagen a eliminar
  images.splice(index, 1); // 🗑️ Eliminarla del array

  try {
    // 🔥 Eliminar la imagen de Firebase Storage
    const storageRef = ref(storage, imageURL);
    await deleteObject(storageRef);
    showmessage("🗑️ Imagen eliminada correctamente.", "success")

    // 💾 Actualizar Firestore eliminando la URL del campo `menuImages` dentro de `admin`
    await updateDoc(docRef, { menuImages: images }); // 🔄 Modificamos solo el campo `menuImages`
    //console.log("✔ Imagen eliminada de Firestore correctamente.");

    // 🔄 Recargar la lista de imágenes en la UI
    loadMenuImages(images);
  } catch (error) {
    showmessage("❌ Error al eliminar la imagen.", "error")
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
