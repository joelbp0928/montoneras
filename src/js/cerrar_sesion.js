import { signOut } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { auth } from "./firebase.js";
import { supabase } from "./config-supabase.js";
import { setupPosts } from "./postPuntos.js";
import { showmessage } from "./showmessage.js";
import { logincheck } from "./logincheck.js"; // Importa logincheck

const logoutButton = document.querySelector('#logout');

logoutButton.addEventListener('click', async () => {
  try {
    // Cerrar sesión en Firebase (si aplica)
    await signOut(auth);

    // Cerrar sesión en Supabase (si aplica)
    await supabase.auth.signOut();

    // Limpiar la interfaz
    sessionStorage.clear();

    // 🧼 También limpiar localStorage si Supabase lo dejó
    localStorage.removeItem('supabase.auth.token'); // clave común
    localStorage.clear(); // (opcional) si solo usas esto para Supabase

    setupPosts([]);
    logincheck(null);

    showmessage("Has cerrado sesión.", "warning");
  } catch (error) {
    showmessage("Error al cerrar sesión.", "error");
    console.error("Error al cerrar sesión:", error);
  }
});
