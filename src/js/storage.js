import { storage, db } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

// 📌 Función para subir imágenes a Firebase Storage
export async function uploadImage(file, fileName, folder = "imgMenu") {
    try {
        const storageRef = ref(storage, `${folder}/${fileName}`); // 📂 Guardar en la carpeta especificada
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef); // 🔗 Obtener URL de descarga
    } catch (error) {
        console.error("❌ Error al subir la imagen:", error);
        throw error;
    }
}

// 📌 Guardar configuración en Firestore en diferentes documentos dentro de `configuracion`
export async function saveConfigToFirestore(newData, section = "admin") {
    try {
        const docRef = doc(db, "configuracion", section);
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.exists() ? docSnap.data() : {};

        let updatedData;

        if (section === "menu") {
            // 📌 Si la sección es "menu", aseguramos que `urls` sea un array y no sobrescribimos otros datos.
            updatedData = { urls: [...(existingData.urls || []), ...(newData.urls || [])] };
        } else {
            // 📌 Si la sección es "admin", fusionamos los datos manteniendo los existentes.
            updatedData = { ...existingData, ...newData };
        }

        await setDoc(docRef, updatedData, { merge: true });

        console.log(`✔ Configuración guardada en 'configuracion/${section}' correctamente.`);
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
        console.error(`❌ Error al obtener configuración de 'configuracion/${section}':`, error);
        return {};
    }
}
