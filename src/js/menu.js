document.addEventListener("DOMContentLoaded", function () {
  const menuImages = [
    { src: "img/menu1.jpg", alt: "Menú 1" },
    { src: "img/menu2.jpg", alt: "Menú 2" },
    { src: "img/menu3.jpg", alt: "Menú 3" }
  ];

  const carouselInner = document.getElementById("carouselInner");
  const carousel = document.getElementById("menuCarousel");
  const bootstrapCarousel = new bootstrap.Carousel(carousel, { interval: 3000, ride: "carousel" }); // 🔹 Activa el auto-slide

  // 🔹 Insertar imágenes en el carrusel dinámicamente
  carouselInner.innerHTML = menuImages
    .map((img, index) => `
      <div class="carousel-item ${index === 0 ? "active" : ""}">
        <div class="zoom-container">
          <img src="${img.src}" alt="${img.alt}" class="img-fluid rounded zoomable">
        </div>
      </div>
    `)
    .join("");

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
