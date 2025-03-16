import { db } from "./firebase.js"; // 🔹 Importa la instancia de Firebase Firestore
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { showmessage } from "./showmessage.js";

document.addEventListener("DOMContentLoaded", async function () {
  const carouselInner = document.getElementById("carouselInner");
  const carousel = document.getElementById("menuCarousel");
  const bootstrapCarousel = new bootstrap.Carousel(carousel, {
    interval: 3000,
    ride: "carousel",
  });

  // 📥 Función para cargar imágenes del menú desde Firestore
  async function loadMenuImages() {
    try {
      const docRef = doc(db, "configuracion", "admin"); // 📍 Obtener la referencia a Firestore
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.menuImages && data.menuImages.length > 0) {
          updateCarousel(data.menuImages);
        } else {
          console.warn("⚠️ No hay imágenes en Firestore.");
        }
      } else {
        console.warn("⚠️ No se encontró el documento en Firestore.");
      }
    } catch (error) {
      console.error("❌ Error cargando imágenes del menú desde Firestore:", error);
    }
  }

  // 🎧 Escuchar cambios en Firestore en tiempo real
  function listenForMenuChanges() {
    const docRef = doc(db, "configuracion", "admin");
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.menuImages) {
          updateCarousel(data.menuImages);
        }
      }
    });
  }

  // 📌 Función para actualizar el carrusel con imágenes dinámicas
  function updateCarousel(images) {
    carouselInner.innerHTML = ""; // 🧹 Limpiar carrusel antes de agregar nuevas imágenes

    images.forEach((imgURL, index) => {
      const activeClass = index === 0 ? "active" : "";
      const item = `
        <div class="carousel-item ${activeClass}">
          <div class="zoom-container">
            <img src="${imgURL}" alt="Menú ${index + 1}" class="img-fluid rounded zoomable">
          </div>
        </div>
      `;
      carouselInner.innerHTML += item;
    });

    bootstrapCarousel.cycle(); // 🔄 Reiniciar el carrusel
  }

  // 📥 Cargar imágenes iniciales
  await loadMenuImages();

  // 🎧 Escuchar cambios en Firestore en tiempo real
  listenForMenuChanges();

  // 🔹 Abrir modal con el botón
  document.getElementById("openMenu").addEventListener("click", () => {
    new bootstrap.Modal(document.getElementById("menuModal")).show();
  });

  // 🔹 Habilitar Swipe (Deslizar con el Dedo)
  let startX = 0;
  let endX = 0;

  carousel.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX; // Guarda la posición inicial del toque
  });

  carousel.addEventListener("touchmove", (event) => {
    endX = event.touches[0].clientX; // Guarda la posición final mientras se mueve
  });

  carousel.addEventListener("touchend", () => {
    const swipeThreshold = 110; // 🔹 Distancia mínima para detectar swipe
    const swipeDistance = startX - endX;

    if (swipeDistance > swipeThreshold) {
      bootstrapCarousel.next(); // 🔹 Swipe a la izquierda → Avanza
    } else if (swipeDistance < -swipeThreshold) {
      bootstrapCarousel.prev(); // 🔹 Swipe a la derecha → Retrocede
    }
    // 🔹 Detener el auto-slide del carrusel
    bootstrapCarousel.pause();
  });

  // 🔹 Habilitar Zoom en Imágenes sin afectar el swipe
  document.querySelectorAll(".zoomable").forEach((img) => {
    let scale = 1;
    let isPanning = false;
    let lastX = 0, lastY = 0;

    img.addEventListener("wheel", (event) => {
      event.preventDefault();
      scale += event.deltaY * -0.01;
      scale = Math.min(Math.max(1, scale), 3);
      img.style.transform = `scale(${scale})`;
    });

    img.addEventListener("touchstart", (event) => {
      if (event.touches.length === 2) {
        isPanning = false;
      } else {
        isPanning = true;
        lastX = event.touches[0].clientX;
        lastY = event.touches[0].clientY;
      }
      // 🔹 Detener el auto-slide del carrusel
      bootstrapCarousel.pause();
    });

    img.addEventListener("touchmove", (event) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        scale = Math.min(Math.max(1, distance / 200), 3);
        img.style.transform = `scale(${scale})`;
      } else if (isPanning && scale > 1) {
        event.preventDefault();
        const dx = event.touches[0].clientX - lastX;
        const dy = event.touches[0].clientY - lastY;
        img.style.transform += `translate(${dx}px, ${dy}px)`;
        lastX = event.touches[0].clientX;
        lastY = event.touches[0].clientY;
      }
    });
    // 🔹 Detener el auto-slide del carrusel
    // bootstrapCarousel.pause();


    img.addEventListener("dblclick", () => {
      scale = 1;
      img.style.transform = `scale(${scale})`;
    });
  });
});
