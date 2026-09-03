import { supabase } from "../config-supabase.js";
import { initMenuConfig } from "./menuConfig.js";
import { initAdminConfig, setupAdminEventListeners } from "./configAdmin.js";

const loginSection = document.getElementById("staffLoginSection");
const adminApp = document.getElementById("adminApp");

const authLoading = document.getElementById("authLoading");

const loginForm = document.getElementById("staffLoginForm");
const emailInput = document.getElementById("staffEmail");
const passwordInput = document.getElementById("staffPassword");
const loginButton = document.getElementById("staffLoginButton");
const loginMessage = document.getElementById("staffLoginMessage");

const logoutButton = document.getElementById("logout");

const restaurantOptions = document.getElementById("restaurantOptions");
const restaurantSelectorModal = document.getElementById("restaurantSelectorModal");

const changePasswordModal = document.getElementById("changePasswordModal");
const changePasswordForm = document.getElementById("changePasswordForm");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const changePasswordButton = document.getElementById("changePasswordButton");

let currentUser = null;
let currentMember = null;
let currentRestaurant = null;
let modulosInicializados = false;

function mostrarCargando() {
  authLoading.hidden = false;
  loginSection.hidden = true;
  adminApp.hidden = true;
}

function mostrarLogin() {
  authLoading.hidden = true;
  loginSection.hidden = false;
  adminApp.hidden = true;

  loginSection.style.display = "flex";
}

function mostrarPOS() {
  authLoading.hidden = true;
  loginSection.hidden = true;
  adminApp.hidden = false;

  loginSection.style.display = "";
}

function mostrarMensaje(texto, tipo = "danger") {
  loginMessage.innerHTML = `
		<div class="alert alert-${tipo} mb-0">
			${texto}
		</div>
	`;
}

function limpiarMensaje() {
  loginMessage.innerHTML = "";
}

async function verificarSesion() {
  mostrarCargando();

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user) {
      mostrarLogin();
      return;
    }

    await procesarUsuario(session.user);

  } catch (error) {
    console.error("Error verificando sesión:", error);

    mostrarLogin();
    mostrarMensaje("No fue posible verificar la sesión.");
  }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  limpiarMensaje();

  loginButton.disabled = true;
  loginButton.innerHTML = `
		<span class="spinner-border spinner-border-sm me-2"></span>
		Ingresando...
	`;

  try {
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      mostrarMensaje("Correo o contraseña incorrectos.");
      return;
    }

    await procesarUsuario(data.user);
  } catch (error) {
    console.error("Error iniciando sesión:", error);
    mostrarMensaje("No fue posible iniciar sesión.");
  } finally {
    loginButton.disabled = false;
    loginButton.innerHTML = `
			<i class="fas fa-right-to-bracket me-2"></i>
			Iniciar sesión
		`;
  }
});

async function procesarUsuario(user) {
  currentUser = user;

  const { data: member, error } = await supabase
    .from("tenant_members")
    .select(`
			id,
			tenant_id,
			role,
			activo,
			tenants (
				id,
				nombre,
				slug
			)
		`)
    .eq("user_id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    console.error("Error cargando membresía:", error);
    await cerrarSesionInterna();
    mostrarMensaje("No fue posible validar tu acceso.");
    return;
  }

  if (!member) {
    await cerrarSesionInterna();
    mostrarMensaje("Esta cuenta no pertenece a ningún negocio.");
    return;
  }

  if (!["owner", "staff"].includes(member.role)) {
    await cerrarSesionInterna();
    mostrarMensaje("Esta cuenta no tiene acceso al sistema.");
    return;
  }

  currentMember = member;

  // El cambio obligatorio de contraseña solo aplica
  // a empleados creados con contraseña temporal.
  if (member.role === "staff") {
    const puedeContinuar = await verificarCambioPassword(user);

    if (!puedeContinuar) {
      return;
    }
  }

  // Owner continúa directamente.
  await cargarRestaurantesPermitidos();
}

async function verificarCambioPassword(user) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Error comprobando profile:",
      error
    );

    mostrarLogin();
    mostrarMensaje(
      "No fue posible comprobar el estado de tu cuenta."
    );

    return false;
  }

  // Un usuario del sistema debería tener profile
  if (!profile) {
    console.error(
      "No existe profile para el usuario:",
      user.id
    );

    mostrarLogin();
    mostrarMensaje(
      "Tu cuenta no tiene un perfil configurado correctamente."
    );

    return false;
  }

  console.log(
    "Estado must_change_password:",
    profile.must_change_password
  );

  // Ya cambió su contraseña
  if (profile.must_change_password === false) {
    return true;
  }

  // Tiene contraseña temporal
  const modal = bootstrap.Modal.getOrCreateInstance(changePasswordModal);

  modal.show();

  return false;
}

changePasswordForm.addEventListener("submit", async event => {
  event.preventDefault();

  const password = newPasswordInput.value.trim();
  const confirmation = confirmPasswordInput.value.trim();

  // Validaciones
  if (password.length < 8) {
    alert("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  if (password !== confirmation) {
    alert("Las contraseñas no coinciden.");
    return;
  }

  if (!currentUser) {
    console.error("No existe currentUser.");
    alert("La sesión no es válida. Inicia sesión nuevamente.");
    return;
  }

  changePasswordButton.disabled = true;

  const textoOriginal = changePasswordButton.innerHTML;

  changePasswordButton.innerHTML = `
        <span
            class="spinner-border spinner-border-sm me-2"
            role="status"
        ></span>
        Guardando...
    `;

  try {

    console.log("Actualizando contraseña para:", currentUser.id);

    // 1. Cambiar contraseña en Supabase Auth
    const {
      data,
      error: passwordError
    } = await supabase.auth.updateUser({
      password: password
    });

    if (passwordError) {
      console.error(
        "Error Supabase Auth:",
        passwordError
      );

      throw passwordError;
    }

    console.log(
      "Contraseña actualizada correctamente:",
      data.user?.id
    );

    // 2. Marcar contraseña temporal como cambiada
    const {
      data: updatedProfile,
      error: profileError
    } = await supabase
      .from("profiles")
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentUser.id)
      .select("id, must_change_password")
      .maybeSingle();

    if (profileError) {
      console.error(
        "Error actualizando profile:",
        profileError
      );

      throw profileError;
    }

    // IMPORTANTE:
    // comprobar que realmente se modificó una fila
    if (!updatedProfile) {
      throw new Error(
        "La contraseña cambió en Auth, pero no se pudo actualizar el perfil."
      );
    }

    // Comprobación extra
    if (updatedProfile.must_change_password !== false) {
      throw new Error(
        "El perfil continúa marcado para cambio de contraseña."
      );
    }

    console.log(
      "Profile actualizado correctamente:",
      updatedProfile
    );

    // 3. Actualizamos usuario actual
    currentUser = data.user ?? currentUser;

    // 4. Limpiar formulario
    changePasswordForm.reset();

    // 5. Cerrar modal
    const modal =
      bootstrap.Modal.getInstance(changePasswordModal);

    modal?.hide();

    // 6. Continuar con acceso
    await cargarRestaurantesPermitidos();

  } catch (error) {

    console.error(
      "ERROR COMPLETO CAMBIO PASSWORD:",
      error
    );

    let mensaje =
      "No fue posible actualizar la contraseña.";

    if (error?.message) {
      mensaje = error.message;
    }

    alert(mensaje);

  } finally {

    changePasswordButton.disabled = false;
    changePasswordButton.innerHTML = textoOriginal;
  }
});

async function cargarRestaurantesPermitidos() {
  let restaurantes = [];

  if (currentMember.role === "owner") {
    const { data, error } = await supabase
      .from("restaurants")
      .select(`
				id,
				tenant_id,
				nombre,
				slug,
				activo
			`)
      .eq("tenant_id", currentMember.tenant_id)
      .eq("activo", true)
      .order("nombre");

    if (error) {
      console.error("Error cargando restaurantes:", error);
      mostrarMensaje("No fue posible cargar las sucursales.");
      return;
    }

    restaurantes = data ?? [];
  } else {
    const { data, error } = await supabase
      .from("restaurant_members")
      .select(`
				role,
				restaurants (
					id,
					tenant_id,
					nombre,
					slug,
					activo
				)
			`)
      .eq("tenant_member_id", currentMember.id)
      .eq("activo", true);

    if (error) {
      console.error("Error cargando asignaciones:", error);
      mostrarMensaje("No fue posible cargar tus sucursales.");
      return;
    }

    restaurantes = (data ?? [])
      .filter(item => item.restaurants?.activo)
      .map(item => ({
        ...item.restaurants,
        role: item.role
      }));
  }

  if (!restaurantes.length) {
    await cerrarSesionInterna();
    mostrarMensaje("No tienes sucursales activas asignadas.");
    return;
  }

  if (restaurantes.length === 1) {
    await seleccionarRestaurante(restaurantes[0]);
    return;
  }

  mostrarSelectorRestaurantes(restaurantes);
}

function mostrarSelectorRestaurantes(restaurantes) {
  restaurantOptions.innerHTML = "";

  for (const restaurant of restaurantes) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "btn btn-outline-primary text-start p-3";

    button.innerHTML = `
			<div class="fw-bold">
				<i class="fas fa-store me-2"></i>
				${escaparHTML(restaurant.nombre)}
			</div>
			${restaurant.role
        ? `<small class="text-muted">${nombreRol(restaurant.role)}</small>`
        : `<small class="text-muted">Propietario</small>`
      }
		`;

    button.addEventListener("click", async () => {
      const modal = bootstrap.Modal.getInstance(restaurantSelectorModal);
      modal?.hide();

      await seleccionarRestaurante(restaurant);
    });

    restaurantOptions.appendChild(button);
  }

  const modal = bootstrap.Modal.getOrCreateInstance(restaurantSelectorModal);
  modal.show();
}

async function seleccionarRestaurante(restaurant) {
  currentRestaurant = restaurant;

  sessionStorage.setItem(
    "pos_context",
    JSON.stringify({
      tenantId: currentMember.tenant_id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.nombre,
      membershipRole: currentMember.role,
      restaurantRole: restaurant.role ?? "owner"
    })
  );

  mostrarPOS();

  await inicializarPOS();
}

async function inicializarPOS() {
  if (modulosInicializados) {
    return;
  }

  modulosInicializados = true;

  try {
    initMenuConfig();
    initAdminConfig();
    setupAdminEventListeners();
  } catch (error) {
    console.error("Error inicializando POS:", error);
  }
}

logoutButton.addEventListener("click", async event => {
  event.preventDefault();

  await cerrarSesionInterna();

  currentUser = null;
  currentMember = null;
  currentRestaurant = null;
  modulosInicializados = false;

  sessionStorage.removeItem("pos_context");

  emailInput.value = "";
  passwordInput.value = "";

  mostrarLogin();
});

async function cerrarSesionInterna() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error cerrando sesión:", error);
  }
}

function nombreRol(role) {
  const roles = {
    manager: "Gerente",
    supervisor: "Supervisor",
    cashier: "Cajero",
    staff: "Empleado"
  };

  return roles[role] ?? role;
}

function escaparHTML(valor) {
  const element = document.createElement("div");
  element.textContent = valor ?? "";
  return element.innerHTML;
}

verificarSesion();