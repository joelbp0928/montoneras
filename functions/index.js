const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.eliminarCliente = functions.https.onRequest((req, res) => {
  // Manejar solicitudes preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "https://sistema-de-puntos.web.app"); // Especifica tu dominio
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600"); // Cache de preflight durante 1 hora
    return res.status(204).send(""); // Responder sin contenido
  }

  // Asegurar que el método es POST
  if (req.method !== "POST") {
    res.set("Access-Control-Allow-Origin", "https://sistema-de-puntos.web.app");
    return res.status(405).send({
      success: false,
      message: "Método no permitido. Solo se acepta POST.",
    });
  }

  // Manejar la solicitud principal
  res.set("Access-Control-Allow-Origin", "https://sistema-de-puntos.web.app"); // Especifica tu dominio
  const { clienteId } = req.body;

  if (!clienteId) {
    return res.status(400).send({
      success: false,
      message: "El ID del cliente es obligatorio.",
    });
  }

  (async () => {
    try {
      const clienteRef = admin.firestore().collection("clientes").doc(clienteId);
      const clienteDoc = await clienteRef.get();

      if (!clienteDoc.exists) {
        throw new Error("Cliente no encontrado en la base de datos.");
      }

      const clienteData = clienteDoc.data();
      const clienteUid = clienteData.clienteUid;

      await admin.auth().deleteUser(clienteUid);
      console.log("Usuario eliminado de Firebase Authentication.");

      await clienteRef.delete();
      console.log("Cliente eliminado de Firestore con éxito.");

      res.send({
        success: true,
        message: "Cliente eliminado correctamente.",
      });
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  })();
});
