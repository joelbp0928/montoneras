import { uploadImage, saveConfigToFirestore, getConfigFromFirestore } from "../storage.js";
import { showmessage } from "../showmessage.js";

// Función para mostrar u ocultar los campos según la selección
export function updatePointsFields() {
    const pointsTypeSelect = document.getElementById('pointsType');
    const purchasePointsField = document.getElementById('purchasePointsField');
    const visitPointsField = document.getElementById('visitPointsField');
    const purchaseHelp = document.getElementById('purchaseHelp');
    const visitHelp = document.getElementById('visitHelp');

    // 🚨 Verifica si los elementos existen antes de acceder a sus propiedades
    if (!pointsTypeSelect || !purchasePointsField || !visitPointsField || !purchaseHelp || !visitHelp) {
        console.error("⚠️ Error: Uno o más elementos no se encontraron en el DOM.");
        return;
    }

    function updateFields() {
        console.log("📌 Tipo de recompensa seleccionado:", pointsTypeSelect.value);

        if (pointsTypeSelect.value === 'purchase') {
            console.log("✅ Mostrando campo de porcentaje y ocultando visitas");
            purchasePointsField.style.display = 'flex';
            visitPointsField.style.display = 'none';
            purchaseHelp.style.display = 'block';
            visitHelp.style.display = 'none';
        } else {
            console.log("✅ Mostrando campo de visitas y ocultando porcentaje");
            purchasePointsField.style.display = 'none';
            visitPointsField.style.display = 'flex';
            purchaseHelp.style.display = 'none';
            visitHelp.style.display = 'block';
        }
    }

    updateFields(); // 🔥 Se ejecuta al cargar la página

    pointsTypeSelect.addEventListener('change', updateFields); // 🔄 Se ejecuta cuando el usuario cambia la selección
}


// 🟢 Evento que se ejecuta cuando la página ha cargado completamente
export async function initAdminConfig() {
    const loadingElement = document.getElementById("loading");

    try {
        loadingElement.style.display = "flex"; 

        const config = await getConfigFromFirestore();

        if (config) {
            document.getElementById("restaurantName").value = config.restaurantName || "";
            document.getElementById("welcomeMessage").value = config.welcomeMessage || "";

            if (config.logo) document.querySelector(".logo").src = config.logo;
            if (config.background) document.querySelector(".background-image").style.backgroundImage = `url(${config.background})`;

            // 🔹 Cargar configuración de recompensas
            if (config.pointsType) {
                document.getElementById("pointsType").value = config.pointsType;
                document.getElementById("pointsPercentage").value = config.pointsPercentage || 10;
                document.getElementById("visitsRequired").value = config.visitsRequired || 5;
            }

            updatePointsFields(); // 🔥 Asegurar que los campos correctos sean visibles al cargar
        }
    } catch (error) {
        showmessage("❌ Error al cargar configuración.", "error");
        console.error("❌ Error al cargar configuración:", error);
    } finally {
        loadingElement.style.display = "none"; 
    }
}


// 📌 Función para manejar la actualización de la configuración
async function saveAdminConfig() {
    //  showmessage("✔ Guardando...", "warning");
    // 📦 Capturamos los valores ingresados en los inputs
    const restaurantName = document.getElementById("restaurantName").value;
    const logoInput = document.getElementById("logoUpload").files[0];  // 🖼️ Archivo de logo
    const backgroundInput = document.getElementById("backgroundUpload").files[0];  // 🎨 Archivo de fondo
    const welcomeMessage = document.getElementById("welcomeMessage").value;
    const pointsType = document.getElementById("pointsType").value;  // Tipo de puntos: por compra o visita
    const pointsPercentage = document.getElementById("pointsPercentage").value;  // Porcentaje de puntos
    const visitsRequired = document.getElementById("visitsRequired").value;

    const loadingMessage = document.getElementById("savingMessage"); // Mensaje de carga
    const saveButton = document.getElementById("saveConfig"); // Botón de guardar

    try {
        // 🔹 Mostrar mensaje de "Guardando..." y deshabilitar botón
        saveButton.disabled = true;
        saveButton.innerHTML = "Guardando...";
        loadingMessage.style.display = "block"; // Mostrar mensaje

        // 🔹 Obtenemos la configuración actual de Firestore para mantener los valores previos
        const currentConfig = await getConfigFromFirestore();

        let logoURL = currentConfig.logo || null;  // 🖼️ Mantener logo anterior si no se sube uno nuevo
        let backgroundURL = currentConfig.background || null;  // 🎨 Mantener fondo anterior si no se sube uno nuevo

        // 📤 Subimos las imágenes a Firebase Storage si el usuario seleccionó alguna nueva
        if (logoInput) logoURL = await uploadImage(logoInput, "configlogo");  // Se guardará en `imgConfig`
        if (backgroundInput) backgroundURL = await uploadImage(backgroundInput, "configback");  // Se guardará en `imgConfig`

        // 📦 Creamos un objeto con la nueva configuración, asegurando que los valores previos sean respetados
        const updatedConfig = {
            restaurantName: restaurantName || currentConfig.restaurantName,  // ✅ Si no se cambia el nombre, mantener el anterior
            welcomeMessage: welcomeMessage || currentConfig.welcomeMessage,
            logo: logoURL,  // ✅ Mantiene la imagen anterior si no se sube una nueva
            background: backgroundURL,  // ✅ Mantiene la imagen anterior si no se sube una nueva
            pointsType: pointsType,
            pointsPercentage: pointsPercentage || 10,  // Default to 10% if no value is provided
            visitsRequired: visitsRequired || 5 // Default a 5 visitas si no se proporciona valor
        };

        // 💾 Guardamos la configuración actualizada en Firestore
        await saveConfigToFirestore({
            restaurantName: restaurantName,
            logo: updatedConfig.logo,
            background: updatedConfig.background,
            welcomeMessage: welcomeMessage
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
        console.log("❌ Error al guardar la configuración.", error);
        // alert("❌ Error al guardar la configuración.");
    } finally {
        // 🔹 Ocultar mensaje de carga y restaurar el botón
        saveButton.disabled = false;
        saveButton.innerHTML = "Guardar Cambios";
        loadingMessage.style.display = "none"; // Ocultar mensaje
    }
}

// 📌 Evento para guardar la configuración
export function setupAdminEventListeners() {
    document.getElementById("saveConfig").addEventListener("click", saveAdminConfig);
}
//registrar visitas llevar control de visitas
async function registerVisit(userId) {
    const userRef = doc(db, "clientes", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const visits = (userData.visits || 0) + 1;

    // Obtener configuración actual
    const configRef = doc(db, "configuracion", "admin");
    const configSnap = await getDoc(configRef);
    const configData = configSnap.exists() ? configSnap.data() : {};

    if (configData.pointsType !== "visit") return; // Solo ejecutar si está configurado en modo visitas

    const visitsRequired = configData.visitsRequired || 5; // Default: 5 visitas para recompensa

    let updatedData = { visits };

    // Si alcanzó el número de visitas requeridas, otorgar puntos y resetear contador
    if (visits >= visitsRequired) {
        updatedData.visits = 0; // Reiniciar el contador de visitas
        updatedData.puntos = (userData.puntos || 0) + 10; // Agregar puntos (se puede cambiar el número)
        showmessage(`🎉 ¡Felicidades! Has ganado puntos por tu visita número ${visitsRequired}.`, "success");
    }

    await updateDoc(userRef, updatedData);
}
