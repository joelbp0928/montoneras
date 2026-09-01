import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = [
  "https://sistema-de-puntos.web.app",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

function getCorsHeaders(req) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function jsonResponse(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(req),
  });
}

function randomString(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values)
    .map((value) => chars[value % chars.length])
    .join("");
}

function generarPasswordTemporal() {
  return "Aa1!" + randomString(12);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: getCorsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Método no permitido." }, 405);
  }

  let createdUserId = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRole) {
      throw new Error("Configuración interna incompleta.");
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "No autorizado." }, 401);
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse(req, { error: "Sesión inválida o expirada." }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: ownerMember, error: ownerError } = await supabaseAdmin
      .from("tenant_members")
      .select("id, tenant_id, role, activo")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .eq("activo", true)
      .maybeSingle();

    if (ownerError || !ownerMember) {
      return jsonResponse(
        req,
        {
          error: "No tienes permisos para crear empleados.",
        },
        403,
      );
    }

    const { nombre, email, telefono, role, restaurantIds } = await req.json();

    if (
      typeof nombre !== "string" ||
      typeof email !== "string" ||
      typeof role !== "string" ||
      !Array.isArray(restaurantIds)
    ) {
      return jsonResponse(req, { error: "Datos inválidos." }, 400);
    }

    const cleanName = nombre.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = typeof telefono === "string" ? telefono.trim() : null;

    const allowedRoles = ["manager", "supervisor", "cashier", "staff"];

    if (!cleanName || !cleanEmail) {
      return jsonResponse(
        req,
        {
          error: "Nombre y correo son obligatorios.",
        },
        400,
      );
    }

    if (!allowedRoles.includes(role)) {
      return jsonResponse(
        req,
        {
          error: "Rol no permitido.",
        },
        400,
      );
    }

    const uniqueRestaurantIds = [...new Set(restaurantIds)];

    if (!uniqueRestaurantIds.length) {
      return jsonResponse(
        req,
        {
          error: "Selecciona al menos una sucursal.",
        },
        400,
      );
    }

    const { data: restaurants, error: restaurantsError } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .in("id", uniqueRestaurantIds)
      .eq("tenant_id", ownerMember.tenant_id)
      .eq("activo", true);

    if (restaurantsError) {
      throw restaurantsError;
    }

    if (!restaurants || restaurants.length !== uniqueRestaurantIds.length) {
      return jsonResponse(
        req,
        {
          error: "Una o más sucursales no pertenecen a tu negocio.",
        },
        403,
      );
    }

    const temporaryPassword = generarPasswordTemporal();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          nombre: cleanName,
          account_type: "staff",
        },
      });

    if (authError) {
      console.error("Error creando usuario Auth:", authError);

      const mensaje = authError.message?.toLowerCase() ?? "";

      if (
        mensaje.includes("already") ||
        mensaje.includes("registered") ||
        mensaje.includes("exists")
      ) {
        return jsonResponse(
          req,
          {
            success: false,
            error: "Ya existe un usuario registrado con este correo.",
          },
          409,
        );
      }

      throw authError;
    }

    if (!authData.user) {
      throw new Error("Supabase no devolvió el usuario creado.");
    }

    createdUserId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdUserId,
        nombre: cleanName,
        telefono: cleanPhone || null,
        activo: true,
        must_change_password: true,
      });

    if (profileError) {
      throw profileError;
    }

    const { data: tenantMember, error: memberError } = await supabaseAdmin
      .from("tenant_members")
      .insert({
        tenant_id: ownerMember.tenant_id,
        user_id: createdUserId,
        role: "staff",
        activo: true,
      })
      .select("id")
      .single();

    if (memberError || !tenantMember) {
      throw (
        memberError ??
        new Error("No fue posible asignar el empleado al negocio.")
      );
    }

    const assignments = uniqueRestaurantIds.map((restaurantId) => ({
      tenant_member_id: tenantMember.id,
      restaurant_id: restaurantId,
      role,
      activo: true,
    }));

    const { error: assignmentsError } = await supabaseAdmin
      .from("restaurant_members")
      .insert(assignments);

    if (assignmentsError) {
      throw assignmentsError;
    }

    return jsonResponse(
      req,
      {
        success: true,
        employeeId: createdUserId,
        email: cleanEmail,
        temporaryPassword,
      },
      201,
    );
} catch (error) {
	console.error("=================================");
	console.error("ERROR CREAR EMPLEADO");
	console.error("Error completo:", error);
	console.error("=================================");

	let mensaje = "Error interno.";

	if (error && typeof error === "object" && "message" in error) {
		mensaje = String(error.message);
	} else if (typeof error === "string") {
		mensaje = error;
	}

	if (createdUserId) {
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

		if (supabaseUrl && serviceRole) {
			const supabaseAdmin = createClient(supabaseUrl, serviceRole);

			const { error: rollbackError } =
				await supabaseAdmin.auth.admin.deleteUser(createdUserId);

			if (rollbackError) {
				console.error("Error rollback:", rollbackError);
			}
		}
	}

	return jsonResponse(req, {
		success: false,
		error: mensaje
	}, 500);
}
});
