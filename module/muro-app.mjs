/**
 * Muro de investigación. Durante la investigación existen solo dos zonas:
 * PISTAS (hechos) e HIPÓTESIS (frases de los jugadores, tachables).
 * Señal, Ruido e Interferencia no aparecen aquí: se asignan en la Revelación.
 */
import { RB } from "./config.mjs";
import { AJUSTES, SOCKET, estadoCaso, pistas, hipotesis, fijarRuidoFondo, resolverReaccionMayor } from "./caso.mjs";
import { RevelacionApp } from "./revelacion-app.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MuroApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "rb-muro",
    classes: ["ruido-blanco", "rb-app", "rb-muro"],
    window: { title: "RB.Muro.Titulo", icon: "fa-solid fa-diagram-project", resizable: true },
    position: { width: 1080, height: 760 },
    actions: {
      nuevaPista: MuroApp.#nuevaPista,
      nuevaHipotesis: MuroApp.#nuevaHipotesis,
      abrirDoc: MuroApp.#abrirDoc,
      borrarDoc: MuroApp.#borrarDoc,
      alternarDescubierta: MuroApp.#alternarDescubierta,
      alternarDescartada: MuroApp.#alternarDescartada,
      fijarRuido: MuroApp.#fijarRuido,
      reaccionMayor: MuroApp.#reaccionMayor,
      abrirRevelacion: MuroApp.#abrirRevelacion,
      editarCaso: MuroApp.#editarCaso
    }
  };

  static PARTS = {
    main: { template: "systems/ruido-blanco/templates/apps/muro.hbs", scrollable: [".rb-columna-cuerpo"] }
  };

  async _prepareContext() {
    const caso = estadoCaso();
    const esGM = game.user.isGM;
    const verTodas = esGM || game.settings.get(RB.ID, "mostrarPistasJugadores");
    const todas = pistas();
    const visibles = todas.filter(p => esGM || (verTodas && p.system.descubierta));
    const descubiertas = todas.filter(p => p.system.descubierta).length;

    return {
      caso,
      esGM,
      pistas: visibles.map(p => ({
        id: p.id,
        nombre: p.name,
        img: p.img,
        ...p.system,
        clasificada: Boolean(p.system.clasificacion)
      })),
      hipotesis: hipotesis().map(h => ({ id: h.id, nombre: h.name, ...h.system })),
      descubiertas,
      umbralAlcanzado: descubiertas >= caso.umbral,
      faltan: Math.max(0, caso.umbral - descubiertas),
      sobreUmbral: Math.max(0, descubiertas - caso.umbral),
      ruidoTrack: Array.fromRange(RB.RUIDO_FONDO.MAX + 1).map(n => ({
        n,
        activo: n <= caso.ruido,
        reaccion: n === RB.RUIDO_FONDO.REACCION,
        mayor: n === RB.RUIDO_FONDO.REACCION_MAYOR
      })),
      enReaccionMayor: caso.ruido >= RB.RUIDO_FONDO.REACCION_MAYOR
    };
  }

  static async #nuevaPista() {
    if (!game.user.isGM) return;
    const codigo = `P${pistas().length + 1}`;
    const [pista] = await Item.createDocuments([{
      name: `Pista ${codigo}`,
      type: "pista",
      img: "icons/svg/eye.svg",
      system: { codigo }
    }]);
    pista?.sheet.render(true);
  }

  static async #nuevaHipotesis() {
    const texto = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("RB.Muro.NuevaHipotesis") },
      classes: ["ruido-blanco"],
      content: `<form class="rb-dialog">
        <p class="rb-dialog-lead">Ninguna conexión se convierte en verdad por decirla muchas veces.</p>
        <div class="form-group"><label>Hipótesis</label>
        <input type="text" name="texto" placeholder="¿Y si...?" autofocus></div></form>`,
      ok: {
        label: "Colgar en el Muro",
        callback: (_e, b) => new foundry.applications.ux.FormDataExtended(b.form).object.texto
      },
      rejectClose: false
    });
    if (!texto) return;

    const datos = { texto, autor: game.user.name };
    // Los ajustes y documentos de mundo los escribe el GM; el jugador solo pide.
    if (!game.user.can("ITEM_CREATE")) {
      game.socket.emit(SOCKET, { accion: "hipotesis", ...datos });
      return;
    }
    await Item.createDocuments([{
      name: texto.slice(0, 60),
      type: "hipotesis",
      img: "icons/svg/sound.svg",
      system: datos
    }]);
  }

  static #abrirDoc(_event, target) {
    game.items.get(target.closest("[data-id]")?.dataset.id)?.sheet.render(true);
  }

  static async #borrarDoc(_event, target) {
    const doc = game.items.get(target.closest("[data-id]")?.dataset.id);
    await doc?.deleteDialog();
  }

  static async #alternarDescubierta(_event, target) {
    if (!game.user.isGM) return;
    const doc = game.items.get(target.closest("[data-id]")?.dataset.id);
    await doc?.update({ "system.descubierta": !doc.system.descubierta });
  }

  static async #alternarDescartada(_event, target) {
    const doc = game.items.get(target.closest("[data-id]")?.dataset.id);
    if (!doc?.isOwner) return;
    await doc.update({ "system.descartada": !doc.system.descartada });
  }

  static async #fijarRuido(_event, target) {
    if (!game.user.isGM) return;
    await fijarRuidoFondo(Number(target.dataset.valor), "Ajuste del GM");
  }

  static async #reaccionMayor() {
    await resolverReaccionMayor();
  }

  static #abrirRevelacion() {
    new RevelacionApp().render(true);
  }

  static async #editarCaso() {
    if (!game.user.isGM) return;
    const caso = estadoCaso();
    const opciones = Object.entries(RB.UMBRALES)
      .map(([id, u]) => `<option value="${id}" ${id === caso.tamano ? "selected" : ""}>${u.label} · ${u.pistas} Pistas</option>`)
      .join("");
    const datos = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("RB.Muro.EditarCaso") },
      classes: ["ruido-blanco"],
      content: `<form class="rb-dialog">
        <div class="form-group"><label>Caso</label><input type="text" name="nombre" value="${caso.nombre}"></div>
        <div class="form-group"><label>Pregunta Central</label><textarea name="pregunta" rows="3">${caso.pregunta}</textarea></div>
        <div class="form-group"><label>Tamaño</label><select name="tamano">${opciones}</select></div>
      </form>`,
      ok: { label: "Guardar", callback: (_e, b) => new foundry.applications.ux.FormDataExtended(b.form).object },
      rejectClose: false
    });
    if (!datos) return;
    await game.settings.set(RB.ID, AJUSTES.nombre, datos.nombre ?? "");
    await game.settings.set(RB.ID, AJUSTES.pregunta, datos.pregunta ?? "");
    await game.settings.set(RB.ID, AJUSTES.tamano, datos.tamano ?? "estandar");
  }

  /** Una sola instancia abierta, refrescada por los hooks del sistema. */
  static abrir() {
    const abierta = foundry.applications.instances.get("rb-muro");
    if (abierta) return abierta.bringToFront();
    return new MuroApp().render(true);
  }

  static refrescar() {
    foundry.applications.instances.get("rb-muro")?.render(false);
  }
}
