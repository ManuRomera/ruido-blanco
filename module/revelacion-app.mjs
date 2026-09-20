/**
 * La Revelación convierte una interpretación en verdad.
 * Ninguna Pista puede ignorarse: todas quedan como SEÑAL, RUIDO o INTERFERENCIA.
 * La app la conduce el GM; los jugadores dictan la teoría y la ven en pantalla.
 */
import { RB, calcularAfinacion, gradoRevelacion } from "./config.mjs";
import { AJUSTES, estadoCaso, pistas, subirRuidoFondo } from "./caso.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RevelacionApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "rb-revelacion",
    tag: "form",
    classes: ["ruido-blanco", "rb-app", "rb-revelacion"],
    window: { title: "RB.Revelacion.Titulo", icon: "fa-solid fa-bullseye", resizable: true },
    position: { width: 1000, height: 820 },
    form: { handler: RevelacionApp.#guardar, submitOnChange: true, closeOnSubmit: false },
    actions: {
      tirar: RevelacionApp.#tirar,
      retirada: RevelacionApp.#retirada,
      grieta: RevelacionApp.#grieta,
      limpiar: RevelacionApp.#limpiar
    }
  };

  static PARTS = {
    main: { template: "systems/ruido-blanco/templates/apps/revelacion.hbs", scrollable: [".rb-revelacion-pistas"] }
  };

  /** Fotografía del estado de la Revelación: lo usan la ficha, la validación y el chat. */
  static analizar() {
    const caso = estadoCaso();
    const descubiertas = pistas({ soloDescubiertas: true });
    const porClase = clase => descubiertas.filter(p => p.system.clasificacion === clase);
    const senales = porClase("senal");
    const ruido = porClase("ruido");
    const interferencias = porClase("interferencia");
    const sinClasificar = descubiertas.filter(p => !p.system.clasificacion);

    const anclas = ["que", "quien", "porque"].map(
      tipo => senales.find(p => p.system.ancla === tipo)?.id ?? ""
    );

    const afinacion = calcularAfinacion({
      senales: senales.length,
      anclas,
      pistasTotales: descubiertas.length,
      umbral: caso.umbral
    });

    return {
      caso,
      descubiertas,
      senales,
      ruido,
      interferencias,
      sinClasificar,
      anclas,
      anclasCompletas: new Set(anclas.filter(Boolean)).size === 3,
      afinacion,
      // Mordedura: con 2+ Interferencias cualquier 10+ se convierte en 7-9.
      mordedura: interferencias.length >= 2,
      // Con exactamente 1 Interferencia, esa Pista es el Ancla obligatoria de un 7-9.
      anclaObligatoria: interferencias.length === 1 ? interferencias[0] : null,
      control: afinacion === 3,
      umbralAlcanzado: descubiertas.length >= caso.umbral,
      sobreUmbral: descubiertas.length - caso.umbral
    };
  }

  async _prepareContext() {
    const a = RevelacionApp.analizar();
    const esGM = game.user.isGM;

    const faltaJustificacion = a.descubiertas.filter(
      p => ["senal", "ruido"].includes(p.system.clasificacion) && !p.system.justificacion.trim()
    );

    return {
      ...a,
      esGM,
      clasificaciones: [
        { id: "senal", label: "SEÑAL", ayuda: "Esto apoya nuestra teoría porque…" },
        { id: "ruido", label: "RUIDO", ayuda: "Esto existe porque [hecho], que explica [propiedad], pero pertenece a [otro suceso]." },
        { id: "interferencia", label: "INTERFERENCIA", ayuda: "Esto ocurrió. Nuestra explicación todavía no sabe por qué." }
      ],
      anclasOpciones: Object.entries(RB.ANCLAS).map(([id, label]) => ({ id, label: game.i18n.localize(label) })),
      filas: a.descubiertas.map(p => ({
        id: p.id,
        codigo: p.system.codigo || p.name,
        texto: p.system.texto,
        fiabilidad: p.system.fiabilidad,
        dura: p.system.dura,
        clasificacion: p.system.clasificacion,
        justificacion: p.system.justificacion,
        ancla: p.system.ancla,
        esSenal: p.system.clasificacion === "senal"
      })),
      lentes: RB.LENTES.filter(l => !(l.requiereSinControl && a.control)),
      funcionesSenal: RB.FUNCIONES_SENAL,
      bloqueos: [
        !a.umbralAlcanzado && `Aún no habéis alcanzado el Umbral: ${a.descubiertas.length} de ${a.caso.umbral} Pistas.`,
        a.sinClasificar.length && `Ninguna Pista puede ignorarse: faltan ${a.sinClasificar.length} por clasificar.`,
        faltaJustificacion.length && `Faltan ${faltaJustificacion.length} justificaciones (Prueba de Aporte o Puente Causal).`
      ].filter(Boolean),
      requisitos: [
        { texto: "+1 · 3 Señales", cumplido: a.senales.length >= 3 },
        { texto: "+2 · 5 Señales y las tres Anclas", cumplido: a.senales.length >= 5 && a.anclasCompletas },
        { texto: `+3 · 7 Señales, las tres Anclas y ${a.caso.umbral + 2} Pistas`, cumplido: a.senales.length >= 7 && a.anclasCompletas && a.sobreUmbral >= 2 }
      ]
    };
  }

  /** Cada cambio del formulario se escribe en la Pista o en el Núcleo del caso. */
  static async #guardar(_event, form, formData) {
    if (!game.user.isGM) return;
    const datos = formData.object;

    for (const [clave, valor] of Object.entries(datos)) {
      const match = clave.match(/^pista\.([^.]+)\.(clasificacion|justificacion|ancla)$/);
      if (!match) continue;
      const [, id, campo] = match;
      const pista = game.items.get(id);
      if (!pista || pista.system[campo] === valor) continue;
      const cambio = { [`system.${campo}`]: valor };
      // Solo una Señal puede sostener un Ancla del Núcleo.
      if (campo === "clasificacion" && valor !== "senal") cambio["system.ancla"] = "";
      await pista.update(cambio);
    }

    const nucleo = {
      [AJUSTES.nucleoQue]: datos.nucleoQue,
      [AJUSTES.nucleoQuien]: datos.nucleoQuien,
      [AJUSTES.nucleoPorQue]: datos.nucleoPorQue
    };
    for (const [clave, valor] of Object.entries(nucleo)) {
      if (valor === undefined) continue;
      if (game.settings.get(RB.ID, clave) !== valor) await game.settings.set(RB.ID, clave, valor);
    }
  }

  static async #tirar() {
    if (!game.user.isGM) return;
    const a = RevelacionApp.analizar();
    if (!a.umbralAlcanzado) return ui.notifications.warn("No habéis alcanzado el Umbral del caso.");
    if (a.sinClasificar.length) return ui.notifications.warn("Ninguna Pista puede ignorarse: clasificad todas antes de Revelar.");
    if (!a.caso.nucleo.que || !a.caso.nucleo.quien || !a.caso.nucleo.porque) {
      return ui.notifications.warn("Formulad las tres afirmaciones del Núcleo antes de tirar.");
    }

    const roll = await new Roll(`2d6 + ${a.afinacion}`).evaluate();
    const grado = gradoRevelacion(roll.total, a.interferencias.length);
    const degradado = roll.total >= 10 && grado === "distorsionada";

    const ancla = a.anclaObligatoria
      ?? a.interferencias[0]
      ?? a.senales.filter(p => !p.system.ancla)[0]
      ?? a.senales[1]
      ?? null;

    const contenido = await foundry.applications.handlebars.renderTemplate(
      "systems/ruido-blanco/templates/chat/revelacion.hbs",
      {
        caso: a.caso,
        total: roll.total,
        afinacion: a.afinacion,
        grado,
        degradado,
        control: a.control,
        mordedura: a.mordedura,
        senales: a.senales.length,
        ruido: a.ruido.length,
        interferencias: a.interferencias.length,
        anclaDistorsion: ancla ? { codigo: ancla.system.codigo || ancla.name, texto: ancla.system.texto } : null,
        lentes: RB.LENTES.filter(l => !(l.requiereSinControl && a.control)),
        esClara: grado === "clara",
        esDistorsionada: grado === "distorsionada",
        esFalsoPositivo: grado === "falso-positivo"
      }
    );

    await ChatMessage.create({ content: contenido, rolls: [roll], sound: CONFIG.sounds.dice });
    this.render(false);
  }

  /** Retirada: protegéis lo que pueda salvarse. Ruido de Fondo +1. */
  static async #retirada() {
    await subirRuidoFondo(1, "Retirada tras un Falso Positivo");
    await ChatMessage.create({
      content: `<div class="rb-chat rb-chat-revelacion"><h3>Retirada</h3>
        <p>Esta vía ha fallado. La consecuencia anunciada ocurre de manera limitada pero real.
        El GM indica qué vías siguen existiendo, sin entregar una Pista nueva.</p></div>`
    });
  }

  /** Seguir la Grieta: actuáis sobre el nuevo dato. Ruido de Fondo +2. */
  static async #grieta() {
    await subirRuidoFondo(2, "Seguir la Grieta tras un Falso Positivo");
    await ChatMessage.create({
      content: `<div class="rb-chat rb-chat-revelacion"><h3>Seguir la Grieta</h3>
        <p>La Pista Dura señala una persona, lugar, registro, objeto o acción. La siguiente escena
        empieza allí y aún habrá que actuar para conseguir algo.</p>
        <p class="rb-chat-nota">Protección de la Grieta: una Reacción no puede destruir esa fuente
        antes de que los investigadores tengan una oportunidad significativa de interactuar con ella.</p></div>`
    });
  }

  /** Devuelve todas las Pistas a "sin clasificar" para una Revelación posterior. */
  static async #limpiar() {
    if (!game.user.isGM) return;
    const confirmar = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Limpiar clasificación" },
      content: "<p>Las Pistas vuelven a estar sin clasificar. El Núcleo se conserva.</p>"
    });
    if (!confirmar) return;
    const updates = pistas().map(p => ({ _id: p.id, "system.clasificacion": "", "system.justificacion": "", "system.ancla": "" }));
    if (updates.length) await Item.updateDocuments(updates);
    this.render(false);
  }

  static refrescar() {
    foundry.applications.instances.get("rb-revelacion")?.render(false);
  }
}
