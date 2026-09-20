/** Fichas de investigador, PNJ, Pista e Hipótesis. */
import { RB } from "./config.mjs";
import { LegacyActorSheet, LegacyItemSheet } from "./compat.mjs";
import { estadoCaso } from "./caso.mjs";
import { MuroApp } from "./muro-app.mjs";

export class InvestigadorSheet extends LegacyActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "actor", "rb-investigador"],
      width: 900,
      height: 760,
      submitOnChange: true,
      closeOnSubmit: false,
      tabs: [{ navSelector: ".rb-tabs", contentSelector: ".rb-sheet-body", initial: "ficha" }]
    });
  }

  get template() {
    return "systems/ruido-blanco/templates/actors/investigador.hbs";
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const sys = this.actor.system;
    data.system = sys;
    data.metodos = Object.entries(RB.METODOS).map(([clave, etiqueta]) => ({
      clave,
      etiqueta: game.i18n.localize(etiqueta),
      valor: sys.metodos[clave],
      dados: 2 + sys.metodos[clave]
    }));
    data.profesiones = RB.PROFESIONES;
    data.kits = RB.KITS;
    data.talentos = RB.TALENTOS;
    data.tensionCasillas = Array.fromRange(sys.tension.max).map(i => ({ n: i + 1, marcada: i < sys.tension.value }));
    data.repartoValido = sys.repartoValido;
    data.caso = estadoCaso();
    data.notasHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.notas);
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const el = html[0] ?? html;

    el.querySelectorAll("[data-action='tirar-metodo']").forEach(b =>
      b.addEventListener("click", () => this.actor.tirarMetodo(b.dataset.metodo)));
    el.querySelectorAll("[data-action='tension']").forEach(b =>
      b.addEventListener("click", () => this.#fijarTension(Number(b.dataset.valor))));
    el.querySelector("[data-action='marcar-tension']")?.addEventListener("click", () =>
      this.actor.marcarTension(1, { motivo: "Encajar" }));
    el.querySelector("[data-action='borrar-tension']")?.addEventListener("click", () =>
      this.actor.borrarTension(1));
    el.querySelectorAll("[data-action='jugar-ancla']").forEach(b =>
      b.addEventListener("click", () => this.actor.jugarAncla(b.dataset.slot)));
    el.querySelector("[data-action='reiniciar-anclas']")?.addEventListener("click", () =>
      this.actor.reiniciarAnclas());
    el.querySelector("[data-action='abrir-muro']")?.addEventListener("click", () => MuroApp.abrir());
    el.querySelector(".rb-talento-elegir")?.addEventListener("change", ev => {
      const talento = RB.TALENTOS.find(t => t.id === ev.target.value);
      if (talento) this.actor.update({ "system.talento.nombre": talento.nombre, "system.talento.regla": talento.regla });
    });
  }

  /** Clic en la casilla N: marca hasta N, o desmarca si ya estaba en N. */
  async #fijarTension(valor) {
    const actual = this.actor.system.tension.value;
    const objetivo = actual === valor ? valor - 1 : valor;
    if (objetivo > actual) return this.actor.marcarTension(objetivo - actual, { motivo: "Encajar" });
    return this.actor.update({ "system.tension.value": Math.max(0, objetivo) });
  }
}

export class PnjSheet extends LegacyActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "actor", "rb-pnj"],
      width: 620,
      height: 520,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  get template() {
    return "systems/ruido-blanco/templates/actors/pnj.hbs";
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.system = this.actor.system;
    data.notasHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.notas);
    return data;
  }
}

export class PistaSheet extends LegacyItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "item", "rb-pista"],
      width: 620,
      height: 620,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  get template() {
    return "systems/ruido-blanco/templates/items/pista.hbs";
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.system = this.item.system;
    data.esGM = game.user.isGM;
    data.clasificaciones = Object.entries(RB.CLASIFICACION)
      .map(([id, label]) => ({ id, label: game.i18n.localize(label) }));
    data.anclas = Object.entries(RB.ANCLAS).map(([id, label]) => ({ id, label: game.i18n.localize(label) }));
    data.funcionesSenal = RB.FUNCIONES_SENAL;
    return data;
  }
}

export class HipotesisSheet extends LegacyItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "item", "rb-hipotesis"],
      width: 520,
      height: 360,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  get template() {
    return "systems/ruido-blanco/templates/items/hipotesis.hbs";
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.system = this.item.system;
    return data;
  }
}
