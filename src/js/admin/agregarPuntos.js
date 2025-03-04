export let totalPuntos
export let puntosActuales
export let nuevosPuntos
export function agregarPuntos() {
    const puntosContainer = document.getElementById('puntos-container');
    puntosContainer.style.display = 'block';
}

export async function calcularPuntos(clientesCollectionRef) {
    const puntosInput = document.getElementById('puntos');
    const puntosValue = parseFloat(puntosInput.value);

    if (isNaN(puntosValue) || puntosValue <= 0) {
        return false;
    }

    nuevosPuntos = Math.round(puntosValue * 0.1);

    // Obtiene el ID del cliente
    const clienteId = document.getElementById('clienteId').textContent.replace('ID: ', '');

    // Obtiene la fecha actual
    const fechaActual = new Date().toLocaleDateString();

    try {
        // Actualiza el campo "puntos" y "ultimaFechaIngreso" en la base de datos de Firebase
        await actualizarPuntosEnBaseDeDatos(clientesCollectionRef, clienteId, nuevosPuntos, fechaActual);
        return true; // Indicar que los puntos se actualizaron correctamente
    } catch (error) {
        console.error('Error al actualizar los puntos en la base de datos: ', error);
        return false; // Indicar que hubo un error al actualizar los puntos
    }
}

async function actualizarPuntosEnBaseDeDatos(collectionRef, clienteId, nuevosPuntos, fechaActual) {
    try {
        const clienteSnapshot = await collectionRef.doc(clienteId).get();
        const clienteData = clienteSnapshot.data();

        if (clienteData && clienteData.puntos) {
            puntosActuales = clienteData.puntos
            totalPuntos = puntosActuales + nuevosPuntos;
        } else {
            totalPuntos = nuevosPuntos;
        }
        // Actualiza el campo "puntos" y "ultimaFechaIngreso" en la base de datos de Firebase
        await collectionRef.doc(clienteId).update({
            puntos: totalPuntos,
            ultimaFechaIngreso: fechaActual,
            ultimosPuntos: nuevosPuntos,
        });

        return true; // Indicar que los puntos se actualizaron correctamente
    } catch (error) {
        console.error('Error al actualizar los puntos en la base de datos: ', error);
        return false; // Indicar que hubo un error al actualizar los puntos
    }
}

