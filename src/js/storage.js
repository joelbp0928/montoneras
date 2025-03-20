import { storage, db } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { showmessage } from "./showmessage.js";

// 📌 Función para subir imágenes a Firebase Storage
export async function uploadImage(file, type, existingImageCount) {
    try {
        let folder = "imgConfig"; // 📂 Carpeta por defecto para logo y background
        let fileName = "";

        if (type === "menu") {
            folder = "imgMenu"; // 📂 Carpeta específica para imágenes del menú

            // 🔢 Determinar el próximo nombre de archivo basado en las imágenes existentes
            const nextIndex = existingImageCount + 1; // Contar imágenes existentes y agregar 1
            fileName = `menu${nextIndex}.png`; // 📌 Nombrar como menu1.png, menu2.png, etc.
        } else if (type === "configlogo") {
            fileName = "logo.png"; // 📌 Nombre fijo para logo
        } else if (type === "configback") {
            fileName = "background.png"; // 📌 Nombre fijo para background
        } else {
            fileName = `${Date.now()}_${file.name}`; // 📌 Nombre aleatorio si es otro tipo
        }

        // 📌 Ruta en Storage
        const storageRef = ref(storage, `${folder}/${fileName}`);

        // 📤 Subir archivo nuevo (se sobrescribe si ya existía)
        await uploadBytes(storageRef, file);

        return await getDownloadURL(storageRef); // 🔗 Obtener nueva URL
    } catch (error) {
        showmessage("❌ Error al subir la imagen", "error");
        console.error("❌ Error al subir la imagen:", error);
        throw error;
    }
}


// 📌 Guardar configuración en Firestore (Sobreescribir logo y background)
export async function saveConfigToFirestore(newData, section = "admin") {
    try {
        const docRef = doc(db, "configuracion", section);
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.exists() ? docSnap.data() : {};

        let updatedData;

        if (section === "menu") {
            // 📌 Si la sección es "menu", aseguramos que `menuImages` sea un array sin duplicados
            updatedData = { menuImages: [...(existingData.menuImages || []), ...(newData.menuImages || [])] };
        } else {
            // 📌 Si la sección es "admin", fusionamos los datos y reemplazamos logo/background
            updatedData = { ...existingData, ...newData };
        }

        await setDoc(docRef, updatedData, { merge: true });
      //  console.log(`✔ Configuración guardada en 'configuracion/${section}' correctamente.`);
    } catch (error) {
        console.error(`❌ Error guardando en Firestore en 'configuracion/${section}':`, error);
    }
}


// 📌 Recuperar configuración desde Firestore en diferentes documentos dentro de `configuracion`
export async function getConfigFromFirestore(section = "admin") {
    try {
        const docRef = doc(db, "configuracion", section);
        const docSnap = await getDoc(docRef);

        return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
        showmessage("❌ Error al obtener configuración", "error");
        console.error(`❌ Error al obtener configuración de 'configuracion/${section}':`, error);
        return {};
    }
}
