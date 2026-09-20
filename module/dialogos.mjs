/** Envoltorios de DialogV2, para no repetir su API en cada llamada. */
const DialogV2 = foundry.applications.api.DialogV2;
const CLASES = ["ruido-blanco", "rb-dialogo"];

/** Formulario: devuelve el objeto de datos, o null si se cancela. */
export async function formulario({ titulo, contenido, aceptar = "Aceptar", ancho = 460 }) {
  return DialogV2.prompt({
    window: { title: titulo },
    classes: CLASES,
    position: { width: ancho },
    content: contenido,
    ok: {
      label: aceptar,
      callback: (_evento, boton) => new foundry.applications.ux.FormDataExtended(boton.form).object
    },
    rejectClose: false
  });
}

/** Elección entre botones: devuelve el id del botón pulsado, o null. */
export async function pedir({ titulo, contenido, botones, ancho = 460 }) {
  return DialogV2.wait({
    window: { title: titulo },
    classes: CLASES,
    position: { width: ancho },
    content: contenido,
    buttons: botones.map(b => ({ action: b.id, label: b.label, default: b.default })),
    rejectClose: false,
    close: () => null
  });
}

/** Confirmación simple. */
export async function confirmar({ titulo, contenido }) {
  return DialogV2.confirm({ window: { title: titulo }, classes: CLASES, content: contenido, rejectClose: false });
}

/** Una línea de texto. */
export async function preguntarTexto({ titulo, etiqueta, valor = "", ayuda = "", aceptar = "Guardar" }) {
  const datos = await formulario({
    titulo, aceptar,
    contenido: `<div class="rb-dialog">
      ${ayuda ? `<p class="rb-lead">${ayuda}</p>` : ""}
      <div><label>${etiqueta}</label><input type="text" name="valor" value="${foundry.utils.escapeHTML(valor)}" autofocus></div>
    </div>`
  });
  return datos?.valor?.trim() || null;
}
