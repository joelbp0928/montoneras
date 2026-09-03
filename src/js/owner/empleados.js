import { supabase } from "../config-supabase.js";


// =====================================================
// ESTADO DEL MÓDULO
// =====================================================

let tenantId = null;
let tenant = null;
let sucursales = [];

// =====================================================
// DOM
// =====================================================

const employeeForm =
    document.getElementById("employeeForm");

const employeeName =
    document.getElementById("employeeName");

const employeeEmail =
    document.getElementById("employeeEmail");

const employeePhone =
    document.getElementById("employeePhone");

const employeeRole =
    document.getElementById("employeeRole");

const employeeBranches =
    document.getElementById("employeeBranches");

const employeesList =
    document.getElementById("employeesList");

const createEmployeeBtn =
    document.getElementById("createEmployeeBtn");

const employeeModal =
    document.getElementById("employeeModal");


// =====================================================
// INICIALIZAR MÓDULO
// =====================================================

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

export async function cargarSucursalesEmpleado() {
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
// =====================================================

function obtenerSucursalesSeleccionadas() {

    return [
        ...document.querySelectorAll(
            ".employee-branch:checked"
        )
    ].map(
        checkbox => checkbox.value
    );
}


// =====================================================
// CREAR EMPLEADO
// =====================================================

employeeForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const nombre =
            employeeName.value.trim();

        const email =
            employeeEmail
                .value
                .trim()
                .toLowerCase();

        const telefono =
            employeePhone.value.trim();

        const role =
            employeeRole.value;

        const restaurantIds =
            obtenerSucursalesSeleccionadas();


        // =============================================
        // VALIDACIONES FRONTEND
        // =============================================

        if (
            !nombre ||
            !email ||
            !role
        ) {

            mostrarError(
                "Completa los campos obligatorios."
            );

            return;
        }


        if (!restaurantIds.length) {

            mostrarError(
                "Selecciona al menos una sucursal."
            );

            return;
        }


        createEmployeeBtn.disabled = true;

        const textoOriginal =
            createEmployeeBtn.innerHTML;


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

            mostrarError(
                error.message ??
                "No fue posible crear el empleado."
            );
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


            const asignaciones =
                empleado.restaurant_members ?? [];


            const sucursalesHTML =
                asignaciones.length

                    ? asignaciones
                        .filter(
                            item => item.activo
                        )
                        .map(
                            item => `
                                <span
                                    class="
                                        badge
                                        text-bg-light
                                        border
                                        me-1
                                        mb-1
                                    "
                                >
                                    <i
                                        class="
                                            bi bi-shop
                                            me-1
                                        "
                                    ></i>

                                    ${escaparHTML(
                                item.restaurants?.nombre ??
                                "Sucursal"
                            )
                                }

                                    ·

                                    ${nombreRol(
                                    item.role
                                )
                                }

                                </span>
                            `
                        )
                        .join("")

                    : `
                        <span class="text-secondary">
                            Sin sucursales asignadas
                        </span>
                    `;


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
                            class="
                                btn
                                btn-outline-primary
                                btn-sm
                            "
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


// =====================================================
// NOMBRE DE ROLES
// =====================================================

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
// ESCAPAR HTML
// =====================================================

function escaparHTML(valor) {

    const div =
        document.createElement("div");

    div.textContent =
        valor ?? "";

    return div.innerHTML;
}


// =====================================================
// MENSAJE ERROR
// =====================================================

function mostrarError(texto) {
    Swal.fire({
        icon: "error",
        title: "No se pudo completar la operación",
        text: texto,
        confirmButtonText: "Entendido"
    });
}

// =====================================================
// MOSTRAR CREDENCIALES TEMPORALES
// =====================================================

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

function mostrarToast(texto) {
	Swal.fire({
		toast: true,
		position: "top-end",
		icon: "success",
		title: texto,
		showConfirmButton: false,
		timer: 1800,
		timerProgressBar: true
	});
}