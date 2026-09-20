/** Fichas de investigador, PNJ, Pista e Hipótesis. */
import { RB } from "./config.mjs";
import { LegacyActorSheet, LegacyItemSheet } from "./compat.mjs";
import { MuroApp } from "./muro-app.mjs";
import { RevelacionApp } from "./revelacion-app.mjs";

const enriquecer = html => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "");

export class InvestigadorSheet extends LegacyActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "actor", "rb-investigador"],
      width: 940,
      height: 800,
      submitOnChange: true,
      closeOnSubmit: false,
      tabs: [{ navSelector: ".rb-tabs", contentSelector: ".rb-sheet-body", initial: "ficha" }]
    });
  }

  get template() { return "systems/ruido-blanco/templates/actors/investigador.hbs"; }

  async getData(opciones = {}) {
    const data = await super.getData(opciones);
    const sys = this.actor.system;
    data.system = sys;

    data.metodos = Object.entries(RB.METODOS).map(([clave, etiqueta]) => ({
      clave, etiqueta: game.i18n.localize(etiqueta), valor: sys.metodos[clave], dados: 2 + sys.metodos[clave]
    }));
    data.profesiones = RB.PROFESIONES;
    data.kits = RB.KITS;
    data.talentos = RB.TALENTOS;
    data.repartoValido = sys.repartoValido;
    data.talentoDisponible = sys.talentoDisponible;
    data.enRiesgoDeRuptura = sys.enRiesgoDeRuptura;

    data.tensionCasillas = Array.fromRange(sys.tension.max).map(i => ({ n: i + 1, marcada: i < sys.tension.value }));
    data.usosTalento = Array.fromRange(sys.talento.usosMax).map(i => ({ n: i + 1, gastado: i < sys.talento.usos }));
    data.condiciones = Object.entries(sys.condiciones).map(([slot, texto], i) => ({ slot, texto, n: i + 1 }));
    data.secuelas = Object.entries(sys.secuelas).map(([slot, s]) => ({ slot, ...s }));
    data.anclas = Object.entries(sys.anclas).map(([slot, a]) => ({ slot, ...a }));
    data.notasHTML = await enriquecer(sys.notas);
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const raiz = html[0] ?? html;
    const actor = this.actor;

    const acciones = {
      muro: () => MuroApp.abrir(),
      revelacion: () => RevelacionApp.abrir(),
      tirar: b => actor.tirarMetodo(b.dataset.metodo),
      "metodo-mas": b => this.#ajustarMetodo(b.dataset.metodo, 1),
      "metodo-menos": b => this.#ajustarMetodo(b.dataset.metodo, -1),
      tension: b => this.#fijarTension(Number(b.dataset.valor)),
      encajar: () => actor.marcarTension(1, { motivo: "Encajar una consecuencia personal" }),
      "borrar-tension": () => actor.borrarTension(1),
      "quitar-condicion": b => actor.update({ [`system.condiciones.${b.dataset.slot}`]: "" }),
      secuela: b => actor.dispararSecuela(b.dataset.slot),
      ancla: b => actor.jugarAncla(b.dataset.slot),
      "usar-talento": () => actor.usarTalento(),
      "uso-talento": b => actor.update({ "system.talento.usos": Number(b.dataset.n) === actor.system.talento.usos ? Number(b.dataset.n) - 1 : Number(b.dataset.n) })
    };

    for (const boton of raiz.querySelectorAll("[data-rb]")) {
      boton.addEventListener("click", ev => {
        ev.preventDefault();
        acciones[boton.dataset.rb]?.(boton);
      });
    }

    raiz.querySelector(".rb-talento-elegir")?.addEventListener("change", ev => {
      const talento = RB.TALENTOS.find(t => t.id === ev.target.value);
      if (talento) actor.update({ "system.talento.nombre": talento.nombre, "system.talento.regla": talento.regla, "system.talento.usos": 0 });
    });
  }

  async #ajustarMetodo(clave, delta) {
    const valor = Math.clamp(this.actor.metodo(clave) + delta, 0, 3);
    await this.actor.update({ [`system.metodos.${clave}`]: valor });
  }

  /** Clic en la casilla N: marca hasta N, o la desmarca si ya era la última. */
  async #fijarTension(valor) {
    const actual = this.actor.system.tension.value;
    if (valor > actual) return this.actor.marcarTension(valor - actual, { motivo: "Encajar una consecuencia personal" });
    return this.actor.update({ "system.tension.value": Math.max(0, valor === actual ? valor - 1 : valor) });
  }
}

export class PnjSheet extends LegacyActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "actor", "rb-pnj"],
      width: 660, height: 560, submitOnChange: true, closeOnSubmit: false
    });
  }

  get template() { return "systems/ruido-blanco/templates/actors/pnj.hbs"; }

  async getData(opciones = {}) {
    const data = await super.getData(opciones);
    data.system = this.actor.system;
    data.notasHTML = await enriquecer(this.actor.system.notas);
    return data;
  }
}

export class PistaSheet extends LegacyItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "item", "rb-pista-sheet"],
      width: 640, height: 660, submitOnChange: true, closeOnSubmit: false
    });
  }

  get template() { return "systems/ruido-blanco/templates/items/pista.hbs"; }

  async getData(opciones = {}) {
    const data = await super.getData(opciones);
    data.system = this.item.system;
    data.esGM = game.user.isGM;
    data.clasificaciones = Object.entries(RB.CLASIFICACION).map(([id, label]) => ({ id, label: game.i18n.localize(label) }));
    data.anclas = Object.entries(RB.ANCLAS).map(([id, label]) => ({ id, label: game.i18n.localize(label) }));
    data.funcionesSenal = RB.FUNCIONES_SENAL;
    return data;
  }
}

export class HipotesisSheet extends LegacyItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ruido-blanco", "sheet", "item", "rb-hipotesis-sheet"],
      width: 560, height: 420, submitOnChange: true, closeOnSubmit: false
    });
  }

  get template() { return "systems/ruido-blanco/templates/items/hipotesis.hbs"; }

  async getData(opciones = {}) {
    const data = await super.getData(opciones);
    data.system = this.item.system;
    data.enlazadas = this.item.system.pistas
      .map(id => game.items.get(id))
      .filter(Boolean)
      .map(p => ({ id: p.id, codigo: p.system.codigo || p.name, texto: p.system.texto }));
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const raiz = html[0] ?? html;
    for (const boton of raiz.querySelectorAll("[data-rb='desenlazar']")) {
      boton.addEventListener("click", () => {
        const restantes = this.item.system.pistas.filter(id => id !== boton.dataset.id);
        this.item.update({ "system.pistas": restantes });
      });
    }
  }
}
