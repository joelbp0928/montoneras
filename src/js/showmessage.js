// Función para mostrar mensajes con colores personalizados
export function showmessage(mensaje, tipo) {
    // Objeto para mapear los tipos de mensaje con sus colores correspondientes
    const colors = {
        success: "linear-gradient(to right, #56d82f, #96c93d)", // Tipo "success" con color verde
        error: "linear-gradient(to right, #fc0808, #f12626d7)",     // Tipo "error" con color rojo
        warning: "linear-gradient(to right, #e27a03, #f1cb4d)", // Tipo "warning" con color naranja
        default: "gray",  // Tipo por defecto con color gris
    };

    // Obtenemos el color del tipo de mensaje o usamos el color por defecto si no coincide
    const color = colors[tipo] || colors.default;

    // Mostramos el mensaje utilizando la librería Toastify
    Toastify({
        text: mensaje,         // Texto del mensaje
        duration: 3500,        // Duración en milisegundos que se muestra el mensaje
        newWindow: true,       // Abre en nueva ventana
        close: true,           // Permite cerrar el mensaje
        gravity: "bottom",     // Posición del mensaje, en la parte inferior
        position: "center",     // Alineación del mensaje, al centro
        stopOnFocus: true,     // Evita que el mensaje se cierre al poner el cursor encima
        style: {
            background: color, // Utilizamos el color obtenido del objeto "colors" para establecer el fondo del mensaje
        },
        onClick: function () { // Acción a realizar cuando se hace clic en el mensaje
            // Aquí puedes agregar cualquier acción adicional si es necesario
        }
    }).showToast(); // Mostramos el mensaje utilizando la función showToast() de Toastify
}
