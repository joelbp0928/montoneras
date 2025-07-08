// Utiliza clases o estilos en lugar de cambiar el estilo directamente en JavaScript
const loggedOutClass = "logged-out";
const loggedInClass = "logged-in";

// Función para mostrar un elemento
const showElement = (element) => element.classList.remove('d-none');

// Función para ocultar un elemento
const hideElement = (element) => element.classList.add('d-none');

// Función para verificar si el usuario está autenticado y mostrar u ocultar elementos en consecuencia
export const logincheck = (user) => {
  console.log("Verificando estado de autenticación del usuario:", user);
  const loggedOutLinks = document.querySelectorAll(`.${loggedOutClass}`);
  const loggedInLinks = document.querySelectorAll(`.${loggedInClass}`);

  // Si el usuario está autenticado, muestra los enlaces para usuarios autenticados y oculta los enlaces para usuarios no autenticados
  if (user) {
    loggedInLinks.forEach(showElement);
    loggedOutLinks.forEach(hideElement);
  } else {
    // Si el usuario no está autenticado, muestra los enlaces para usuarios no autenticados y oculta los enlaces para usuarios autenticados
    loggedInLinks.forEach(hideElement);
    loggedOutLinks.forEach(showElement);
  }
};
