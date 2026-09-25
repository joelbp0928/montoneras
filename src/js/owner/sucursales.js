import { supabase } from "../config-supabase.js";
import { escaparHTML } from "../shared/utils.js";
import { mostrarError, mostrarAdvertencia, mostrarCargando, cerrarCargando } from "../shared/alertas.js";

// =====================================================
let tenantId = null;

let sucursalesCache = [];
let sloganGeneral = null;

// =====================================================
// DOM
const branches = document.getElementById("branches");
const branchForm = document.getElementById("branchForm");
const branchName = document.getElementById("branchName");
const branchSlug = document.getElementById("branchSlug");
const branchPhone = document.getElementById("branchPhone");
const branchEmail = document.getElementById("branchEmail");
const editBranchModal = document.getElementById("editBranchModal");
const editBranchForm = document.getElementById("editBranchForm");
const editBranchId = document.getElementById("editBranchId");
const editBranchName = document.getElementById("editBranchName");
const editBranchSlug = document.getElementById("editBranchSlug");
const editBranchPhone = document.getElementById("editBranchPhone");
const editBranchEmail = document.getElementById("editBranchEmail");
const saveBranchBtn = document.getElementById("saveBranchBtn");

const sloganForm = document.getElementById("sloganForm");
const businessSlogan = document.getElementById("businessSlogan");
const sloganAllBranches = document.getElementById("sloganAllBranches");
const sloganSelectedBranches = document.getElementById("sloganSelectedBranches");
const sloganBranchesContainer = document.getElementById("sloganBranchesContainer");
const saveSloganBtn = document.getElementById("saveSloganBtn");

const editBranchCurrentSlogan = document.getElementById("editBranchCurrentSlogan");
const editBranchSloganType = document.getElementById("editBranchSloganType");
const editBranchCustomSloganContainer = document.getElementById("editBranchCustomSloganContainer");

// =====================================================
// INICIALIZAR
let moduloInicializado = false;

export async function iniciarModuloSucursales(idTenant) {

    if (!idTenant) {
        return;
    }

    tenantId = idTenant;

    if (!moduloInicializado) {

        configurarFormularioSucursal();
        configurarFormularioSlogan();

        moduloInicializado = true;
    }

    await Promise.all([
        cargarSloganGeneral(),
        cargarSucursales()
    ]);
}

// =====================================================
// CONFIGURAR FORMULARIO
function configurarFormularioSucursal() {
    branchForm.addEventListener("submit", crearSucursal);
}

// =====================================================
// CREAR SUCURSAL
async function crearSucursal(event) {

    event.preventDefault();

    if (!tenantId) {
        await mostrarError("Negocio no encontrado",
            "No pudimos identificar el negocio."
        );

        return;
    }


    const nombre = branchName.value.trim();
    const slug = normalizarSlug(branchSlug.value);
    const telefono = branchPhone.value.trim();
    const email = branchEmail.value.trim().toLowerCase();

    if (!nombre || !slug) {
        await mostrarAdvertencia(
            "Información incompleta",
            "El nombre y el identificador de la sucursal son obligatorios."
        );

        return;
    }


    // =====================================================
    // CONFIRMACIÓN
    const confirmacion = await Swal.fire({

        icon: "question",

        title: "¿Crear nueva sucursal?",

        html: `
                <div class="branch-confirmation">

                    <div class="branch-confirmation-row">
                        <span>Nombre</span>
                        <strong>${escaparHTML(nombre)}</strong>
                    </div>

                    <div class="branch-confirmation-row">
                        <span>Identificador</span>
                        <strong>${escaparHTML(slug)}</strong>
                    </div>

                    <div class="branch-confirmation-row">
                        <span>Correo</span>
                        <strong>${escaparHTML(email || "No especificado")}</strong>
                    </div>

                    <div class="branch-confirmation-row">
                        <span>Teléfono</span>
                        <strong>${escaparHTML(telefono || "No especificado")}</strong>
                    </div>

                </div>
            `,

        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-plus-lg"></i> Crear sucursal',
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#2563eb",
        reverseButtons: true
    });

    if (!confirmacion.isConfirmed)
        return;

    // =====================================================
    // VERIFICAR SLUG
    const { data: existingBranch, error: validationError } = await supabase
        .from("restaurants")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("slug", slug)
        .maybeSingle();


    if (validationError) {
        await mostrarError(
            "No pudimos validar la sucursal",
            "Ocurrió un problema verificando el identificador."
        );

        return;
    }


    if (existingBranch) {

        await mostrarError(
            "La sucursal ya existe",
            `Ya existe una sucursal con el identificador "${slug}".`
        );

        branchSlug.focus();

        return;
    }


    mostrarCargando(
        "Creando sucursal..."
    );


    // =====================================================
    // CREAR RESTAURANTE
    // =====================================================

    const {
        data: restaurant,
        error
    } =
        await supabase
            .from("restaurants")
            .insert({
                tenant_id: tenantId,
                nombre,
                slug,
                telefono: telefono || null,
                email: email || null
            })
            .select()
            .single();


    if (error) {

        cerrarCargando();;


        if (error.code === "23505") {

            await mostrarError(
                "La sucursal ya existe",
                `El identificador "${slug}" ya está registrado.`
            );

            return;
        }


        if (error.code === "42501") {

            await mostrarError(
                "Sin permisos",
                "Tu cuenta no tiene permisos para crear sucursales."
            );

            return;
        }


        await mostrarError(
            "No pudimos crear la sucursal",
            "Ocurrió un problema guardando la información."
        );

        return;
    }


    // =====================================================
    // CREAR BRANDING
    // =====================================================

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

        cerrarCargando();;

        await mostrarAdvertencia(
            "Sucursal creada parcialmente",
            "La sucursal fue creada, pero ocurrió un problema configurando su apariencia."
        );

        await cargarSucursales();

        return;
    }


    // =====================================================
    // ACTUALIZAR INTERFAZ
    // =====================================================

    branchForm.reset();
    await cargarSucursales();

    notificarSucursalesActualizadas();

    cerrarCargando();;

    // =====================================================
    // ÉXITO
    // =====================================================

    await Swal.fire({

        icon: "success",

        title: "Sucursal creada",

        html: `

            <div class="branch-created-summary">

                <p>
                    La sucursal fue registrada correctamente.
                </p>

                <div class="branch-created-card">

                    <div class="branch-created-icon">
                        <i class="bi bi-shop"></i>
                    </div>

                    <div class="branch-created-info">

                        <strong>
                            ${escaparHTML(restaurant.nombre)}
                        </strong>

                        <span>
                            <i class="bi bi-envelope"></i>
                            ${escaparHTML(restaurant.email || "Sin correo")}
                        </span>

                        <span>
                            <i class="bi bi-telephone"></i>
                            ${escaparHTML(restaurant.telefono || "Sin teléfono")}
                        </span>

                        <span>
                            <i class="bi bi-link-45deg"></i>
                            ${escaparHTML(restaurant.slug)}
                        </span>

                    </div>

                </div>

            </div>
        `,

        confirmButtonText:
            "Continuar",

        confirmButtonColor:
            "#2563eb"
    });
}

function configurarFormularioSlogan() {
    sloganAllBranches?.addEventListener(
        "change",
        actualizarScopeSlogan
    );

    sloganSelectedBranches?.addEventListener(
        "change",
        actualizarScopeSlogan);

    sloganForm?.addEventListener("submit", guardarSlogan);
}

function actualizarScopeSlogan() {
    const seleccionar = sloganSelectedBranches.checked;

    sloganBranchesContainer.hidden = !seleccionar;

    if (seleccionar) {
        renderSucursalesSlogan();
    }
}

async function cargarSloganGeneral() {
    const currentBusinessSlogan = document.getElementById("currentBusinessSlogan");

    const { data, error } = await supabase
        .from("tenants")
        .select("slogan")
        .eq("id", tenantId)
        .maybeSingle();

    if (error) {
        console.error("Error cargando slogan general:", error);

        return;
    }

    sloganGeneral = data?.slogan ?? null;

    businessSlogan.value = sloganGeneral ?? "";

    currentBusinessSlogan.textContent = sloganGeneral || "Sin slogan configurado";
}

// =====================================================
// CARGAR SUCURSALES
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

    const { data, error } = await supabase
        .from("restaurants")
        .select(`
            id,
            nombre,
            slug,
            telefono,
            email,
            activo,
            created_at,
            branding (
                slogan
            )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", {
            ascending: true
        });

    sucursalesCache = data ?? [];

    if (error) {
        console.error("Error cargando sucursales:", error);
        branches.innerHTML = "";
        await mostrarError("No pudimos cargar las sucursales", "Ocurrió un problema al consultar las sucursales del negocio.");
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

    data.forEach(restaurante => {
        const div = document.createElement("div");

        div.classList.add(
            "restaurante"
        );

        const sloganPersonalizado = restaurante.branding?.slogan ?? null;

        const sloganEfectivo =
            sloganPersonalizado ??
            sloganGeneral ??
            null;

        const tipoSlogan =
            sloganPersonalizado
                ? "Personalizado"
                : sloganGeneral
                    ? "General"
                    : null;

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
                            ${escaparHTML(restaurante.nombre)}
                        </strong>

                        <p>

                            <i class="bi bi-envelope me-2"></i>

                            ${escaparHTML(restaurante.email ?? "Sin correo")}

                        </p>


                        <p>

                            <i class="bi bi-telephone me-2"></i>

                            ${escaparHTML(restaurante.telefono ?? "Sin teléfono")}
                        </p>
                            ${sloganEfectivo ? `
                                <div class="branch-slogan mt-3">
                                    <div class="d-flex align-items-center gap-2 mb-1">
                                        <i class="bi bi-chat-quote text-primary"></i>

                                        <span class="small fw-semibold">
                                            Slogan
                                        </span>

                                        <span class="
                                            badge
                                            ${sloganPersonalizado
                    ? "text-bg-primary"
                    : "text-bg-light border"
                }
                                                                ">
                                                                    ${tipoSlogan}
                                                                </span>
                                                            </div>

                                                            <p class="mb-0 fst-italic">
                                                                “${escaparHTML(sloganEfectivo)}”
                                                            </p>
                                                        </div>
                                                    ` : `
                                                        <p class="text-secondary small mt-3 mb-0">
                                                            <i class="bi bi-chat-quote me-1"></i>
                                                            Sin slogan configurado
                                                        </p>
                                                    `}

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


                    ${restaurante.activo
                ? `
                                <button
                                    type="button"
                                    class="btn btn-outline-danger btn-sm desactivar-sucursal"
                                    data-id="${restaurante.id}"
                                    data-nombre="${escaparHTML(restaurante.nombre)}"
                                >
                                    <i class="bi bi-pause-circle"></i>
                                    Desactivar
                                </button>
                            `
                : `
                                <button
                                    type="button"
                                    class="btn btn-outline-success btn-sm reactivar-sucursal"
                                    data-id="${restaurante.id}"
                                    data-nombre="${escaparHTML(restaurante.nombre)}"
                                >
                                    <i class="bi bi-arrow-clockwise"></i>
                                    Reactivar
                                </button>
                            `
            }

                </div>
            `;

        branches.appendChild(
            div
        );
    }
    );
}

function renderSucursalesSlogan() {
    if (!sucursalesCache.length) {
        sloganBranchesContainer.innerHTML = `
			<div class="text-secondary small">
				No existen sucursales disponibles.
			</div>
		`;

        return;
    }

    sloganBranchesContainer.innerHTML =
        sucursalesCache
            .filter(sucursal => sucursal.activo)
            .map(sucursal => `
				<label class="form-check border rounded p-3 mb-2">
					<input
						type="checkbox"
						class="form-check-input slogan-branch me-2"
						value="${sucursal.id}"
					>

					<span class="form-check-label">
						${escaparHTML(sucursal.nombre)}
					</span>
				</label>
			`)
            .join("");
}

async function guardarSlogan(event) {
    event.preventDefault();

    if (!tenantId) return;

    const slogan =
        businessSlogan.value.trim();

    if (slogan.length > 160) {
        await mostrarAdvertencia(
            "Slogan demasiado largo",
            "El slogan no puede superar los 160 caracteres."
        );

        return;
    }

    const aplicarTodas =
        sloganAllBranches.checked;

    const restaurantIds =
        aplicarTodas
            ? []
            : [
                ...sloganBranchesContainer
                    .querySelectorAll(
                        ".slogan-branch:checked"
                    )
            ].map(item => item.value);

    if (
        !aplicarTodas &&
        !restaurantIds.length
    ) {
        await mostrarAdvertencia(
            "Selecciona una sucursal",
            "Selecciona al menos una sucursal donde aplicar el slogan."
        );

        return;
    }

    const original =
        saveSloganBtn.innerHTML;

    saveSloganBtn.disabled = true;

    saveSloganBtn.innerHTML = `
		<span class="spinner-border spinner-border-sm me-2"></span>
		Guardando...
	`;

    try {
        const { data, error } =
            await supabase.rpc(
                "configurar_slogan",
                {
                    p_tenant_id:
                        tenantId,

                    p_slogan:
                        slogan || null,

                    p_aplicar_todas:
                        aplicarTodas,

                    p_restaurant_ids:
                        restaurantIds
                }
            );

        if (error) {
            throw error;
        }

        if (!data?.success) {
            throw new Error(
                data?.code ??
                "No fue posible guardar el slogan."
            );
        }

        await Promise.all([
            cargarSloganGeneral(),
            cargarSucursales()
        ]);

        bootstrap.Modal
            .getInstance(
                document.getElementById(
                    "sloganModal"
                )
            )
            ?.hide();

        await Swal.fire({
            icon: "success",
            title: "Slogan actualizado",
            text: aplicarTodas
                ? "El slogan se aplicará a todas las sucursales."
                : "El slogan se aplicó a las sucursales seleccionadas.",
            confirmButtonText: "Continuar",
            confirmButtonColor: "#2563eb"
        });

    } catch (error) {
        console.error(
            "Error guardando slogan:",
            error
        );

        await mostrarError(
            "No pudimos guardar el slogan",
            "Ocurrió un problema actualizando la configuración."
        );

    } finally {
        saveSloganBtn.disabled = false;
        saveSloganBtn.innerHTML = original;
    }
}

branches.addEventListener("click", async event => {
    const editar = event.target.closest(".editar");
    const desactivar = event.target.closest(".desactivar-sucursal");
    const reactivar = event.target.closest(".reactivar-sucursal");

    if (editar) return abrirEditarSucursal(editar.dataset.id);
    if (desactivar) return desactivarSucursal(desactivar.dataset.id, desactivar.dataset.nombre);
    if (reactivar) return reactivarSucursal(reactivar.dataset.id, reactivar.dataset.nombre);
});

async function desactivarSucursal(
    restaurantId,
    nombre
) {

    const confirmacion =
        await Swal.fire({

            icon: "warning",

            title: "¿Desactivar sucursal?",

            html: `
                <p>
                    Estás por desactivar:
                </p>

                <strong>
                    ${escaparHTML(nombre)}
                </strong>

                <div class="alert alert-warning text-start mt-4 mb-0">

                    <i class="bi bi-exclamation-triangle me-2"></i>

                    Los empleados perderán el acceso a esta sucursal,
                    pero su información histórica será conservada.

                </div>
            `,

            showCancelButton: true,

            confirmButtonText:
                '<i class="bi bi-pause-circle"></i> Desactivar',

            cancelButtonText:
                "Cancelar",

            confirmButtonColor:
                "#dc3545",

            reverseButtons:
                true
        });


    if (!confirmacion.isConfirmed) {
        return;
    }


    mostrarCargando(
        "Desactivando sucursal..."
    );


    const {
        error
    } =
        await supabase.rpc(
            "desactivar_sucursal",
            {
                p_restaurant_id:
                    restaurantId
            }
        );


    cerrarCargando();;


    if (error) {

        // ==========================================
        // ÚLTIMA SUCURSAL
        // ==========================================

        if (
            error.message?.includes(
                "única sucursal activa"
            )
        ) {

            await mostrarAdvertencia(
                "No puedes desactivar esta sucursal",
                "El negocio debe conservar al menos una sucursal activa."
            );

            return;
        }


        // ==========================================
        // SIN PERMISOS
        // ==========================================

        if (
            error.message?.includes(
                "permisos"
            )
        ) {

            await mostrarError(
                "Sin permisos",
                "Tu cuenta no tiene permisos para realizar esta operación."
            );

            return;
        }


        await mostrarError(
            "No pudimos desactivar la sucursal",
            "Ocurrió un problema al realizar la operación."
        );

        return;
    }


    // =====================================================
    // REFRESCAR MÓDULOS
    // =====================================================
    await cargarSucursales();

    notificarSucursalesActualizadas();

    // =====================================================
    // ÉXITO
    // =====================================================

    await Swal.fire({

        icon:
            "success",

        title:
            "Sucursal desactivada",

        html: `
            <strong>
                ${escaparHTML(nombre)}
            </strong>

            <p class="text-secondary mt-2 mb-0">
                La sucursal fue desactivada correctamente.
                Su información histórica se conserva.
            </p>
        `,

        confirmButtonText:
            "Continuar",

        confirmButtonColor:
            "#2563eb"
    });
}

async function abrirEditarSucursal(restaurantId) {
	if (!tenantId || !restaurantId) return;

	mostrarCargando("Cargando sucursal...");

	try {
		const { data, error } = await supabase
			.from("restaurants")
			.select(`
				id,
				nombre,
				slug,
				telefono,
				email,
				activo,
				branding (
					slogan
				)
			`)
			.eq("id", restaurantId)
			.eq("tenant_id", tenantId)
			.maybeSingle();

		if (error) {
			throw error;
		}

		if (!data) {
			throw new Error(
				"Sucursal no encontrada."
			);
		}

		// ==========================================
		// INFORMACIÓN GENERAL
		// ==========================================

		editBranchId.value =
			data.id;

		editBranchName.value =
			data.nombre ?? "";

		editBranchSlug.value =
			data.slug ?? "";

		editBranchPhone.value =
			data.telefono ?? "";

		editBranchEmail.value =
			data.email ?? "";

		// ==========================================
		// SLOGAN
		// ==========================================

		const sloganPersonalizado =
			data.branding?.slogan ?? "";

		const tieneSloganPersonalizado =
			Boolean(sloganPersonalizado);

		const sloganEfectivo =
			sloganPersonalizado ||
			sloganGeneral ||
			"Sin slogan configurado";

		editBranchCurrentSlogan.textContent =
			sloganEfectivo;

		editBranchSloganType.textContent =
			tieneSloganPersonalizado
				? "Personalizado"
				: "General";

		editBranchSloganType.className =
			tieneSloganPersonalizado
				? "badge text-bg-primary"
				: "badge text-bg-light border";

		editBranchCustomSlogan.checked =
			tieneSloganPersonalizado;

		editBranchCustomSloganContainer.hidden =
			!tieneSloganPersonalizado;

		editBranchSlogan.value =
			sloganPersonalizado;

		cerrarCargando();

		bootstrap.Modal
			.getOrCreateInstance(
				editBranchModal
			)
			.show();

	} catch (error) {
		cerrarCargando();

		console.error(
			"Error cargando sucursal:",
			error
		);

		await mostrarError(
			"No pudimos cargar la sucursal",
			"La información de la sucursal no está disponible."
		);
	}
}

editBranchForm.addEventListener("submit", guardarEdicionSucursal);

async function guardarEdicionSucursal(event) {
    event.preventDefault();

    const id = editBranchId.value;
    const nombre = editBranchName.value.trim();
    const slug = normalizarSlug(editBranchSlug.value);
    const telefono = editBranchPhone.value.trim();
    const email = editBranchEmail.value.trim().toLowerCase();

    const usarSloganPersonalizado =
        editBranchCustomSlogan.checked;

    const slogan =
        editBranchSlogan.value.trim();

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!id || !nombre || !slug) {
        await mostrarAdvertencia(
            "Información incompleta",
            "El nombre y el identificador son obligatorios."
        );

        return;
    }

    if (
        usarSloganPersonalizado &&
        !slogan
    ) {
        await mostrarAdvertencia(
            "Slogan requerido",
            "Escribe un slogan personalizado o desactiva la opción."
        );

        editBranchSlogan.focus();

        return;
    }

    if (slogan.length > 160) {
        await mostrarAdvertencia(
            "Slogan demasiado largo",
            "El slogan no puede superar los 160 caracteres."
        );

        editBranchSlogan.focus();

        return;
    }

    // =====================================================
    // ESTADO DEL BOTÓN
    // =====================================================

    const textoOriginal =
        saveBranchBtn.innerHTML;

    saveBranchBtn.disabled = true;

    saveBranchBtn.innerHTML = `
		<span class="spinner-border spinner-border-sm me-2"></span>
		Guardando...
	`;

    try {
        const {
            data: slugExistente,
            error: validationError
        } = await supabase
            .from("restaurants")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("slug", slug)
            .neq("id", id)
            .maybeSingle();

        if (validationError) {
            throw validationError;
        }

        if (slugExistente) {
            await mostrarError(
                "Identificador no disponible",
                `Ya existe otra sucursal con el identificador "${slug}".`
            );

            return;
        }

        const {
            data,
            error
        } = await supabase
            .from("restaurants")
            .update({
                nombre,
                slug,
                telefono:
                    telefono || null,

                email:
                    email || null,

                updated_at:
                    new Date().toISOString()
            })
            .eq("id", id)
            .eq("tenant_id", tenantId)
            .select(
                "id,nombre,slug,telefono,email"
            )
            .single();

        if (error) {
            if (error.code === "23505") {
                await mostrarError(
                    "Identificador no disponible",
                    `Ya existe otra sucursal con el identificador "${slug}".`
                );

                return;
            }

            if (error.code === "42501") {
                await mostrarError(
                    "Sin permisos",
                    "Tu cuenta no tiene permisos para modificar esta sucursal."
                );

                return;
            }

            throw error;
        }

        const {
            error: brandingError
        } = await supabase
            .from("branding")
            .update({
                slogan:
                    usarSloganPersonalizado
                        ? slogan
                        : null,

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "restaurant_id",
                id
            );

        if (brandingError) {
            throw brandingError;
        }

        bootstrap.Modal
            .getInstance(
                editBranchModal
            )
            ?.hide();

        await cargarSucursales();

        notificarSucursalesActualizadas();

        await Swal.fire({
            icon: "success",
            title: "Sucursal actualizada",
            html: `
				<strong>
					${escaparHTML(data.nombre)}
				</strong>

				<p class="text-secondary mt-2 mb-0">
					Los cambios fueron guardados correctamente.
				</p>
			`,
            confirmButtonText:
                "Continuar",

            confirmButtonColor:
                "#2563eb"
        });

    } catch (error) {
        console.error(
            "Error inesperado actualizando sucursal:",
            error
        );

        await mostrarError(
            "No pudimos actualizar la sucursal",
            "Ocurrió un problema guardando los cambios."
        );

    } finally {
        saveBranchBtn.disabled =
            false;

        saveBranchBtn.innerHTML =
            textoOriginal;
    }
}

// =====================================================
// REACTIVAR SUCURSAL
async function reactivarSucursal(restaurantId, nombre) {
    const confirmacion = await Swal.fire({
        icon: "question",

        title: "¿Reactivar sucursal?",

        html: `
                <p>
                    Estás por reactivar:
                </p>

                <strong>
                    ${escaparHTML(nombre)}
                </strong>

                <div class="alert alert-info text-start mt-4 mb-0">

                    <i class="bi bi-info-circle me-2"></i>

                    La sucursal volverá a estar disponible
                    para operar y podrá ser asignada nuevamente
                    a empleados.

                </div>
            `,

        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-arrow-clockwise"></i> Reactivar',
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#198754",
        reverseButtons: true
    });

    if (!confirmacion.isConfirmed)
        return;

    mostrarCargando("Reactivando sucursal...");

    const { error } = await supabase.rpc(
        "reactivar_sucursal",
        {
            p_restaurant_id:
                restaurantId
        }
    );

    cerrarCargando();

    if (error) {
        if (error.message?.includes("permisos")) {
            await mostrarError("Sin permisos", "Tu cuenta no tiene permisos para reactivar esta sucursal.");
            return;
        }
        if (error.message?.includes("Sucursal no encontrada")) {
            await mostrarError("Sucursal no encontrada", "La sucursal ya no existe o no está disponible.");
            return;
        }
        await mostrarError("No pudimos reactivar la sucursal", "Ocurrió un problema al realizar la operación.");
        return;
    }

    // =============================================
    // ACTUALIZAR SUCURSALES
    await cargarSucursales();

    // Avisar al resto del sistema
    notificarSucursalesActualizadas();

    // =============================================
    // ÉXITO
    await Swal.fire({

        icon: "success",

        title: "Sucursal reactivada",

        html: `

            <strong>
                ${escaparHTML(nombre)}
            </strong>

            <p class="text-secondary mt-2 mb-0">

                La sucursal está nuevamente activa
                y disponible para operar.

            </p>
        `,

        confirmButtonText:
            "Continuar",

        confirmButtonColor:
            "#2563eb"
    });
}

// =====================================================
// UTILIDADES
function normalizarSlug(valor) {
    return valor
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// =====================================================
// EVENTOS DEL MÓDULO
function notificarSucursalesActualizadas() {
    document.dispatchEvent(
        new CustomEvent("sucursales:actualizadas", {
            detail: { tenantId }
        })
    );
}

const editBranchCustomSlogan = document.getElementById("editBranchCustomSlogan");

const editBranchSlogan = document.getElementById("editBranchSlogan");

editBranchCustomSlogan?.addEventListener("change", () => {
    const usarPersonalizado = editBranchCustomSlogan.checked;

    editBranchCustomSloganContainer.hidden = !usarPersonalizado;

    if (usarPersonalizado) {
        editBranchSlogan.focus();
    }
});