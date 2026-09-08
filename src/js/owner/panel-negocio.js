import { supabase } from "../config-supabase.js";
import { iniciarModuloEmpleados } from "./empleados.js";
import { iniciarModuloSucursales } from "./sucursales.js";

// =====================================================
// ESTADO
// =====================================================

let tenantId = null;

// =====================================================
// ELEMENTOS DOM
// =====================================================

const loginSection = document.getElementById("loginSection");
const ownerSection = document.getElementById("ownerSection");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");
const tenantInfo = document.getElementById("tenantInfo");
const tenantTitle = document.getElementById("tenantTitle");
const dashboardSection = document.getElementById("dashboardSection");
const branchesSection = document.getElementById("branchesSection");
const employeesSection = document.getElementById("employeesSection");
const sidebarLinks = document.querySelectorAll(".sidebar-link[data-section]");

function mostrarSeccion(sectionName) {

    const sections = {
        dashboard: dashboardSection,
        branches: branchesSection,
        employees: employeesSection
    };

    Object.values(sections)
        .forEach(section => {
            if (section) {
                section.hidden = true;
            }
        });


    const target =
        sections[sectionName];

    if (target) {
        target.hidden = false;
    }


    sidebarLinks.forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === sectionName
        );
    });
}
sidebarLinks.forEach(link => {

    link.addEventListener(
        "click",
        () => {

            const section =
                link.dataset.section;

            if (!section) {
                return;
            }

            mostrarSeccion(section);
        }
    );

});
document
    .querySelectorAll("[data-go-section]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                mostrarSeccion(
                    button.dataset.goSection
                );
            }
        );

    });
// =====================================================
// VISTAS
// =====================================================

function mostrarLogin() {

    loginSection.hidden = false;

    ownerSection.hidden = true;
}

function mostrarPanel() {

    loginSection.hidden = true;
    ownerSection.hidden = false;

    mostrarSeccion("dashboard");
}

// =====================================================
// ALERTAS DEL SISTEMA
// =====================================================

function mostrarError(titulo, mensaje) {

    return Swal.fire({
        icon: "error",
        title: titulo,
        text: mensaje,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#2563eb"
    });
}

function mostrarAdvertencia(titulo, mensaje) {

    return Swal.fire({
        icon: "warning",
        title: titulo,
        text: mensaje,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#2563eb"
    });
}

function mostrarCargando(titulo = "Procesando...") {

    Swal.fire({
        title: titulo,
        text: "Espera un momento.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,

        didOpen: () => {
            Swal.showLoading();
        }
    });
}

function mostrarExito(mensaje) {

    return Swal.fire({
        icon: "success",
        title: mensaje,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true
    });
}

// =====================================================
// VERIFICAR SESIÓN
// =====================================================

async function verificarSesion() {

    console.log(
        "Verificando sesión..."
    );


    const {
        data: { session },
        error
    } =
        await supabase.auth
            .getSession();


    if (
        error ||
        !session?.user
    ) {

        console.log(
            "No existe sesión."
        );

        mostrarLogin();

        return;
    }


    console.log(
        "Sesión encontrada:",
        session.user.email
    );


    await cargarPropietario(
        session.user
    );
}


// =====================================================
// LOGIN
// =====================================================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        loginButton.disabled = true;

        mostrarCargando("Iniciando sesión...");

        try {

            const email =
                emailInput
                    .value
                    .trim()
                    .toLowerCase();


            const password =
                passwordInput.value;


            const {
                data,
                error
            } =
                await supabase.auth
                    .signInWithPassword({
                        email,
                        password
                    });


            if (error) {

                Swal.close();

                await mostrarError("No pudimos iniciar sesión", "El correo electrónico o la contraseña son incorrectos.");

                return;
            }

            if (!data.user) {

                Swal.close();

                await mostrarError("No pudimos iniciar sesión", "No fue posible obtener la información de tu cuenta.");

                return;
            }

            Swal.close();

            console.log("Usuario autenticado:", data.user.email);

            await cargarPropietario(data.user);

        } catch (error) {

            Swal.close();

            console.error("Error inesperado iniciando sesión:", error);

            await mostrarError("No pudimos iniciar sesión", "Ocurrió un problema inesperado. Intenta nuevamente.");

        } finally {

            loginButton.disabled =
                false;
        }

    }
);


// =====================================================
// CARGAR PROPIETARIO
// =====================================================

async function cargarPropietario(user) {

    console.log(
        "Cargando propietario:",
        user.email
    );


    const {
        data: member,
        error
    } =
        await supabase
            .from("tenant_members")
            .select(`
                tenant_id,
                role,
                activo,
                tenants (
                    nombre,
                    slug
                )
            `)
            .eq(
                "user_id",
                user.id
            )
            .eq(
                "activo",
                true
            )
            .maybeSingle();

    if (error) {

        console.error("Error cargando membresía:", error);

        mostrarLogin();

        await mostrarError("No pudimos cargar tu negocio", "Ocurrió un problema al consultar la información de tu cuenta.");

        return;
    }

    if (!member) {

        await supabase.auth
            .signOut();

        mostrarLogin();

        await mostrarAdvertencia("Cuenta sin negocio", "Esta cuenta no tiene un negocio asignado.");

        return;
    }

    if (member.role !== "owner") {

        await supabase.auth
            .signOut();

        await mostrarError("Esta cuenta no tiene permisos de propietario.", "Ocurrió un problema al consultar la información de tu cuenta.");

        mostrarLogin();

        return;
    }


    // ==========================================
    // OWNER CORRECTO
    // ==========================================

    tenantId = member.tenant_id;


    userEmail.textContent = user.email ?? "";


    tenantInfo.textContent = `Negocio: ${member.tenants?.nombre ?? ""}`;


    tenantTitle.textContent = member.tenants?.nombre ? `Panel - ${member.tenants.nombre}` : "Panel de negocio";

    mostrarPanel();

    await Promise.all([

        iniciarModuloSucursales(
            tenantId
        ),

        iniciarModuloEmpleados(
            tenantId,
            member.tenants
        )

    ]);
}

// =====================================================
// CERRAR SESIÓN
// =====================================================

logoutBtn.addEventListener("click", async () => {

    const { error } = await supabase.auth.signOut();

    if (error) {

        console.error("Error cerrando sesión:", error);
        await mostrarError("Error cerrando sesión", "Ocurrió un problema al cerrar la sesión. Intenta nuevamente.");

        return;
    }

    tenantId = null;

    emailInput.value = "";
    passwordInput.value = "";

    mostrarLogin();

    mostrarExito("Sesión cerrada correctamente");

}
);

// =====================================================
// INICIO
// =====================================================

verificarSesion();