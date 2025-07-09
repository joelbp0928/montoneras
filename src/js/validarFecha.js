// validarFecha.js
export function isValidDate(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return false;

  // Solo acepta formato YYYY-MM-DD
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(fechaStr)) return false;

  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return false;

  // Verifica que tenga al menos 5 años de edad
  const hoy = new Date();
  const edad = hoy.getFullYear() - fecha.getFullYear();
  return edad >= 5;
}

export function convertirFechaParaInput(fecha) {
  if (!fecha) return "";

  // Si ya viene en formato yyyy-mm-dd (como de Supabase), la devolvemos tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;

  // Si viene en formato dd-mm-yyyy
  if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) {
    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
  }

  // Intentar parsear como Date
  const date = new Date(fecha);
  if (!isNaN(date)) {
    return date.toISOString().split("T")[0];
  }

  return "";
}

export function formatearFechaNacimiento(fecha) {
  if (!fecha) return 'N/A';

  try {
    if (fecha.toDate) {
      // Firebase Timestamp
      const dateObj = fecha.toDate();
      const dia = String(dateObj.getDate()).padStart(2, '0');
      const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
      const anio = dateObj.getFullYear();
      return `${dia}-${mes}-${anio}`;
    }

    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      // Si es una fecha ISO tipo '2001-12-02'
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}-${mes}-${anio}`;
    }

    // fallback: parsear como fecha normal
    const dateObj = new Date(fecha);
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const anio = dateObj.getFullYear();
    return `${dia}-${mes}-${anio}`;
  } catch {
    return 'N/A';
  }
}
