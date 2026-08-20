import { showmessage } from '../js/showmessage.js';
import { supabase } from "./config-supabase.js";
import { logincheck } from "./logincheck.js";

const postList = document.querySelector(".posts");

export const setupPosts = async (data, email, telefono) => {
  //console.log("Datos recibidos en setupPosts:", { data, email, telefono });
  if (!postList) return;

  try {

    // 2. Buscar cliente en Firebase o Supabase
    const cliente = await findClient(data, email, telefono);

    // 3. Mostrar la información correspondiente
    if (cliente) {
      renderClientCard(cliente);
      showmessage(`¡Bienvenid@ ${cliente.nombre}!`, "success");
    } else {
      console.warn("Cliente no encontrado en Supabase");
      //renderWelcomeMessage(welcomeMessage, restaurantName);
    }
  } catch (error) {
    console.error("Error en setupPosts:", error);
    //renderWelcomeMessage();
  }
};

// Helper Functions
async function findClient(firebaseData, email, telefono) {
  // 1. Buscar en los datos de Firebase primero
  if (Array.isArray(firebaseData) && firebaseData.length > 0) {
    const clientData = firebaseData[0].data ? firebaseData[0].data() : firebaseData[0];
    // console.log("Retornando datos de Firebase:", clientData);
    return clientData;
  }
  // 2. Si no se encontró en Firebase, buscar en Supabase
  if (email || telefono) {
    try {
      let query = supabase.from('clientes').select('*');

      if (email && telefono) {
        query = query.or(`email.eq.${email},telefono.eq.${telefono}`);
      } else if (email) {
        query = query.eq('email', email);
      } else {
        query = query.eq('telefono', telefono);
      }

      const { data: supabaseData, error } = await query.single();

      if (supabaseData && !error) {
        console.log("Datos encontrados en Supabase:", supabaseData);
        return {
          ...supabaseData,
          clienteId: supabaseData.cliente_id,
          puntos: supabaseData.puntos_actuales,
          nombreNormalizado: supabaseData.nombre_normalizado || supabaseData.nombre.toLowerCase()
        };
      } else {
        console.log("No se encontraron datos en Supabase");
      }
    } catch (error) {
      console.error("Error al buscar en Supabase:", error);
      throw error;
    }
  }
  return null;
}

function renderClientCard(cliente) {
  const html = `
    <div class="cliente-card-vip">
      <div class="cliente-card-vip-header">
        <h2><i class="fas fa-crown me-2"></i>¡Hola, ${cliente.nombre}!</h2>
        <p>Cliente Frecuente</p>
        <div class="qr-button-container">
          <a class="menu-button mostrar-qr-btn" 
             data-id="${cliente.clienteId}" 
             data-nombre="${cliente.nombre}">
             Mostrar mi QR
          </a>
        </div>
      </div>
      <div class="cliente-card-vip-body">
        ${renderClientDetail('ID Cliente', cliente.clienteId, 'fa-id-card')}
        ${renderClientDetail('Puntos acumulados', cliente.puntos, 'fa-star')}
        ${cliente.email ? renderClientDetail('Email', cliente.email, 'fa-envelope') : ''}
        ${cliente.telefono ? renderClientDetail('Teléfono', cliente.telefono, 'fa-phone-alt') : ''}
        <div class="cliente-card-vip-footer">
          <i class="fas fa-info-circle me-2"></i>
          Recuerda dar tu número al cajero en cada compra para acumular puntos. 💳
        </div>
      </div>
    </div>
    ${renderQRModal()}
  `;

  postList.innerHTML = html;
  setupQRButton();
}

function renderClientDetail(label, value, icon) {
  return `<p><i class="fas ${icon} me-2"></i><strong>${label}:</strong> ${value}</p>`;
}

function renderQRModal() {
  return `
    <div class="modal fade" id="qrModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content qr-modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Tu Código de Cliente</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body text-center">
            <div class="qr-modal-inner">
              <canvas id="qrCanvas"></canvas>
              <p class="mt-3 qr-modal-nombre" id="qrClientName"></p>
            </div>
          </div>
          <div class="modal-footer justify-content-center">
            <a type="button" class="menu-button" data-bs-dismiss="modal">Cerrar</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupQRButton() {
  setTimeout(() => {
    const qrBtn = document.querySelector(".mostrar-qr-btn");
    if (qrBtn) {
      qrBtn.addEventListener("click", () => {
        const qrId = qrBtn.getAttribute("data-id");
        const nombre = qrBtn.getAttribute("data-nombre");

        new QRious({
          element: document.getElementById("qrCanvas"),
          value: qrId,
          size: 200
        });

        document.getElementById("qrClientName").textContent =
          `ID Cliente: ${qrId}\nNombre: ${nombre}`;

        new bootstrap.Modal(document.getElementById("qrModal")).show();
      });
    }
  }, 100);
}

// Función para verificar sesión en Supabase y cargar datos
export async function checkSupabaseSession() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error obteniendo sesión:", sessionError.message);
    logincheck(null);
    return;
  }

  const user = session?.user ?? null;
  logincheck(user);

  if (!user) return;

  try {
    const { data: supabaseUser, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("cliente_uid", user.id)
      .single();

    if (error || !supabaseUser) {
      console.warn("Usuario autenticado pero no registrado en 'clientes'");
      showmessage("No encontramos tu perfil de cliente. Contáctanos para activarlo.");
      return;
    }

    const formattedUser = {
      clienteId: supabaseUser.cliente_id,
      nombre: supabaseUser.nombre,
      email: supabaseUser.email,
      telefono: supabaseUser.telefono,
      puntos: supabaseUser.puntos_actuales
    };

    sessionStorage.setItem("clienteId", formattedUser.clienteId);
    sessionStorage.setItem("clienteNombre", formattedUser.nombre);
    sessionStorage.setItem("clienteEmail", formattedUser.email);

    setupPosts([{ data: () => formattedUser }], formattedUser.email, formattedUser.telefono);
  } catch (err) {
    console.error("Error consultando datos del cliente:", err);
    showmessage("Ocurrió un error cargando tu información.");
  }
}