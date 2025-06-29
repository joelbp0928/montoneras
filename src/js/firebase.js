// Importar las funciones necesarias para inicializar Firebase
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";

// Configurar la información de tu proyecto de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyCMk30-5GU_U4Rl-xeP3jX0jpntc7pnoac",
  authDomain: "sistema-de-puntos.firebaseapp.com",
  projectId: "sistema-de-puntos",
  storageBucket: "sistema-de-puntos.firebasestorage.app",
  messagingSenderId: "629578669963",
  appId: "1:629578669963:web:5c303a06ec1505199e598e",
  measurementId: "G-SEM5PD9373"
};

// Inicializar la aplicación de Firebase con la configuración proporcionada y Exportar las referencias a la aplicación
export const app = initializeApp(firebaseConfig);

// Obtener una referencia al objeto de autenticación de Firebase y Exportar las referencias a la aplicación
export const auth = getAuth(app);

// Obtener una referencia al objeto de base de datos de Firebase y Exportar las referencias a la aplicacións
export const db = getFirestore(app);

export const storage = getStorage(app); // Inicializa Firebase Storage

// 👇 Establecer persistencia local
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("✅ Sesión persistente habilitada.");
  })
  .catch((error) => {
    console.error("⚠️ Error al establecer persistencia:", error);
  });
