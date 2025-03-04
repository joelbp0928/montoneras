import { showmessage } from './showmessage.js';

export async function getLastClientId(clientesRef) {
  try {
    const querySnapshot = await clientesRef.orderBy('clienteId', 'desc').limit(1).get();
    const ultimoId = querySnapshot.docs.map((doc) => parseInt(doc.data().clienteId));
    return ultimoId[0] || 0;
  } catch (error) {
    console.error('Error al obtener el último ID de cliente: ', error);
    showmessage('Ocurrió un error al obtener el último ID de cliente. Por favor, inténtalo de nuevo.', "error");
    throw error; // Opcional: Puedes lanzar nuevamente el error para manejarlo en el lugar donde se llama a la función.
  }
}
