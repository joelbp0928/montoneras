import { showmessage } from "../showmessage.js"
import { setDoc, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { db } from "../firebase.js"
import { limpiarCampos, validarCampo } from "./validarCampo.js";

// Obtén referencias a los elementos del DOM
const idProductoInput = document.getElementById("idProducto");
const nombreProductoInput = document.getElementById("nombreProducto");
const medidaProductoSelect = document.getElementById("medidaProducto");
const stockProductoInput = document.getElementById("stockProducto");
const fechaMaximaCompraInput = document.getElementById("fechaMaximaCompra");
const observacionesProductoInput = document.getElementById("observacionesProducto");
const nivelImportanciaSelect = document.getElementById("importanciaProducto");

export async function agregarProducto() {
    // Obtén los valores de los campos del formulario
    const idProducto = idProductoInput.value.trim();
    const nombreProducto = nombreProductoInput.value.trim();
    const nivelImportancia = nivelImportanciaSelect.value;

    // Verifica si el campo "nombreProducto" está ocupado
    if (!validarCampo(idProducto, "Debe ingresar el Id del producto",idProductoInput) ||
        !validarCampo(nombreProducto, "Debe ingresar el nombre del producto",nombreProductoInput) ||
        !validarCampo(nivelImportancia, "Debe seleccionar un nivel de importancia",nivelImportanciaSelect)) {
        return;
    }

    // Crea una referencia al documento en la colección "Insumos" con el ID deseado
    const productoDocRef = doc(db, "Insumos", idProducto);

    try {
        // Verifica si el documento con el ID ya existe en la base de datos
        const productoSnapshot = await getDoc(productoDocRef);
        if (productoSnapshot.exists()) {
            idProductoInput.classList.remove("is.valid")
            idProductoInput.classList.add("is-invalid")
            showmessage("El ID del producto ya existe", "error");
            return;
        }

        // Verifica si existe un documento con el mismo nombre en la base de datos
        const nombreQuerySnapshot = await getDocs(query(collection(db, "Insumos"), where("nombre", "==", nombreProducto)));
        if (!nombreQuerySnapshot.empty) {
            nombreProductoInput.classList.remove("is-valid")
            nombreProductoInput.classList.add("is-invalid")
            showmessage("El nombre del producto ya existe", "error");
            return;
        }

        // Agrega los datos del producto al documento en Firestore
        await setDoc(productoDocRef, {
            iD: idProducto,
            nombre: nombreProducto,
            medida: medidaProductoSelect.value,
            stock: stockProductoInput.value,
            fechaMaximaCompra: fechaMaximaCompraInput.value.trim(),
            observaciones: observacionesProductoInput.value,
            importancia: nivelImportancia
        });
        limpiarCampos(idProductoInput, true)
        limpiarCampos(nombreProductoInput, true);
        limpiarCampos(medidaProductoSelect, true);
        limpiarCampos(stockProductoInput, true);
        limpiarCampos(fechaMaximaCompraInput, true);
        limpiarCampos(observacionesProductoInput, true)
        limpiarCampos(nivelImportanciaSelect, true);
        showmessage("Producto agregado con éxito", "success");
    } catch (error) {
        console.error("Error al agregar el producto: ", error);
        showmessage("Error al agregar el producto", "error");
    }
}