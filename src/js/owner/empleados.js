import { supabase } from "../config-supabase.js";
import { mostrarError, mostrarAdvertencia, mostrarCargando, cerrarCargando, mostrarToast } from "../shared/alertas.js";
import { escaparHTML } from "../shared/utils.js";

// =====================================================
// ESTADO DEL MÓDULO
let tenantId = null;
let tenant = null;
let sucursales = [];

// =====================================================
// DOM
const employeeForm = document.getElementById("employeeForm");
const employeeName = document.getElementById("employeeName");
const employeeEmail = document.getElementById("employeeEmail");
const employeePhone = document.getElementById("employeePhone");
const employeeRole = document.getElementById("employeeRole");
const employeeBranches = document.getElementById("employeeBranches");
const employeesList = document.getElementById("employeesList");
const createEmployeeBtn = document.getElementById("createEmployeeBtn");
const employeeModal = document.getElementById("employeeModal");
const editEmployeeModal = document.getElementById("editEmployeeModal");
const editEmployeeForm = document.getElementById("editEmployeeForm");
const editEmployeeMemberId = document.getElementById("editEmployeeMemberId");
const editEmployeeName = document.getElementById("editEmployeeName");
const editEmployeePhone = document.getElementById("editEmployeePhone");
const editEmployeeRole = document.getElementById("editEmployeeRole");
const editEmployeeActive = document.getElementById("editEmployeeActive");
const editEmployeeBranches = document.getElementById("editEmployeeBranches");
const saveEmployeeBtn = document.getElementById("saveEmployeeBtn");

// =====================================================
// INICIALIZAR MÓDULO
export async function iniciarModuloEmpleados(idTenant, datosTenant) {
    if (!idTenant) {
        console.error("No se recibió tenantId en empleados.js");
        return;
    }

    tenantId = idTenant;
    tenant = datosTenant ?? null;

    await Promise.all([
        cargarSucursalesEmpleado(),
        cargarEmpleados()
    ]);
}
// =====================================================
// CARGAR SUCURSALES DISPONIBLES
// =====================================================

async function cargarSucursalesEmpleado() {
    // =============================================
    // PROTECCIÓN: TENANT NO INICIALIZADO
    // =============================================

    if (!tenantId) {
        return;
    }
    employeeBranches.innerHTML = `
		<div class="text-secondary">
			<span class="spinner-border spinner-border-sm me-2"></span>
			Cargando sucursales...
		</div>
	`;

    const { data, error } = await supabase
        .from("restaurants")
        .select(`
			id,
			nombre,
			activo
		`)
        .eq("tenant_id", tenantId)
        .eq("activo", true)
        .order("nombre", {
            ascending: true
        });

    if (error) {
        console.error("Error cargando sucursales para empleados:", error);

        employeeBranches.innerHTML = `
			<div class="alert alert-danger">
				No fue posible cargar las sucursales.
			</div>
		`;

        return;
    }

    sucursales = data ?? [];
    renderSucursales();
}


// =====================================================
// MOSTRAR SUCURSALES EN MODAL
// =====================================================

function renderSucursales() {

    employeeBranches.innerHTML = "";


    if (!sucursales.length) {

        employeeBranches.innerHTML = `
            <div class="alert alert-warning mb-0">
                No existen sucursales activas.
            </div>
        `;

        return;
    }


    sucursales.forEach(sucursal => {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "form-check border rounded p-3 mb-2";


        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";

        checkbox.className =
            "form-check-input ms-0 me-3 employee-branch";

        checkbox.value =
            sucursal.id;

        checkbox.id =
            `branch-${sucursal.id}`;


        const label =
            document.createElement("label");

        label.className =
            "form-check-label fw-medium";

        label.htmlFor =
            checkbox.id;

        label.textContent =
            sucursal.nombre;


        wrapper.append(
            checkbox,
            label
        );


        employeeBranches.appendChild(
            wrapper
        );

    });
}

// =====================================================
// OBTENER SUCURSALES SELECCIONADAS
function obtenerSucursalesSeleccionadas() {
    return [...employeeBranches.querySelectorAll(".employee-branch:checked")]
        .map(({ value }) => value);
}

// =====================================================
// CREAR EMPLEADO
employeeForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const nombre = employeeName.value.trim();
    const email = employeeEmail
        .value
        .trim()
        .toLowerCase();

    const telefono = employeePhone.value.trim();
    const role = employeeRole.value;
    const restaurantIds = obtenerSucursalesSeleccionadas();

    // =============================================
    // VALIDACIONES FRONTEND
    if (!nombre || !email || !role) {
        await mostrarAdvertencia("Información incompleta", "Completa los campos obligatorios.");
        return;
    }

    if (!restaurantIds.length) {
        await mostrarAdvertencia("Información incompleta", "Completa los campos obligatorios.");
        return;
    }

    createEmployeeBtn.disabled = true;

    const textoOriginal = createEmployeeBtn.innerHTML;

    createEmployeeBtn.innerHTML = `
            <span
                class="spinner-border spinner-border-sm me-2"
            ></span>
            Creando...
        `;

    try {
        const { data: result, error } = await supabase.functions.invoke(
            "crear-empleado",
            {
                body: {
                    nombre,
                    email,
                    telefono: telefono || null,
                    role,
                    restaurantIds
                }
            }
        );

        if (error) {
            console.error("Error Edge Function:", error);

            let detalle = null;

            if (error.context) {
                try {
                    detalle = await error.context.json();
                } catch {
                    // La respuesta no contenía JSON
                }
            }

            throw new Error(
                detalle?.error ??
                error.message ??
                "No fue posible crear el empleado."
            );
        }

        if (!result?.success) {
            throw new Error(
                result?.error ??
                "No fue posible crear el empleado."
            );
        }

        employeeForm.reset();

        const modal = bootstrap.Modal.getInstance(employeeModal);
        modal?.hide();

        await cargarEmpleados();

        mostrarCredenciales(result);

    } catch (error) {
        console.error("Error creando empleado:", error);
        await mostrarError("No pudimos crear el empleado", error?.message ?? "No fue posible completar el registro.");

    } finally {
        createEmployeeBtn.disabled = false;
        createEmployeeBtn.innerHTML = textoOriginal;
    }

}
);


// =====================================================
// LISTAR EMPLEADOS
// =====================================================

async function cargarEmpleados() {

    if (!tenantId) {
        return;
    }


    employeesList.innerHTML = `
        <div class="text-center py-4">

            <div
                class="spinner-border spinner-border-sm"
                role="status"
            ></div>

            <span class="ms-2">
                Cargando empleados...
            </span>

        </div>
    `;


    try {

        // =============================================
        // MIEMBROS
        // =============================================

        const {
            data: members,
            error: membersError
        } =
            await supabase
                .from(
                    "tenant_members"
                )
                .select(`
                    id,
                    user_id,
                    role,
                    activo,
                    created_at
                `)
                .eq("tenant_id", tenantId)
                .eq("role", "staff")
                .order("created_at", {
                    ascending: true
                });


        if (membersError) {
            throw membersError;
        }


        if (!members?.length) {

            renderEmpleados([]);

            return;
        }


        // =============================================
        // IDS
        // =============================================

        const memberIds =
            members.map(
                member => member.id
            );


        const userIds =
            members.map(
                member => member.user_id
            );


        // =============================================
        // PROFILES + ASIGNACIONES
        // =============================================

        const [
            profilesResult,
            assignmentsResult
        ] =
            await Promise.all([

                supabase
                    .from(
                        "profiles"
                    )
                    .select(`
                        id,
                        nombre,
                        telefono,
                        activo,
                        must_change_password
                    `)
                    .in(
                        "id",
                        userIds
                    ),

                supabase
                    .from(
                        "restaurant_members"
                    )
                    .select(`
                        id,
                        tenant_member_id,
                        restaurant_id,
                        role,
                        activo,
                        restaurants (
                            id,
                            nombre
                        )
                    `)
                    .in(
                        "tenant_member_id",
                        memberIds
                    )

            ]);


        if (
            profilesResult.error
        ) {

            throw profilesResult.error;
        }


        if (
            assignmentsResult.error
        ) {

            throw assignmentsResult.error;
        }


        // =============================================
        // MAP PROFILE
        // =============================================

        const profilesMap =
            new Map(
                (
                    profilesResult.data ??
                    []
                ).map(
                    profile => [
                        profile.id,
                        profile
                    ]
                )
            );


        // =============================================
        // MAP ASSIGNMENTS
        // =============================================

        const assignmentsMap =
            new Map();


        for (
            const assignment
            of assignmentsResult.data ??
            []
        ) {

            const key =
                assignment.tenant_member_id;


            if (
                !assignmentsMap.has(
                    key
                )
            ) {

                assignmentsMap.set(
                    key,
                    []
                );
            }


            assignmentsMap
                .get(key)
                .push(
                    assignment
                );
        }


        // =============================================
        // MODELO FINAL
        // =============================================

        const empleados =
            members.map(
                member => ({

                    ...member,

                    profile:
                        profilesMap.get(
                            member.user_id
                        ) ?? null,

                    restaurant_members:
                        assignmentsMap.get(
                            member.id
                        ) ?? []

                })
            );


        console.log(
            "Empleados:",
            empleados
        );


        renderEmpleados(
            empleados
        );


    } catch (error) {

        console.error(
            "Error cargando empleados:",
            error
        );


        employeesList.innerHTML = `
            <div class="alert alert-danger">

                <i
                    class="
                        bi
                        bi-exclamation-triangle
                        me-2
                    "
                ></i>

                No fue posible cargar los empleados.

            </div>
        `;
    }
}

// =====================================================
// RENDER EMPLEADOS
// =====================================================

function renderEmpleados(empleados) {

    employeesList.innerHTML = "";

    if (!empleados.length) {
        employeesList.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-body text-center py-5">
                    <i
                        class="
                            bi bi-people
                            fs-1
                            text-secondary
                        "
                    ></i>
                    <h3 class="h6 mt-3">
                        Aún no tienes empleados
                    </h3>
                    <p class="text-secondary mb-0">
                        Registra tu primer empleado para comenzar.
                    </p>
                </div>
            </div>
        `;
        return;
    }

    empleados.forEach(
        empleado => {

            const card =
                document.createElement("div");

            card.className =
                "card border-0 shadow-sm mb-3";

            const asignacionesActivas = (empleado.restaurant_members ?? [])
                .filter(item => item.activo);

            const sucursalesHTML = asignacionesActivas.length
                ? asignacionesActivas.map(item => `
                        <span class="badge text-bg-light border me-1 mb-1">
                            <i class="bi bi-shop me-1"></i>
                            ${escaparHTML(item.restaurants?.nombre ?? "Sucursal")}
                            · ${escaparHTML(nombreRol(item.role))}
                        </span>
                    `).join("")
                : `<span class="text-secondary">Sin sucursales asignadas</span>`;

            card.innerHTML = `

                <div class="card-body">

                    <div
                        class="
                            d-flex
                            justify-content-between
                            align-items-start
                            gap-3
                        "
                    >

                        <div>

                            <h3 class="h6 mb-1">

                                ${escaparHTML(
                empleado.profile?.nombre ??
                "Empleado"
            )
                }

                            </h3>


                            <div class="mb-2">

                                <span
                                    class="
                                        badge
                                        ${empleado.activo
                    ? "text-bg-success"
                    : "text-bg-secondary"
                }
                                    "
                                >

                                    ${empleado.activo
                    ? "Activo"
                    : "Inactivo"
                }

                                </span>

                            </div>


                            ${empleado.profile?.telefono
                    ? `
                                        <p
                                            class="
                                                text-secondary
                                                small
                                                mb-2
                                            "
                                        >
                                            <i
                                                class="
                                                    bi bi-telephone
                                                    me-1
                                                "
                                            ></i>

                                            ${escaparHTML(
                        empleado.profile.telefono
                    )
                    }

                                        </p>
                                    `
                    : ""
                }


                            <div>
                                ${sucursalesHTML}
                            </div>

                        </div>
                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm editar-empleado"
                            data-employee-id="${empleado.id}"
                        >
                            <i class="bi bi-pencil"></i>
                            Editar
                        </button>
                    </div>
                </div>
            `;
            employeesList.appendChild(
                card
            );
        }
    );
}

async function abrirEditarEmpleado(memberId) {
    if (!tenantId || !memberId) return;

    mostrarCargando("Cargando empleado...");

    try {
        const { data: member, error: memberError } = await supabase
            .from("tenant_members")
            .select("id,user_id,activo")
            .eq("id", memberId)
            .eq("tenant_id", tenantId)
            .maybeSingle();

        if (memberError) throw memberError;
        if (!member) throw new Error("Empleado no encontrado.");

        const [profileResult, assignmentsResult] = await Promise.all([
            supabase
                .from("profiles")
                .select("id,nombre,telefono")
                .eq("id", member.user_id)
                .maybeSingle(),

            supabase
                .from("restaurant_members")
                .select("restaurant_id,role,activo")
                .eq("tenant_member_id", member.id)
        ]);

        if (profileResult.error) throw profileResult.error;
        if (assignmentsResult.error) throw assignmentsResult.error;

        const asignaciones = (assignmentsResult.data ?? []).filter(item => item.activo);

        editEmployeeMemberId.value = member.id;
        editEmployeeName.value = profileResult.data?.nombre ?? "";
        editEmployeePhone.value = profileResult.data?.telefono ?? "";
        editEmployeeRole.value = asignaciones[0]?.role ?? "staff";
        editEmployeeActive.value = String(member.activo);

        renderSucursalesEdicion(asignaciones);

        cerrarCargando();
        bootstrap.Modal.getOrCreateInstance(editEmployeeModal).show();

    } catch (error) {
        cerrarCargando();
        await mostrarError(
            "No pudimos cargar el empleado",
            error?.message === "Empleado no encontrado."
                ? error.message
                : "Ocurrió un problema consultando su información."
        );
    }
}

function renderSucursalesEdicion(asignaciones = []) {
    const seleccionadas = new Set(asignaciones.map(({ restaurant_id }) => restaurant_id));

    if (!sucursales.length) {
        editEmployeeBranches.innerHTML = `
            <div class="alert alert-warning mb-0">
                No existen sucursales activas.
            </div>`;
        return;
    }

    editEmployeeBranches.innerHTML = sucursales.map(sucursal => `
        <div class="form-check border rounded p-3 mb-2">
            <input
                type="checkbox"
                class="form-check-input ms-0 me-3 edit-employee-branch"
                id="edit-branch-${sucursal.id}"
                value="${sucursal.id}"
                ${seleccionadas.has(sucursal.id) ? "checked" : ""}
            >
            <label class="form-check-label fw-medium" for="edit-branch-${sucursal.id}">
                ${escaparHTML(sucursal.nombre)}
            </label>
        </div>
    `).join("");
}

function obtenerSucursalesEdicion() {
    return [...editEmployeeBranches.querySelectorAll(".edit-employee-branch:checked")]
        .map(({ value }) => value);
}

employeesList.addEventListener("click", event => {
    const editar = event.target.closest(".editar-empleado");
    if (editar) abrirEditarEmpleado(editar.dataset.employeeId);
});

editEmployeeForm.addEventListener("submit", guardarEdicionEmpleado);

async function guardarEdicionEmpleado(event) {
    event.preventDefault();

    const empleado = {
        memberId: editEmployeeMemberId.value,
        nombre: editEmployeeName.value.trim(),
        telefono: editEmployeePhone.value.trim(),
        role: editEmployeeRole.value,
        activo: editEmployeeActive.value === "true",
        restaurantIds: obtenerSucursalesEdicion()
    };

    if (!empleado.memberId || !empleado.nombre || !empleado.role) {
        await mostrarAdvertencia(
            "Información incompleta",
            "Completa los campos obligatorios."
        );
        return;
    }

    if (empleado.activo && !empleado.restaurantIds.length) {
        await mostrarAdvertencia(
            "Sucursal requerida",
            "Un empleado activo debe tener al menos una sucursal asignada."
        );
        return;
    }

    const contenidoOriginal = saveEmployeeBtn.innerHTML;

    try {
        saveEmployeeBtn.disabled = true;
        saveEmployeeBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Guardando...
        `;

        const { error } = await supabase.rpc("actualizar_empleado", {
            p_tenant_member_id: empleado.memberId,
            p_nombre: empleado.nombre,
            p_telefono: empleado.telefono || null,
            p_role: empleado.role,
            p_restaurant_ids: empleado.restaurantIds,
            p_activo: empleado.activo
        });

        if (error) throw error;

        bootstrap.Modal.getInstance(editEmployeeModal)?.hide();

        await cargarEmpleados();

        await Swal.fire({
            icon: "success",
            title: "Empleado actualizado",
            html: `
                <strong>${escaparHTML(empleado.nombre)}</strong>
                <p class="text-secondary mt-2 mb-0">
                    Los cambios fueron guardados correctamente.
                </p>
            `,
            confirmButtonText: "Continuar",
            confirmButtonColor: "#2563eb"
        });

    } catch (error) {
        await manejarErrorEdicionEmpleado(error);
    } finally {
        saveEmployeeBtn.disabled = false;
        saveEmployeeBtn.innerHTML = contenidoOriginal;
    }
}
// =====================================================
// NOMBRE DE ROLES
function nombreRol(role) {

    const roles = {

        manager:
            "Gerente",

        supervisor:
            "Supervisor",

        cashier:
            "Cajero",

        staff:
            "Empleado"

    };


    return roles[role] ?? role;
}

// =====================================================
// MOSTRAR CREDENCIALES TEMPORALES
async function mostrarCredenciales(result) {
    if (!result.temporaryPassword) {
        await Swal.fire({
            icon: "success",
            title: "Empleado creado",
            text: "El empleado fue registrado correctamente.",
            confirmButtonText: "Aceptar"
        });

        return;
    }

    const email = result.email;
    const password = result.temporaryPassword;

    await Swal.fire({
        icon: "success",
        title: "Empleado creado correctamente",
        width: 600,
        html: `
			<div class="employee-credentials">
				<p class="text-secondary mb-4">
					Guarda estas credenciales. La contraseña temporal
					solo se mostrará en este momento.
				</p>

				<div class="credential-box">
					<div class="credential-label">
						<i class="bi bi-person me-2"></i>
						Usuario
					</div>

					<div class="credential-value">
						${escaparHTML(email)}
					</div>
				</div>

				<div class="credential-box mt-3">
					<div class="credential-label">
						<i class="bi bi-key me-2"></i>
						Contraseña temporal
					</div>

					<div class="credential-value credential-password">
						${escaparHTML(password)}
					</div>
				</div>

				<div class="alert alert-warning mt-4 mb-0 text-start">
					<i class="bi bi-exclamation-triangle me-2"></i>
					El empleado deberá cambiar esta contraseña
					en su primer inicio de sesión.
				</div>

				<div class="d-grid gap-2 mt-4">
					<button
						type="button"
						id="copyPasswordBtn"
						class="btn btn-outline-primary"
					>
						<i class="bi bi-clipboard me-2"></i>
						Copiar contraseña
					</button>

					<button
						type="button"
						id="copyCredentialsBtn"
						class="btn btn-outline-secondary"
					>
						<i class="bi bi-copy me-2"></i>
						Copiar credenciales
					</button>
				</div>
			</div>
		`,
        confirmButtonText: "Listo",
        didOpen: () => {
            document
                .getElementById("copyPasswordBtn")
                .addEventListener("click", async () => {
                    await copiarTexto(password);

                    mostrarToast(
                        "Contraseña copiada"
                    );
                });

            document
                .getElementById("copyCredentialsBtn")
                .addEventListener("click", async () => {
                    const texto =
                        `Usuario: ${email}\n` +
                        `Contraseña temporal: ${password}`;

                    await copiarTexto(texto);

                    mostrarToast(
                        "Credenciales copiadas"
                    );
                });
        }
    });
}

async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
    } catch {
        const textarea =
            document.createElement("textarea");

        textarea.value = texto;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.select();

        document.execCommand("copy");

        textarea.remove();
    }
}

employeeName.addEventListener(
    "blur",
    generarEmailSugerido
);

function generarEmailSugerido() {
    const usuario = normalizarUsuario(employeeName.value);

    if (!usuario || !tenant?.slug) {
        return;
    }

    if (employeeEmail.value.trim()) {
        return;
    }

    employeeEmail.value =
        `${usuario}@${tenant.slug}.com`;
}

function normalizarUsuario(nombre) {
    return nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(".");
}

// =====================================================
// EVENTOS DEL SISTEMA
// =====================================================
document.addEventListener(
    "sucursales:actualizadas",
    async event => {

        // El módulo todavía no está inicializado
        if (!tenantId) {
            return;
        }


        // Evento inválido o sin contexto de tenant
        if (!event.detail?.tenantId) {
            return;
        }


        // El evento pertenece a otro tenant
        if (event.detail.tenantId !== tenantId) {
            return;
        }


        await cargarSucursalesEmpleado();
    }
);

async function manejarErrorEdicionEmpleado(error) {
    const mensaje = error?.message?.toLowerCase() ?? "";

    if (mensaje.includes("permis")) {
        return mostrarError(
            "Sin permisos",
            "Tu cuenta no tiene permisos para modificar este empleado."
        );
    }

    if (mensaje.includes("sucursal")) {
        return mostrarError(
            "Sucursal no disponible",
            "Una de las sucursales seleccionadas ya no está disponible."
        );
    }

    if (mensaje.includes("rol")) {
        return mostrarError(
            "Rol no válido",
            "El rol seleccionado no es válido."
        );
    }

    return mostrarError(
        "No pudimos actualizar el empleado",
        "Ocurrió un problema guardando los cambios."
    );
}