import { supabase } from "../config-supabase.js";
import { iniciarModuloEmpleados, cargarSucursalesEmpleado } from "./empleados.js";

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

const branchForm = document.getElementById("branchForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");

const mensaje = document.getElementById("mensaje");

const branches = document.getElementById("branches");

const logoutBtn = document.getElementById("logoutBtn");

const userEmail = document.getElementById("userEmail");

const tenantInfo = document.getElementById("tenantInfo");

const tenantTitle = document.getElementById("tenantTitle");

const branchName = document.getElementById("branchName");

const branchSlug = document.getElementById("branchSlug");

const branchPhone = document.getElementById("branchPhone");

const branchEmail = document.getElementById("branchEmail");


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

    mensaje.textContent = "";
}

// =====================================================
// MENSAJES
// =====================================================

function mostrarMensaje(
    texto,
    tipo = "info"
) {

    const clases = {
        success: "alert alert-success",
        error: "alert alert-danger",
        warning: "alert alert-warning",
        info: "alert alert-info"
    };


    mensaje.className = clases[tipo] ?? clases.info;


    mensaje.textContent = texto;
}

function limpiarMensaje() {

    mensaje.className = "";

    mensaje.textContent = "";
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

        mostrarMensaje(
            "Iniciando sesión...",
            "info"
        );


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

                console.error(
                    "Error login:",
                    error
                );


                mostrarMensaje(
                    "Correo o contraseña incorrectos.",
                    "error"
                );

                return;
            }


            if (!data.user) {

                mostrarMensaje(
                    "No se pudo obtener el usuario.",
                    "error"
                );

                return;
            }


            console.log(
                "Usuario autenticado:",
                data.user.email
            );


            await cargarPropietario(
                data.user
            );


        } catch (error) {

            console.error(
                "Error inesperado:",
                error
            );


            mostrarMensaje(
                "Ocurrió un error al iniciar sesión.",
                "error"
            );

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

        console.error(
            "Error cargando membresía:",
            error
        );


        mostrarMensaje(
            "Error cargando tu negocio.",
            "error"
        );

        mostrarLogin();

        return;
    }


    if (!member) {

        await supabase.auth
            .signOut();


        mostrarMensaje(
            "Esta cuenta no tiene un negocio asignado.",
            "warning"
        );

        mostrarLogin();

        return;
    }


    if (member.role !== "owner") {

        await supabase.auth
            .signOut();


        mostrarMensaje(
            "Esta cuenta no tiene permisos de propietario.",
            "error"
        );

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
        cargarSucursales(),
        iniciarModuloEmpleados(
            tenantId,
            member.tenants
        )
    ]);
}


// =====================================================
// CARGAR SUCURSALES
// =====================================================

async function cargarSucursales() {

    if (!tenantId) {
        return;
    }


    branches.innerHTML = `
        <div class="text-center p-4">
            <div
                class="spinner-border spinner-border-sm"
                role="status"
            ></div>

            <span class="ms-2">
                Cargando sucursales...
            </span>
        </div>
    `;


    const {
        data,
        error
    } =
        await supabase
            .from("restaurants")
            .select("*")
            .eq(
                "tenant_id",
                tenantId
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Error cargando sucursales:",
            error
        );


        branches.innerHTML = "";


        mostrarMensaje(
            "Error cargando sucursales.",
            "error"
        );

        return;
    }


    branches.innerHTML = "";


    if (!data?.length) {

        branches.innerHTML = `
            <div class="alert alert-light border">

                <i class="bi bi-info-circle me-2"></i>

                No hay sucursales registradas.

            </div>
        `;

        return;
    }


    data.forEach(
        restaurante => {

            const div =
                document.createElement(
                    "div"
                );


            div.classList.add(
                "restaurante"
            );


            div.innerHTML = `

                <div
                    class="
                        d-flex
                        justify-content-between
                        align-items-start
                        gap-3
                    "
                >

                    <div>

                        <strong>
                            ${restaurante.nombre}
                        </strong>


                        <p>

                            <i class="bi bi-envelope me-2"></i>

                            ${restaurante.email ?? "Sin correo"}

                        </p>


                        <p>

                            <i class="bi bi-telephone me-2"></i>

                            ${restaurante.telefono ?? "Sin teléfono"}

                        </p>

                    </div>


                    <span
                        class="
                            badge
                            ${restaurante.activo
                    ? "text-bg-success"
                    : "text-bg-secondary"}
                        "
                    >

                        ${restaurante.activo
                    ? "Activo"
                    : "Inactivo"}

                    </span>

                </div>


                <div class="acciones">

                    <button
                        type="button"
                        class="btn btn-outline-primary btn-sm editar"
                        data-id="${restaurante.id}"
                    >

                        <i class="bi bi-pencil"></i>

                        Editar

                    </button>

                </div>
            `;


            branches.appendChild(
                div
            );
        }
    );
}


// =====================================================
// AGREGAR SUCURSAL
// =====================================================

branchForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        if (!tenantId) {

            mostrarMensaje(
                "No se encontró el negocio.",
                "error"
            );

            return;
        }


        const nombre =
            branchName.value.trim();


        const slug =
            branchSlug
                .value
                .trim()
                .toLowerCase();


        const telefono =
            branchPhone.value.trim();


        const email =
            branchEmail
                .value
                .trim()
                .toLowerCase();


        mostrarMensaje(
            "Creando sucursal...",
            "info"
        );


        // ==========================================
        // CREAR RESTAURANTE
        // ==========================================

        const {
            data: restaurant,
            error
        } =
            await supabase
                .from("restaurants")
                .insert({

                    tenant_id:
                        tenantId,

                    nombre,

                    slug,

                    telefono:
                        telefono || null,

                    email:
                        email || null

                })
                .select()
                .maybeSingle();


        if (error) {

            console.error(
                "Error creando sucursal:",
                error
            );


            mostrarMensaje(
                `Error: ${error.message}`,
                "error"
            );

            return;
        }


        // ==========================================
        // CREAR BRANDING
        // ==========================================

        const {
            error: brandingError
        } =
            await supabase
                .from("branding")
                .insert({

                    restaurant_id:
                        restaurant.id,

                    nombre_marca:
                        restaurant.nombre,

                    tema:
                        "light",

                    activo:
                        true
                });


        if (brandingError) {

            console.error(
                "Error creando branding:",
                brandingError
            );


            mostrarMensaje(
                "La sucursal fue creada, pero hubo un error creando su branding.",
                "warning"
            );

            return;
        }


        mostrarMensaje(
            "Sucursal creada correctamente.",
            "success"
        );

        branchForm.reset();

        await Promise.all([cargarSucursales(), cargarSucursalesEmpleado()]);

        await cargarSucursales();
    }
);


// =====================================================
// CERRAR SESIÓN
// =====================================================

logoutBtn.addEventListener(
    "click",
    async () => {

        const {
            error
        } =
            await supabase.auth
                .signOut();


        if (error) {

            console.error(
                "Error cerrando sesión:",
                error
            );


            mostrarMensaje(
                "Error cerrando sesión.",
                "error"
            );

            return;
        }


        tenantId = null;


        branches.innerHTML = "";


        emailInput.value = "";

        passwordInput.value = "";


        mostrarLogin();


        mostrarMensaje(
            "Sesión cerrada correctamente.",
            "success"
        );
    }
);


// =====================================================
// INICIO
// =====================================================

verificarSesion();