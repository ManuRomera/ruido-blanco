/**
 * La Revelación convierte una interpretación en verdad. Ninguna Pista puede
 * ignorarse: todas quedan como SEÑAL, RUIDO o INTERFERENCIA.
 *
 * Los campos se guardan al perder el foco, nunca en cada tecla: un re-render
 * por pulsación robaría el cursor mientras se escribe una justificación.
 */
import { RB, calcularAfinacion, gradoRevelacion } from "./config.mjs";
import { estadoCaso, pistas, fijarNucleo, subirRuidoFondo, actualizarItem } from "./caso.mjs";
import { formulario, pedir, confirmar } from "./dialogos.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const BANDEJAS = [
  { id: "", clase: "sin", titulo: "Sin clasificar", nota: "Ninguna Pista puede ignorarse." },
  { id: "senal", clase: "senal", titulo: "Señal", nota: "Aporta materialmente a la teoría." },
  { id: "ruido", clase: "ruido", titulo: "Ruido", nota: "Cerrada por un Puente Causal válido." },
  { id: "interferencia", clase: "interferencia", titulo: "Interferencia", nota: "Ocurrió. Todavía no sabéis por qué." }
];

const ANCLAS = [
  { id: "que", corto: "QUÉ" },
  { id: "quien", corto: "QUIÉN" },
  { id: "porque", corto: "POR QUÉ" }
];

function giro(id, amplitud = 1.2) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return (((h / 1000) * 2 - 1) * amplitud).toFixed(2);
}

export class RevelacionApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "rb-revelacion",
    classes: ["ruido-blanco", "rb-app"],
    window: { title: "RB.Revelacion.Titulo", icon: "fa-solid fa-bullseye", resizable: true },
    position: { width: 1180, height: 860 },
    actions: {
      ancla: RevelacionApp.#ancla,
      tirar: RevelacionApp.#tirar,
      retirada: RevelacionApp.#retirada,
      grieta: RevelacionApp.#grieta,
      limpiar: RevelacionApp.#limpiar,
      abrirPista: RevelacionApp.#abrirPista
    }
  };

  static PARTS = {
    main: { template: "systems/ruido-blanco/templates/apps/revelacion.hbs", scrollable: [".rb-bandeja-cuerpo"] }
  };

  /** Fotografía del estado: la usan la plantilla, la validación y el chat. */
  static analizar() {
    const caso = estadoCaso();
    const descubiertas = pistas({ soloDescubiertas: true });
    const de = clase => descubiertas.filter(p => p.system.clasificacion === clase);
    const senales = de("senal");
    const ruido = de("ruido");
    const interferencias = de("interferencia");
    const sinClasificar = descubiertas.filter(p => !p.system.clasificacion);

    const anclas = ANCLAS.map(a => senales.find(p => p.system.ancla === a.id)?.id ?? "");
    const afinacion = calcularAfinacion({
      senales: senales.length, anclas,
      pistasTotales: descubiertas.length, umbral: caso.umbral
    });

    const faltaJustificacion = descubiertas.filter(
      p => ["senal", "ruido"].includes(p.system.clasificacion) && !p.system.justificacion.trim());

    return {
      caso, descubiertas, senales, ruido, interferencias, sinClasificar, faltaJustificacion,
      anclas,
      anclasCompletas: new Set(anclas.filter(Boolean)).size === 3,
      afinacion,
      mordedura: interferencias.length >= 2,
      anclaObligatoria: interferencias.length === 1 ? interferencias[0] : null,
      control: afinacion === 3,
      umbralAlcanzado: descubiertas.length >= caso.umbral,
      sobreUmbral: descubiertas.length - caso.umbral,
      nucleoCompleto: Boolean(caso.nucleo.que && caso.nucleo.quien && caso.nucleo.porque)
    };
  }

  async _prepareContext() {
    const a = RevelacionApp.analizar();
    const esGM = game.user.isGM;

    const ficha = p => ({
      id: p.id,
      giro: giro(p.id),
      codigo: p.system.codigo || p.name,
      texto: p.system.texto,
      fiabilidad: p.system.fiabilidad,
      dura: p.system.dura,
      justificacion: p.system.justificacion,
      faltaJustificacion: ["senal", "ruido"].includes(p.system.clasificacion) && !p.system.justificacion.trim(),
      esSenal: p.system.clasificacion === "senal",
      anclas: ANCLAS.map(x => ({ ...x, activa: p.system.ancla === x.id })),
      editable: p.isOwner
    });

    return {
      ...a,
      esGM,
      bandejas: BANDEJAS.map(b => ({
        ...b,
        pistas: a.descubiertas.filter(p => p.system.clasificacion === b.id).map(ficha)
      })),
      lentes: RB.LENTES.filter(l => !(l.requiereSinControl && a.control)),
      bloqueos: [
        !a.umbralAlcanzado && `Aún no habéis alcanzado el Umbral: ${a.descubiertas.length} de ${a.caso.umbral} Pistas.`,
        a.sinClasificar.length && `Ninguna Pista puede ignorarse: faltan ${a.sinClasificar.length} por clasificar.`,
        a.faltaJustificacion.length && `Faltan ${a.faltaJustificacion.length} justificaciones (Prueba de Aporte o Puente Causal).`,
        !a.nucleoCompleto && "Formulad las tres afirmaciones del Núcleo."
      ].filter(Boolean),
      requisitos: [
        { texto: "+1 · 3 Señales", cumplido: a.senales.length >= 3 },
        { texto: "+2 · 5 Señales y las tres Anclas", cumplido: a.senales.length >= 5 && a.anclasCompletas },
        { texto: `+3 · 7 Señales, las tres Anclas y ${a.caso.umbral + 2} Pistas`,
          cumplido: a.senales.length >= 7 && a.anclasCompletas && a.sobreUmbral >= 2 }
      ]
    };
  }

  /* ------------------------------------------------------------- Render */

  _onRender(contexto, opciones) {
    super._onRender(contexto, opciones);
    const raiz = this.element;

    // El Núcleo lo dicta la mesa: se guarda al salir del campo, no al teclear.
    for (const campo of raiz.querySelectorAll("[data-nucleo]")) {
      campo.addEventListener("change", () => fijarNucleo(campo.dataset.nucleo, campo.value));
    }

    for (const campo of raiz.querySelectorAll("[data-justificacion]")) {
      campo.addEventListener("change", async () => {
        const pista = game.items.get(campo.dataset.justificacion);
        if (pista) await actualizarItem(pista, { "system.justificacion": campo.value });
      });
    }

    for (const carta of raiz.querySelectorAll("[data-tipo='ficha-pista']")) {
      carta.draggable = true;
      carta.addEventListener("dragstart", ev => {
        carta.classList.add("arrastrando");
        ev.dataTransfer.setData("text/plain", JSON.stringify({ rb: "clasificar", id: carta.dataset.id }));
      });
      carta.addEventListener("dragend", () => carta.classList.remove("arrastrando"));
    }

    for (const bandeja of raiz.querySelectorAll("[data-bandeja]")) {
      bandeja.addEventListener("dragover", ev => { ev.preventDefault(); bandeja.classList.add("sobre"); });
      bandeja.addEventListener("dragleave", () => bandeja.classList.remove("sobre"));
      bandeja.addEventListener("drop", async ev => {
        ev.preventDefault();
        bandeja.classList.remove("sobre");
        let carga;
        try { carga = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch { return; }
        if (carga?.rb !== "clasificar") return;
        await RevelacionApp.clasificar(carga.id, bandeja.dataset.bandeja);
      });
    }
  }

  /** Mover una Pista de bandeja. Solo una Señal puede sostener un Ancla. */
  static async clasificar(pistaId, clasificacion) {
    const pista = game.items.get(pistaId);
    if (!pista || pista.system.clasificacion === clasificacion) return;
    const cambios = { "system.clasificacion": clasificacion };
    if (clasificacion !== "senal") cambios["system.ancla"] = "";
    await actualizarItem(pista, cambios);
  }

  static async #ancla(_ev, destino) {
    const pista = game.items.get(destino.closest("[data-id]")?.dataset.id);
    if (!pista) return;
    const nueva = pista.system.ancla === destino.dataset.ancla ? "" : destino.dataset.ancla;
    // Las tres Anclas deben ser tarjetas distintas: la anterior se libera.
    if (nueva) {
      const previa = pistas().find(p => p.id !== pista.id && p.system.ancla === nueva);
      if (previa) await actualizarItem(previa, { "system.ancla": "" });
    }
    await actualizarItem(pista, { "system.ancla": nueva });
  }

  static #abrirPista(_ev, destino) {
    game.items.get(destino.closest("[data-id]")?.dataset.id)?.sheet.render(true);
  }

  /* -------------------------------------------------------------- Tirada */

  static async #tirar() {
    if (!game.user.isGM) return ui.notifications.warn("La tirada de Revelación la lanza quien dirige.");
    const a = RevelacionApp.analizar();
    if (!a.umbralAlcanzado) return ui.notifications.warn("No habéis alcanzado el Umbral del caso.");
    if (a.sinClasificar.length) return ui.notifications.warn("Ninguna Pista puede ignorarse: clasificadlas todas.");
    if (a.faltaJustificacion.length) return ui.notifications.warn("Cada Señal y cada Ruido necesitan su justificación.");
    if (!a.nucleoCompleto) return ui.notifications.warn("Formulad las tres afirmaciones del Núcleo.");

    const apuesta = await formulario({
      titulo: "Antes de tirar",
      aceptar: "Revelar",
      contenido: `<div class="rb-dialog">
        <p class="rb-lead">«Si os equivocáis aquí, esto es lo que estáis poniendo en riesgo.»
          Los jugadores pueden cambiar lugar, audiencia o forma antes de lanzar los dados.</p>
        <div><label>Dónde y cómo Reveláis</label><input type="text" name="donde" autofocus
          placeholder="Confrontación privada, reunión, trampa, denuncia, publicación, operación…"></div>
        <div><label>La Apuesta</label><textarea name="riesgo" rows="2"
          placeholder="Reputación, acceso, legalidad, seguridad, una fuente, exposición pública…"></textarea></div>
      </div>`
    });
    if (!apuesta) return;

    const roll = await new Roll(`2d6 + ${a.afinacion}`).evaluate();
    const grado = gradoRevelacion(roll.total, a.interferencias.length);
    const degradado = roll.total >= 10 && grado === "distorsionada";

    // Prioridad del Ancla: si existe Interferencia, el GM debe usar una.
    const ancla = a.interferencias[0]
      ?? a.senales.find(p => !p.system.ancla)
      ?? a.senales[1] ?? null;

    const contenido = await foundry.applications.handlebars.renderTemplate(
      "systems/ruido-blanco/templates/chat/revelacion.hbs",
      {
        caso: a.caso,
        donde: apuesta.donde, riesgo: apuesta.riesgo,
        total: roll.total, afinacion: a.afinacion,
        grado, degradado, control: a.control, mordedura: a.mordedura,
        senales: a.senales.length, ruido: a.ruido.length, interferencias: a.interferencias.length,
        anclaDistorsion: ancla ? { codigo: ancla.system.codigo || ancla.name, texto: ancla.system.texto } : null,
        anclaEsInterferencia: Boolean(a.interferencias.length),
        lentes: RB.LENTES.filter(l => !(l.requiereSinControl && a.control)),
        esClara: grado === "clara",
        esDistorsionada: grado === "distorsionada",
        esFalsoPositivo: grado === "falso-positivo"
      }
    );

    await ChatMessage.create({ content: contenido, rolls: [roll], sound: CONFIG.sounds.dice });
    this.render(false);
  }

  /** Aplica una Lente de Distorsión y la deja escrita en el chat. */
  static async aplicarLente(lenteId) {
    if (!game.user.isGM) return;
    const lente = RB.LENTES.find(l => l.id === lenteId);
    if (!lente) return;
    const datos = await formulario({
      titulo: `Distorsión · ${lente.nombre}`,
      aceptar: "Contar la Distorsión",
      contenido: `<div class="rb-dialog">
        <p class="rb-lead">${lente.pregunta}</p>
        <p class="rb-lead">Debe cambiar una decisión, relación, peligro, objetivo, oportunidad o situación presente.
          Si solo añade trivia retrospectiva, no es suficiente.</p>
        <div><label>Tenéis razón en lo fundamental, pero…</label><textarea name="texto" rows="3" autofocus></textarea></div>
      </div>`
    });
    if (!datos?.texto?.trim()) return;
    await ChatMessage.create({
      content: `<div class="rb-chat rb-grado-distorsionada"><div class="rb-chat-cab">
          <span class="rb-chat-quien">Lente de Distorsión</span><h3>${lente.nombre}</h3></div>
        <p class="rb-chat-apuesta">${lente.pregunta}</p>
        <p class="rb-chat-efecto">Tenéis razón en lo fundamental, pero… ${foundry.utils.escapeHTML(datos.texto)}</p></div>`
    });
  }

  /** Tras un Falso Positivo: el GM añade un dato a una Pista y la vuelve Dura. */
  static async marcarPistaDura() {
    if (!game.user.isGM) return;
    const candidatas = pistas({ soloDescubiertas: true });
    if (!candidatas.length) return;
    const datos = await formulario({
      titulo: "Pista Dura",
      aceptar: "Endurecer la Pista",
      contenido: `<div class="rb-dialog">
        <p class="rb-lead">Añade un detalle factual que demuestre por qué al menos una afirmación importante era
          incorrecta. Debe abrir al menos dos explicaciones plausibles nuevas y no revela la solución correcta.</p>
        <div><label>Pista</label><select name="id">
          ${candidatas.map(p => `<option value="${p.id}">${p.system.codigo || p.name} — ${foundry.utils.escapeHTML((p.system.texto || "").slice(0, 70))}</option>`).join("")}
        </select></div>
        <div><label>Detalle nuevo</label><textarea name="detalle" rows="3" autofocus></textarea></div>
      </div>`
    });
    if (!datos?.id) return;

    const pista = game.items.get(datos.id);
    if (!pista) return;
    const contexto = [pista.system.contexto, datos.detalle].filter(Boolean).join(" — ");
    await pista.update({ "system.dura": true, "system.contexto": contexto });
    await ChatMessage.create({
      content: `<div class="rb-chat rb-grado-falso-positivo"><div class="rb-chat-cab">
          <span class="rb-chat-quien">${pista.system.codigo || pista.name}</span><h3>Pista Dura</h3></div>
        <p class="rb-chat-efecto">${foundry.utils.escapeHTML(datos.detalle ?? "")}</p>
        <p class="rb-chat-nota">Solo podrá volver a ser Ruido si información obtenida después permite un Puente Causal válido.</p>
        <div class="rb-chat-botones">
          <button type="button" data-rb="retirada">Retirada (+1 Ruido)</button>
          <button type="button" data-rb="grieta">Seguir la Grieta (+2 Ruido)</button></div></div>`
    });
  }

  static async #retirada() { await RevelacionApp.retirada(); }
  static async #grieta() { await RevelacionApp.grieta(); }

  static async retirada() {
    await subirRuidoFondo(1, "Retirada tras un Falso Positivo");
    await ChatMessage.create({
      content: `<div class="rb-chat"><div class="rb-chat-cab">
          <span class="rb-chat-quien">Tras el Falso Positivo</span><h3>Retirada</h3></div>
        <p class="rb-chat-efecto">Aceptáis que esta vía ha fallado y protegéis lo que todavía pueda salvarse.
          La consecuencia anunciada ocurre de manera limitada pero real.</p>
        <p class="rb-chat-nota">El GM indica qué vías siguen existiendo, sin entregar una Pista nueva.</p></div>`
    });
  }

  static async grieta() {
    await subirRuidoFondo(2, "Seguir la Grieta tras un Falso Positivo");
    await ChatMessage.create({
      content: `<div class="rb-chat"><div class="rb-chat-cab">
          <span class="rb-chat-quien">Tras el Falso Positivo</span><h3>Seguir la Grieta</h3></div>
        <p class="rb-chat-efecto">Actuáis inmediatamente sobre el nuevo dato. La Pista Dura señala una persona, lugar,
          registro, objeto o acción; la siguiente escena empieza allí y aún habrá que actuar para conseguir algo.</p>
        <p class="rb-chat-nota">Protección de la Grieta: una Reacción no puede destruir esa fuente antes de que tengáis
          una oportunidad significativa de interactuar con ella.</p></div>`
    });
  }

  static async #limpiar() {
    if (!game.user.isGM) return;
    if (!(await confirmar({
      titulo: "Limpiar clasificación",
      contenido: "<p>Las Pistas vuelven a estar sin clasificar. El Núcleo y las Pistas Duras se conservan.</p>"
    }))) return;
    const cambios = pistas().map(p => ({
      _id: p.id, "system.clasificacion": "", "system.justificacion": "", "system.ancla": ""
    }));
    if (cambios.length) await Item.updateDocuments(cambios);
    this.render(false);
  }

  static abrir() {
    const existente = foundry.applications.instances.get("rb-revelacion");
    if (existente) return existente.bringToFront();
    return new RevelacionApp().render(true);
  }

  static refrescar() {
    foundry.applications.instances.get("rb-revelacion")?.render(false);
  }
}
