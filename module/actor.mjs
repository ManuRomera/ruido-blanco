/** Documento Actor: Acción, Ayudar, Tensión, Condiciones, Talentos, Ruptura y Anclas. */
import { RB, formulaAccion, gradoAccion } from "./config.mjs";
import { subirRuidoFondo, bajarRuidoFondo } from "./caso.mjs";
import { pedir, formulario } from "./dialogos.mjs";

const GRADOS = {
  nitido: { titulo: "Nítido", efecto: "Consigues lo que querías y además creas una ventaja, reduces 1 Ruido de Fondo si tiene sentido o descubres un detalle adicional." },
  limpio: { titulo: "Limpio", efecto: "Consigues el objetivo sin consecuencia relevante." },
  coste: { titulo: "Con coste", efecto: "Consigues lo esencial y el GM cobra una consecuencia coherente con la Apuesta." },
  reves: { titulo: "Revés", efecto: "No lo consigues como pretendías y la situación empeora. La partida siempre avanza." }
};

export class RuidoBlancoActor extends Actor {
  metodo(clave) {
    return Number(this.system?.metodos?.[clave] ?? 0);
  }

  /** Condiciones escritas en la ficha, con su ranura, para ofrecerlas en la Apuesta. */
  get condiciones() {
    return Object.entries(this.system?.condiciones ?? {})
      .filter(([, texto]) => texto)
      .map(([slot, texto]) => ({ slot, texto }));
  }

  /** Otros investigadores que podrían Ayudar. Solo una persona puede hacerlo. */
  static posiblesAyudantes(excluir) {
    return game.actors
      .filter(a => a.type === "investigador" && a.id !== excluir?.id && a.hasPlayerOwner)
      .map(a => ({ id: a.id, nombre: a.name }));
  }

  /**
   * Realiza una Acción. Los dados solo aparecen cuando la ficción ya ha producido
   * una decisión con riesgo, así que la Apuesta se formula antes de tirar.
   */
  async tirarMetodo(clave, { saltarDialogo = false } = {}) {
    if (!(clave in RB.METODOS)) return null;
    const opciones = saltarDialogo ? {} : await this.#pedirApuesta(clave);
    if (!opciones) return null;

    // Una Condición que afecta a la Acción provoca Desventaja.
    const condicionesMarcadas = this.condiciones.filter(c => opciones[`cond.${c.slot}`]);
    const desventaja = Boolean(opciones.desventaja) || condicionesMarcadas.length > 0;

    let ventaja = Boolean(opciones.ventaja);
    let ayudante = opciones.ayudante ? game.actors.get(opciones.ayudante) : null;
    if (ayudante) ventaja = true;

    // Forzar: marca 1 Tensión después de conocer la Apuesta para obtener Ventaja.
    if (opciones.forzar) {
      await this.marcarTension(1, { motivo: "Forzar", silencioso: true });
      ventaja = true;
    }

    const formula = formulaAccion(this.metodo(clave), { ventaja, desventaja });
    const roll = await new Roll(formula).evaluate();
    const grado = gradoAccion(roll.total);

    if (opciones.ruido) await subirRuidoFondo(1, `Acción de ${this.name}`);

    const contenido = await foundry.applications.handlebars.renderTemplate(
      "systems/ruido-blanco/templates/chat/accion.hbs",
      {
        actorId: this.id,
        actor: this.name,
        metodo: game.i18n.localize(RB.METODOS[clave]),
        valor: this.metodo(clave),
        apuesta: opciones.apuesta,
        ventaja, desventaja,
        ayudante: ayudante ? { id: ayudante.id, nombre: ayudante.name } : null,
        condiciones: condicionesMarcadas.map(c => c.texto),
        formula,
        total: roll.total,
        grado: GRADOS[grado],
        gradoId: grado,
        esNitido: grado === "nitido",
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

  /** Diálogo de Apuesta: riesgo, ayuda, Condiciones y Forzar, todo antes de tirar. */
  async #pedirApuesta(clave) {
    const etiqueta = game.i18n.localize(RB.METODOS[clave]);
    const dados = 2 + this.metodo(clave);
    const ayudantes = RuidoBlancoActor.posiblesAyudantes(this);
    const condiciones = this.condiciones;

    const contenido = `
      <div class="rb-dialog">
        <p class="rb-lead">${etiqueta} ${this.metodo(clave)} · ${dados}d6, conserva los dos mejores.</p>
        <div><label>La Apuesta — qué puede salir mal si tiras</label>
          <input type="text" name="apuesta" autofocus placeholder="El GM la formula en una frase"></div>
        ${ayudantes.length ? `
        <div><label>Quién Ayuda (concede Ventaja y queda expuesto)</label>
          <select name="ayudante"><option value="">— nadie —</option>
            ${ayudantes.map(a => `<option value="${a.id}">${a.nombre}</option>`).join("")}
          </select></div>` : ""}
        ${condiciones.length ? `
        <div><label>Condiciones que afectan a esta Acción (Desventaja)</label>
          <div class="rb-ayudantes">
            ${condiciones.map(c => `<label class="rb-check"><input type="checkbox" name="cond.${c.slot}"> ${c.texto}</label>`).join("")}
          </div></div>` : ""}
        <div class="rb-opciones">
          <label><input type="checkbox" name="ventaja"> Ventaja</label>
          <label><input type="checkbox" name="desventaja"> Desventaja</label>
          <label><input type="checkbox" name="forzar"> Forzar (+1 Tensión)</label>
          <label><input type="checkbox" name="ruido"> La Apuesta incluye +1 Ruido</label>
        </div>
      </div>`;

    return formulario({ titulo: `Acción · ${etiqueta}`, contenido, aceptar: "Tirar" });
  }

  /** Gasta un uso del Talento y lo anuncia. */
  async usarTalento() {
    const t = this.system.talento;
    if (!t.nombre) return ui.notifications.warn("Este investigador no tiene Talento escrito.");
    if (t.usos >= t.usosMax) return ui.notifications.warn(`${t.nombre} ya está gastado. El GM lo devuelve al cambiar de escena o sesión.`);
    await this.update({ "system.talento.usos": t.usos + 1 });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="rb-chat"><div class="rb-chat-cab"><span class="rb-chat-quien">Talento</span><h3>${t.nombre}</h3></div>
        <p class="rb-chat-efecto">${t.regla}</p>
        <p class="rb-chat-nota">El GM responde de forma útil y concreta: el Talento produce dirección, no acertijos.</p></div>`
    });
  }

  /**
   * Dispara una Secuela: o marcas 1 Tensión para mantener el control, o dejas
   * que actúe y aceptas la complicación.
   */
  async dispararSecuela(slot) {
    const secuela = this.system.secuelas?.[slot];
    if (!secuela?.nombre) return;
    const eleccion = await pedir({
      titulo: `Secuela · ${secuela.nombre}`,
      contenido: `<div class="rb-dialog">
        <p class="rb-lead">Disparador: ${secuela.disparador || "—"}</p>
        <p>Una Secuela nunca puede falsear una Pista ni quitarte una decisión fundamental.</p></div>`,
      botones: [
        { id: "controlar", label: "Marcar 1 Tensión y mantener el control" },
        { id: "ceder", label: "Dejar que actúe y aceptar la complicación" }
      ]
    });
    if (!eleccion) return;

    if (eleccion === "controlar") await this.marcarTension(1, { motivo: `Contener ${secuela.nombre}`, silencioso: true });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="rb-chat rb-chat-secuela-aviso"><div class="rb-chat-cab">
          <span class="rb-chat-quien">Secuela</span><h3>${secuela.nombre}</h3></div>
        <p class="rb-chat-apuesta">${secuela.disparador}</p>
        <p class="rb-chat-efecto">${eleccion === "controlar"
          ? `${this.name} marca 1 Tensión y mantiene el control.`
          : `${this.name} deja que la Secuela actúe: el GM introduce la complicación.`}</p></div>`
    });
  }

  /** Marca Tensión. La cuarta marca provoca Ruptura. */
  async marcarTension(cantidad = 1, { motivo = "", silencioso = false } = {}) {
    if (this.type !== "investigador") return false;
    const actual = this.system.tension.value;
    const objetivo = actual + cantidad;
    if (objetivo <= this.system.tension.max) {
      await this.update({ "system.tension.value": objetivo });
      if (motivo && !silencioso) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this }),
          content: `<div class="rb-chat"><p class="rb-chat-nota"><strong>${this.name}</strong> marca ${cantidad} Tensión · ${motivo}</p></div>`
        });
      }
      return true;
    }
    await this.ruptura(motivo);
    return true;
  }

  async borrarTension(cantidad = 1) {
    if (this.type !== "investigador") return;
    await this.update({ "system.tension.value": Math.max(0, this.system.tension.value - cantidad) });
  }

  /** Ruptura: baja a 1 y escribe una Secuela coherente con lo ocurrido. */
  async ruptura(motivo = "") {
    const libre = Object.entries(this.system.secuelas).find(([, s]) => !s.nombre)?.[0] ?? "s2";
    const opciones = RB.SECUELAS.map(s => `<option value="${s.nombre}|${s.disparador}">${s.nombre} — ${s.disparador}</option>`).join("");

    const datos = await formulario({
      titulo: "Ruptura",
      aceptar: "Escribir Secuela",
      contenido: `<div class="rb-dialog">
        <p class="rb-lead">Resuelve primero la Acción que la provocó. Después describe cómo te quiebras: tu Tensión baja a 1.</p>
        <div><label>Secuela de ejemplo</label>
          <select name="plantilla"><option value="">— escribir la mía —</option>${opciones}</select></div>
        <div><label>Nombre</label><input type="text" name="nombre"></div>
        <div><label>Disparador</label><input type="text" name="disparador"></div>
      </div>`
    });

    let nombre = datos?.nombre?.trim() ?? "";
    let disparador = datos?.disparador?.trim() ?? "";
    if (!nombre && datos?.plantilla) [nombre, disparador] = datos.plantilla.split("|");

    await this.update({
      "system.tension.value": 1,
      [`system.secuelas.${libre}.nombre`]: nombre || "Ruptura sin nombre",
      [`system.secuelas.${libre}.disparador`]: disparador
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="rb-chat rb-chat-ruptura"><div class="rb-chat-cab">
          <span class="rb-chat-quien">${this.name}</span><h3>Ruptura</h3></div>
        ${motivo ? `<p class="rb-chat-apuesta">${motivo}</p>` : ""}
        <p class="rb-chat-efecto">Tensión a 1. Secuela: <strong>${nombre || "sin nombre"}</strong>${disparador ? ` — <em>${disparador}</em>` : ""}</p></div>`
    });
  }

  /** Una escena significativa con un Ancla borra 1 Tensión, una vez por sesión. */
  async jugarAncla(slot) {
    const ancla = this.system.anclas?.[slot];
    if (!ancla?.nombre || ancla.usada) return;
    await this.update({ [`system.anclas.${slot}.usada`]: true });
    await this.borrarTension(1);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="rb-chat"><div class="rb-chat-cab">
          <span class="rb-chat-quien">${this.name}</span><h3>Ancla personal</h3></div>
        <p class="rb-chat-efecto">Una escena con <em>${ancla.nombre}</em> borra 1 Tensión. Existe una vida fuera del caso.</p></div>`
    });
  }

  /** Escribe una Condición en la primera ranura libre. */
  async anadirCondicion(texto) {
    const libre = Object.entries(this.system.condiciones).find(([, v]) => !v)?.[0];
    if (!libre) return ui.notifications.warn(`${this.name} ya tiene tres Condiciones.`);
    await this.update({ [`system.condiciones.${libre}`]: texto });
  }

  /** Nueva escena: vuelven los Talentos. Nueva sesión: vuelven también las Anclas. */
  async reiniciar({ sesion = false } = {}) {
    const cambios = { "system.talento.usos": 0 };
    if (sesion) Object.assign(cambios, { "system.anclas.a1.usada": false, "system.anclas.a2.usada": false });
    await this.update(cambios);
  }

  /** Un 12 permite reducir 1 Ruido de Fondo si tiene sentido en la ficción. */
  static async limpiarRuido() {
    await bajarRuidoFondo(1, "Resultado Nítido: la investigación deja menos rastro");
  }
}
