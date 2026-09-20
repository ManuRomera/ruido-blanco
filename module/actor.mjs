/** Documento Actor: motor de Acción, Tensión, Ruptura y Anclas. */
import { RB, formulaAccion, gradoAccion } from "./config.mjs";
import { subirRuidoFondo } from "./caso.mjs";

const DialogV2 = foundry.applications.api.DialogV2;

/** Etiquetas de los cuatro grados de una Acción. */
const GRADOS = {
  nitido: { titulo: "Nítido", clase: "rb-grado-nitido" },
  limpio: { titulo: "Limpio", clase: "rb-grado-limpio" },
  coste: { titulo: "Con coste", clase: "rb-grado-coste" },
  reves: { titulo: "Revés", clase: "rb-grado-reves" }
};

export class RuidoBlancoActor extends Actor {
  /** Valor de un Método, 0 si el actor no es un investigador. */
  metodo(clave) {
    return Number(this.system?.metodos?.[clave] ?? 0);
  }

  /**
   * Realiza una Acción. Los dados solo aparecen cuando la ficción ya ha
   * producido una decisión con riesgo, así que la Apuesta se pide antes de tirar.
   */
  async tirarMetodo(clave, { saltarDialogo = false } = {}) {
    if (!(clave in RB.METODOS)) return null;
    const opciones = saltarDialogo
      ? { apuesta: "", ventaja: false, desventaja: false, forzar: false, ruido: false }
      : await this.#pedirApuesta(clave);
    if (!opciones) return null;

    // Forzar: marca 1 Tensión después de conocer la Apuesta para obtener Ventaja.
    let ventaja = opciones.ventaja;
    if (opciones.forzar) {
      const marcada = await this.marcarTension(1, { motivo: "Forzar" });
      if (marcada) ventaja = true;
    }

    const formula = formulaAccion(this.metodo(clave), { ventaja, desventaja: opciones.desventaja });
    const roll = await new Roll(formula).evaluate();
    const grado = gradoAccion(roll.total);

    if (opciones.ruido) await subirRuidoFondo(1, `Acción de ${this.name}`);

    const contenido = await foundry.applications.handlebars.renderTemplate(
      "systems/ruido-blanco/templates/chat/accion.hbs",
      {
        actor: this.name,
        metodo: game.i18n.localize(RB.METODOS[clave]),
        valor: this.metodo(clave),
        apuesta: opciones.apuesta,
        ventaja,
        desventaja: opciones.desventaja,
        formula,
        total: roll.total,
        grado: GRADOS[grado],
        gradoId: grado,
        dados: roll.dice[0]?.results ?? []
      }
    );

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: contenido,
      rolls: [roll],
      sound: CONFIG.sounds.dice
    });
    return roll;
  }

  /** Diálogo de Apuesta: el GM la formula en una frase antes de que rueden los dados. */
  async #pedirApuesta(clave) {
    const etiqueta = game.i18n.localize(RB.METODOS[clave]);
    const content = `
      <form class="rb-dialog">
        <p class="rb-dialog-lead">${etiqueta} ${this.metodo(clave)} · 2d6 + ${this.metodo(clave)}d6, conserva los dos mejores.</p>
        <div class="form-group">
          <label>La Apuesta</label>
          <input type="text" name="apuesta" placeholder="Qué puede salir mal si tiras" autofocus>
        </div>
        <div class="form-group rb-dialog-flags">
          <label><input type="checkbox" name="ventaja"> Ventaja</label>
          <label><input type="checkbox" name="desventaja"> Desventaja</label>
          <label><input type="checkbox" name="forzar"> Forzar (+1 Tensión)</label>
          <label><input type="checkbox" name="ruido"> La Apuesta incluye +1 Ruido de Fondo</label>
        </div>
      </form>`;
    return DialogV2.prompt({
      window: { title: `Acción · ${etiqueta}` },
      classes: ["ruido-blanco"],
      content,
      ok: {
        label: "Tirar",
        callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      },
      rejectClose: false
    });
  }

  /**
   * Marca Tensión. Una cuarta marca provoca Ruptura: la Tensión baja a 1 y el
   * investigador escribe una Secuela coherente con lo ocurrido.
   * @returns {boolean} si la marca llegó a aplicarse.
   */
  async marcarTension(cantidad = 1, { motivo = "" } = {}) {
    if (this.type !== "investigador") return false;
    const actual = this.system.tension.value;
    const objetivo = actual + cantidad;
    if (objetivo <= this.system.tension.max) {
      await this.update({ "system.tension.value": objetivo });
      if (motivo) ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<p class="rb-chat-nota"><strong>${this.name}</strong> marca ${cantidad} Tensión · ${motivo}</p>`
      });
      return true;
    }
    await this.ruptura(motivo);
    return true;
  }

  /** Borra Tensión sin pasar por debajo de 0. */
  async borrarTension(cantidad = 1) {
    if (this.type !== "investigador") return;
    const valor = Math.max(0, this.system.tension.value - cantidad);
    await this.update({ "system.tension.value": valor });
  }

  /** Ruptura: resuelve la Acción que la provocó, baja a 1 y escribe una Secuela. */
  async ruptura(motivo = "") {
    const libre = Object.entries(this.system.secuelas).find(([, s]) => !s.nombre)?.[0] ?? "s2";
    const opciones = RB.SECUELAS.map(s => `<option value="${s.nombre}|${s.disparador}">${s.nombre}</option>`).join("");
    const datos = await DialogV2.prompt({
      window: { title: "Ruptura" },
      classes: ["ruido-blanco"],
      content: `
        <form class="rb-dialog">
          <p class="rb-dialog-lead">Describe cómo te quiebras. Tu Tensión baja a 1 y escribes una Secuela.</p>
          <div class="form-group">
            <label>Secuela de ejemplo</label>
            <select name="plantilla"><option value="">— escribir la mía —</option>${opciones}</select>
          </div>
          <div class="form-group"><label>Nombre</label><input type="text" name="nombre"></div>
          <div class="form-group"><label>Disparador</label><input type="text" name="disparador"></div>
        </form>`,
      ok: {
        label: "Escribir Secuela",
        callback: (_e, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      },
      rejectClose: false
    });

    let nombre = datos?.nombre ?? "";
    let disparador = datos?.disparador ?? "";
    if (!nombre && datos?.plantilla) [nombre, disparador] = datos.plantilla.split("|");

    await this.update({
      "system.tension.value": 1,
      [`system.secuelas.${libre}.nombre`]: nombre || "Ruptura sin nombre",
      [`system.secuelas.${libre}.disparador`]: disparador
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="rb-chat rb-chat-ruptura">
        <h3>RUPTURA</h3>
        <p><strong>${this.name}</strong> se quiebra${motivo ? ` · ${motivo}` : ""}. Tensión a 1.</p>
        <p class="rb-chat-secuela"><strong>Secuela:</strong> ${nombre || "sin nombre"}${disparador ? ` — <em>${disparador}</em>` : ""}</p>
      </div>`
    });
  }

  /**
   * Una escena significativa con un Ancla personal borra 1 Tensión, una vez por
   * sesión y por Ancla.
   */
  async jugarAncla(slot) {
    const ancla = this.system.anclas?.[slot];
    if (!ancla?.nombre || ancla.usada) return;
    await this.update({ [`system.anclas.${slot}.usada`]: true });
    await this.borrarTension(1);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="rb-chat"><h3>Ancla personal</h3>
        <p><strong>${this.name}</strong> juega una escena con <em>${ancla.nombre}</em> y borra 1 Tensión.</p></div>`
    });
  }

  /** Devuelve las Anclas al inicio de una sesión nueva. */
  async reiniciarAnclas() {
    await this.update({ "system.anclas.a1.usada": false, "system.anclas.a2.usada": false });
  }
}
