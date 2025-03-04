import { collection, orderBy, query, getDocs, where, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { showmessage } from "../showmessage.js";
import { db } from "../firebase.js";
import { agregarProducto } from './agregarProducto.js';
import { validarCampo, limpiarCampos } from "./validarCampo.js";

const btnAgregarProducto = document.getElementById("btnAgregarProducto");
const btnAgregarProductoTabla = document.getElementById("btnAgregarProductoTabla");
const btnBuscarProductoTabla = document.getElementById("btnBuscarProductoTabla");
const buscarProductoForm = document.getElementById("form-buscar-producto");
const buscarProductoInput = document.getElementById("buscarProductoInput");
const idProductoBuscarInput = document.getElementById("idProductoBuscar");
const nombreProductoBuscarInput = document.getElementById("nombreProductoBuscar");
const medidaProductoBuscarInput = document.getElementById("medidaProductoBuscar");
const stockProductoInput = document.getElementById("stockProductoBuscar");
const fechaMaximaCompraInput = document.getElementById("fechaMaximaCompraBuscar");
const observacionesProductoInput = document.getElementById("observacionesProductoBuscar");
const nivelImportanciaInput = document.getElementById("importanciaProductoBuscar");
const btnGuardarProducto = document.getElementById("btnGuardarProducto");
const tablaAgregarProducto = document.getElementById("tablaAgregarProducto");
const tablaBuscarProducto = document.getElementById("tablaBuscarProducto");
const tablaInventario = document.getElementById("tablaInventario");
const tablaResultadoBusqueda = document.getElementById("tablaResultadoBusqueda");
const btnEliminarProducto = document.getElementById("btnEliminarProducto");

document.addEventListener("DOMContentLoaded", async () => {
    initFechaMaximaCompra();
    await actualizarTablaInventario();
    // Llamar a la función para verificar y actualizar niveles de importancia
    verificarYActualizarNivelesImportancia();
});

btnAgregarProducto.addEventListener("click", async () => {
    showmessage("Guardando Producto...", "warning");
    try {
        await agregarProducto();
        await actualizarTablaInventario();
    } catch (error) {
        handleError(error, "Error al agregar producto");
    }
});

buscarProductoForm.addEventListener("submit", buscarProducto);

btnGuardarProducto.addEventListener("click", guardarProducto);

btnAgregarProductoTabla.addEventListener("click", () => toggleTables(tablaAgregarProducto, tablaBuscarProducto));
btnBuscarProductoTabla.addEventListener("click", () => toggleTables(tablaBuscarProducto, tablaAgregarProducto));

async function buscarProducto(e) {
    e.preventDefault();

    const producto = buscarProductoInput.value;

    if (!validarCampo(producto, "Error en búsqueda", buscarProductoInput)) {
        limpiarCampos(buscarProductoInput, false)
        toggleTablaResultadoBusqueda(false)
        return;
    }

    try {
        const querySnapshot = await getDocs(query(collection(db, "Insumos"), where("nombre", "==", producto)));

        if (querySnapshot.empty) {
            const productoDocRef = doc(db, "Insumos", producto);
            const productoSnapshot = await getDoc(productoDocRef);

            if (!productoSnapshot.exists()) {
                limpiarCampos(buscarProductoInput, false)
                showmessage("Producto no encontrado", "error");
                toggleTablaResultadoBusqueda(false)
                return;
            }

            updateFieldsFromSnapshot(productoSnapshot.data());
        } else {
            updateFieldsFromSnapshot(querySnapshot.docs[0].data());
        }

        limpiarCampos(buscarProductoInput, true)
        toggleTablaResultadoBusqueda(true)
    } catch (error) {
        handleError(error, "Error al buscar producto");
        toggleTablaResultadoBusqueda(false)
    }
}

confirmDeleteBtn.addEventListener("click", async () => {
    try {
        await eliminarProducto();
        showmessage("Producto eliminado exitosamente.", "success");
        actualizarTablaInventario();
        $("#confirmDeleteModal").modal("hide"); // Cerrar el modal de confirmación
        toggleTablaResultadoBusqueda(false)
    } catch (error) {
        console.error(error);
        showmessage("Ha ocurrido un error al eliminar el producto.", "error")
    }
});

async function eliminarProducto() {
    const productoId = idProductoBuscarInput.value;
    const productoDocRef = doc(db, "Insumos", productoId);
    await deleteDoc(productoDocRef);
}

btnEliminarProducto.addEventListener("click", () => {
    // Mostrar el modal de confirmación
    const deleteModal = new bootstrap.Modal(document.getElementById("confirmDeleteModal"));
    deleteModal.show();
})

async function guardarProducto() {
    try {
        const iD = idProductoBuscarInput.value;
        const nombre = nombreProductoBuscarInput.value;
        const medida = medidaProductoBuscarInput.value;
        const stock = stockProductoInput.value;
        const fechaMaximaCompra = fechaMaximaCompraInput.value;
        const observaciones = observacionesProductoInput.value;
        const importancia = nivelImportanciaInput.value;

        const isValid = validarCampos(nombre, medida, stock, fechaMaximaCompra, importancia);

        if (!isValid) {
            return;
        }

        // Verificar si el nombre ya está registrado en otros productos (excluyendo el actual)
        const querySnapshot = await getDocs(query(collection(db, "Insumos"), where("nombre", "==", nombre)));
        if (!querySnapshot.empty) {
            const matchingDocuments = querySnapshot.docs.filter(doc => doc.id !== iD);
            if (matchingDocuments.length > 0) {
                setFieldValidationClass(nombreProductoBuscarInput, false);
                showmessage("El nombre ya está registrado en otro producto", "error");
                return;
            }
        }

        const productoDocRef = doc(db, "Insumos", iD);
        const productoSnapshot = await getDoc(productoDocRef);

        if (!productoSnapshot.exists()) {
            showmessage("Producto no encontrado", "error");
            return;
        }

        await setDoc(productoDocRef, {
            iD,
            nombre,
            medida,
            stock,
            fechaMaximaCompra,
            observaciones,
            importancia
        });

        limpiarCampos(idProductoBuscarInput, true);
        limpiarCampos(nombreProductoBuscarInput, true);
        limpiarCampos(medidaProductoBuscarInput, true);
        limpiarCampos(stockProductoInput, true);
        limpiarCampos(fechaMaximaCompraInput, true);
        limpiarCampos(observacionesProductoInput, true);
        limpiarCampos(nivelImportanciaInput, true);
        showmessage("Producto actualizado con éxito", "success");
        tablaResultadoBusqueda.classList.replace("d-block", "d-none");
        await actualizarTablaInventario();
    } catch (error) {
        handleError(error, "Error al guardar producto");
    }
}

function toggleTables(showTable, hideTable) {
    hideTable.classList.replace("d-block", "d-none");
    showTable.classList.replace("d-none", "d-block");
}

// Agregar esta función para mostrar u ocultar la tabla de resultados de búsqueda
function toggleTablaResultadoBusqueda(show) {
    if (show) {
        tablaResultadoBusqueda.classList.replace("d-none", "d-block");
    } else {
        tablaResultadoBusqueda.classList.replace("d-block", "d-none");
    }
}

function initFechaMaximaCompra() {
    const fechaMaximaCompraInput = document.getElementById("fechaMaximaCompra");
    const fechaMaximaCompraInputBuscar = document.getElementById("fechaMaximaCompraBuscar");
    $(fechaMaximaCompraInput).datepicker({
        format: "dd-mm-yyyy",
        startDate: "today",
        autoclose: true,
    });
    $(fechaMaximaCompraInputBuscar).datepicker({
        format: "dd-mm-yyyy",
        startDate: "today",
        autoclose: true,
    });
}

async function actualizarTablaInventario() {
    try {
        const querySnapshot = await getDocs(query(collection(db, "Insumos"), orderBy("iD"), orderBy("nombre")));
        const tbody = tablaInventario.querySelector("tbody");
        tbody.innerHTML = "";

        const fragment = document.createDocumentFragment();
        let currentCategory = null;

        querySnapshot.forEach((doc) => {
            const producto = doc.data();
            const categoriaProducto = producto.iD.charAt(0);

            if (categoriaProducto !== currentCategory) {
                currentCategory = categoriaProducto;
                const categoryRow = document.createElement("tr");
                categoryRow.innerHTML = `<td colspan="7" class="category-row"><h3>${getCategoryLabel(categoriaProducto)}</h3></td>`;
                fragment.appendChild(categoryRow);

                // Agregar encabezados de columna
                const headersRow = document.createElement("tr");
                headersRow.innerHTML = `
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Medida</th>
                    <th>Stock</th>
                    <th>Fecha Máxima Compra</th>
                    <th>Observaciones</th>
                    <th>Importancia</th>
                `;
                fragment.appendChild(headersRow);
            }

            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${doc.id}</td>
                <td>${producto.nombre}</td>
                <td>${producto.medida}</td>
                <td>${producto.stock}</td>
                <td>${producto.fechaMaximaCompra}</td>
                <td>${producto.observaciones}</td>
                <td>
                    <div class="importancia-indicator ${getImportanciaColorClass(producto.importancia)}"></div>
                </td>
            `;
            fragment.appendChild(fila);
        });

        tbody.appendChild(fragment);
    } catch (error) {
        handleError(error, "Error al actualizar tabla");
    }
}

function getCategoryLabel(category) {
    // Define tus etiquetas de categoría según la primera letra del ID
    switch (category) {
        case "A":
            return "Alimentos";
        case "D":
            return "Desechables";
        case "L":
            return "Limpieza";
        case "O":
            return "Otros";
        default:
            return "Desconocida";
    }
}


function getImportanciaColorClass(importancia) {
    switch (importancia) {
        case "1":
            return "green";
        case "2":
            return "yellow";
        case "3":
            return "red";
        default:
            return "";
    }
}

function validarCampos(nombre, medida, stock, fechaMaximaCompra, importancia) {
    const isValidNombre = validarCampo(nombre, "Debe ingresar un nombre de producto", nombreProductoBuscarInput);
    const isValidMedida = validarCampo(medida, "Debe seleccionar una medida", medidaProductoBuscarInput);
    const isValidStock = validarCampo(stock, "Debe ingresar una cantidad en stock", stockProductoInput);
    const isValidFecha = validarCampo(fechaMaximaCompra, "Debe seleccionar una fecha máxima de compra", fechaMaximaCompraInput);
    const isValidImportancia = validarCampo(importancia, "Debe seleccionar un nivel de importancia", nivelImportanciaInput);

    return isValidNombre && isValidMedida && isValidStock && isValidFecha && isValidImportancia;
}

function updateFieldsFromSnapshot(data) {
    idProductoBuscarInput.value = data.iD;
    nombreProductoBuscarInput.value = data.nombre;
    medidaProductoBuscarInput.value = data.medida;
    stockProductoInput.value = data.stock;
    fechaMaximaCompraInput.value = data.fechaMaximaCompra;
    observacionesProductoInput.value = data.observaciones;
    nivelImportanciaInput.value = data.importancia;
}

function handleError(error, message) {
    console.error(message, error);
    showmessage(message, "error");
}

async function verificarYActualizarNivelesImportancia() {
    const currentDate = new Date();
    const querySnapshot = await getDocs(collection(db, "Insumos"));

    querySnapshot.forEach(async (doc) => {
        const producto = doc.data();
        const fechaMaximaCompra = new Date(producto.fechaMaximaCompra);
        const diasRestantes = Math.ceil((fechaMaximaCompra - currentDate) / (1000 * 60 * 60 * 24));

        if (diasRestantes <= 3) {
            if (producto.importancia === "1" || producto.importancia === "2") {
                await setDoc(doc.ref, { importancia: "3" }, { merge: true });
            }
        } else if (diasRestantes <= 8 && producto.importancia === "1") {
            await setDoc(doc.ref, { importancia: "2" }, { merge: true });
        }
    });
}