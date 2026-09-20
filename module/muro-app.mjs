/**
 * Muro de investigación. Durante la investigación existen solo dos zonas:
 * PISTAS (hechos) e HIPÓTESIS (frases de la mesa, tachables). El hilo rojo une
 * cada hipótesis con las Pistas que dice estar usando.
 */
import { RB } from "./config.mjs";
import {
  SOCKET, estadoCaso, pistas, hipotesis, fijarCaso, fijarRuidoFondo,
  resolverReaccionMayor, actualizarItem, comprobarUmbral
} from "./caso.mjs";
import { RevelacionApp } from "./revelacion-app.mjs";
import { formulario, preguntarTexto, confirmar } from "./dialogos.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Giro estable por documento: la misma tarjeta se tuerce siempre igual. */
function giro(id, amplitud = 1.6) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return (((h / 1000) * 2 - 1) * amplitud).toFixed(2);
}

export class MuroApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Hipótesis seleccionada: resalta sus hilos y permite enlazar con un clic. */
  #seleccion = null;
  #redibujar = null;

  static DEFAULT_OPTIONS = {
    id: "rb-muro",
    classes: ["ruido-blanco", "rb-app"],
    window: { title: "RB.Muro.Titulo", icon: "fa-solid fa-diagram-project", resizable: true },
    position: { width: 1180, height: 800 },
    actions: {
      nuevaPista: MuroApp.#nuevaPista,
      nuevaHipotesis: MuroApp.#nuevaHipotesis,
      abrir: MuroApp.#abrir,
      borrar: MuroApp.#borrar,
      descubrir: MuroApp.#descubrir,
      profundizar: MuroApp.#profundizar,
      tachar: MuroApp.#tachar,
      seleccionar: MuroApp.#seleccionar,
      enlazar: MuroApp.#enlazar,
      ruido: MuroApp.#ruido,
      reaccionMayor: () => resolverReaccionMayor(),
      revelacion: () => RevelacionApp.abrir(),
      editarCaso: MuroApp.#editarCaso,
      nuevaEscena: MuroApp.#nuevaEscena,
      nuevaSesion: MuroApp.#nuevaSesion
    }
  };

  static PARTS = {
    main: { template: "systems/ruido-blanco/templates/apps/muro.hbs", scrollable: [".rb-columna-cuerpo"] }
  };

  async _prepareContext() {
    const caso = estadoCaso();
    const esGM = game.user.isGM;
    const verOcultas = esGM;
    const mostrar = esGM || game.settings.get(RB.ID, "mostrarPistasJugadores");

    const todas = pistas();
    const descubiertas = todas.filter(p => p.system.descubierta);
    const visibles = todas.filter(p => verOcultas || (mostrar && p.system.descubierta));
    const hipos = hipotesis();
    const seleccionada = hipos.find(h => h.id === this.#seleccion) ?? null;
    const enlazadas = new Set(seleccionada?.system.pistas ?? []);

    return {
      caso, esGM,
      seleccionId: seleccionada?.id ?? null,
      seleccionTexto: seleccionada?.system.texto ?? "",
      pistas: visibles.map(p => ({
        id: p.id,
        nombre: p.name,
        giro: giro(p.id),
        ...p.system,
        enlazada: enlazadas.has(p.id),
        clasificada: Boolean(p.system.clasificacion),
        marca: p.system.clasificacion ? game.i18n.localize(RB.CLASIFICACION[p.system.clasificacion]) : "",
        editable: p.isOwner
      })),
      hipotesis: hipos.map(h => ({
        id: h.id,
        giro: giro(h.id, 2),
        ...h.system,
        seleccionada: h.id === seleccionada?.id,
        codigos: h.system.pistas
          .map(id => game.items.get(id)?.system.codigo)
          .filter(Boolean).join(", "),
        editable: h.isOwner
      })),
      descubiertas: descubiertas.length,
      faltan: Math.max(0, caso.umbral - descubiertas.length),
      umbralAlcanzado: descubiertas.length >= caso.umbral,
      sobreUmbral: Math.max(0, descubiertas.length - caso.umbral),
      ruidoTrack: Array.fromRange(RB.RUIDO_FONDO.MAX + 1).map(n => ({
        n,
        activo: n <= caso.ruido,
        reaccion: n === RB.RUIDO_FONDO.REACCION,
        mayor: n === RB.RUIDO_FONDO.REACCION_MAYOR
      })),
      enReaccionMayor: caso.ruido >= RB.RUIDO_FONDO.REACCION_MAYOR
    };
  }

  /* ------------------------------------------------------------- Render */

  _onRender(contexto, opciones) {
    super._onRender(contexto, opciones);
    const raiz = this.element;

    // Arrastrar una Pista sobre una Hipótesis crea o deshace el enlace.
    for (const carta of raiz.querySelectorAll("[data-tipo='pista']")) {
      carta.draggable = true;
      carta.addEventListener("dragstart", ev => {
        carta.classList.add("arrastrando");
        ev.dataTransfer.setData("text/plain", JSON.stringify({ rb: "pista", id: carta.dataset.id }));
      });
      carta.addEventListener("dragend", () => carta.classList.remove("arrastrando"));
    }

    for (const nota of raiz.querySelectorAll("[data-tipo='hipotesis']")) {
      nota.addEventListener("dragover", ev => { ev.preventDefault(); nota.classList.add("sobre"); });
      nota.addEventListener("dragleave", () => nota.classList.remove("sobre"));
      nota.addEventListener("drop", async ev => {
        ev.preventDefault();
        nota.classList.remove("sobre");
        const carga = leerCarga(ev);
        if (carga?.rb !== "pista") return;
        await MuroApp.alternarEnlace(nota.dataset.id, carga.id);
      });
    }

    // El hilo se recalcula al render y mientras se desplazan las columnas.
    this.#redibujar = () => this.#dibujarHilos();
    for (const cuerpo of raiz.querySelectorAll(".rb-columna-cuerpo")) {
      cuerpo.addEventListener("scroll", this.#redibujar, { passive: true });
    }
    window.addEventListener("resize", this.#redibujar);
    requestAnimationFrame(this.#redibujar);
  }

  _onClose(opciones) {
    if (this.#redibujar) window.removeEventListener("resize", this.#redibujar);
    super._onClose(opciones);
  }

  /** Dibuja una línea por cada pareja Hipótesis ↔ Pista visible en pantalla. */
  #dibujarHilos() {
    const lienzo = this.element?.querySelector(".rb-hilo");
    const marco = this.element?.querySelector(".rb-columnas");
    if (!lienzo || !marco) return;

    const base = marco.getBoundingClientRect();
    lienzo.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);
    lienzo.innerHTML = "";

    const centro = (el, lado) => {
      const r = el.getBoundingClientRect();
      return {
        x: (lado === "izq" ? r.right : r.left) - base.left,
        y: r.top + r.height / 2 - base.top
      };
    };
    // Una tarjeta desplazada fuera de su columna no debe arrastrar el hilo.
    const visible = el => {
      const c = el.closest(".rb-columna-cuerpo").getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return r.bottom > c.top + 4 && r.top < c.bottom - 4;
    };

    for (const nota of this.element.querySelectorAll("[data-tipo='hipotesis']")) {
      const hipo = game.items.get(nota.dataset.id);
      if (!hipo || hipo.system.descartada) continue;
      if (!visible(nota)) continue;
      const destacado = hipo.id === this.#seleccion;
      const b = centro(nota, "der");

      for (const pistaId of hipo.system.pistas) {
        const carta = this.element.querySelector(`[data-tipo='pista'][data-id='${pistaId}']`);
        if (!carta || !visible(carta)) continue;
        const a = centro(carta, "izq");
        const linea = document.createElementNS("http://www.w3.org/2000/svg", "line");
        linea.setAttribute("x1", a.x); linea.setAttribute("y1", a.y);
        linea.setAttribute("x2", b.x); linea.setAttribute("y2", b.y);
        if (destacado) linea.classList.add("destacado");
        lienzo.appendChild(linea);
      }
    }
  }

  /* ------------------------------------------------------------ Acciones */

  static async #nuevaPista() {
    if (!game.user.isGM) return;
    const datos = await formulario({
      titulo: "Nueva Pista",
      aceptar: "Colgar en el Muro",
      contenido: `<div class="rb-dialog">
        <p class="rb-lead">Un hecho concreto, sin su explicación. Debe admitir al menos dos lecturas plausibles.</p>
        <div class="rb-opciones">
          <div><label>Código</label><input type="text" name="codigo" value="P${pistas().length + 1}"></div>
          <div><label>Lugar</label><input type="text" name="lugar" placeholder="Dónde aparece"></div>
        </div>
        <div><label>Título breve</label><input type="text" name="nombre" autofocus></div>
        <div><label>El hecho</label><textarea name="texto" rows="4"
          placeholder="Hora, objeto, conducta, contradicción, transferencia, acceso o relación."></textarea></div>
        <div><label>Limitación de la fuente (opcional)</label><input type="text" name="fiabilidad"
          placeholder="Copia sin metadatos, declaración interesada, imagen parcial…"></div>
        <label class="rb-check"><input type="checkbox" name="descubierta"> Ya descubierta por la mesa</label>
      </div>`
    });
    if (!datos) return;

    const [pista] = await Item.createDocuments([{
      name: datos.nombre?.trim() || `Pista ${datos.codigo}`,
      type: "pista",
      img: "icons/svg/eye.svg",
      system: {
        codigo: datos.codigo ?? "", texto: datos.texto ?? "", lugar: datos.lugar ?? "",
        fiabilidad: datos.fiabilidad ?? "", descubierta: Boolean(datos.descubierta)
      }
    }]);
    if (pista?.system.descubierta) await comprobarUmbral();
  }

  static async #nuevaHipotesis() {
    const texto = await preguntarTexto({
      titulo: "Nueva hipótesis",
      etiqueta: "Hipótesis",
      ayuda: "Ninguna conexión se convierte en verdad por decirla muchas veces.",
      aceptar: "Colgar en el Muro"
    });
    if (!texto) return;

    const datos = { texto, autor: game.user.name };
    if (!game.user.can("ITEM_CREATE")) {
      game.socket.emit(SOCKET, { accion: "crearHipotesis", ...datos });
      return;
    }
    await Item.createDocuments([{
      name: texto.slice(0, 60), type: "hipotesis", img: "icons/svg/sound.svg",
      system: { ...datos, pistas: [] }
    }]);
  }

  static #abrir(_ev, destino) {
    game.items.get(destino.closest("[data-id]")?.dataset.id)?.sheet.render(true);
  }

  static async #borrar(_ev, destino) {
    const doc = game.items.get(destino.closest("[data-id]")?.dataset.id);
    if (!doc) return;
    if (!(await confirmar({ titulo: "Quitar del Muro", contenido: `<p>¿Quitar <strong>${doc.name}</strong>?</p>` }))) return;
    if (doc.isOwner) await doc.delete();
    else game.socket.emit(SOCKET, { accion: "borrarItem", id: doc.id });
  }

  static async #descubrir(_ev, destino) {
    if (!game.user.isGM) return;
    const doc = game.items.get(destino.closest("[data-id]")?.dataset.id);
    if (!doc) return;
    await doc.update({ "system.descubierta": !doc.system.descubierta });
    await comprobarUmbral();
  }

  /** Profundizar: una acción arriesgada añade contexto a la misma tarjeta. */
  static async #profundizar(_ev, destino) {
    const doc = game.items.get(destino.closest("[data-id]")?.dataset.id);
    if (!doc) return;
    const texto = await preguntarTexto({
      titulo: `Profundizar · ${doc.system.codigo || doc.name}`,
      etiqueta: "Contexto adicional",
      valor: doc.system.contexto,
      ayuda: "Procedencia, cronología, relación con otra persona o una limitación técnica. Si constituye una Pista nueva, créala aparte.",
      aceptar: "Añadir a la tarjeta"
    });
    if (texto === null) return;
    await actualizarItem(doc, { "system.contexto": texto });
  }

  static async #tachar(_ev, destino) {
    const doc = game.items.get(destino.closest("[data-id]")?.dataset.id);
    if (!doc) return;
    await actualizarItem(doc, { "system.descartada": !doc.system.descartada });
  }

  static #seleccionar(_ev, destino) {
    const id = destino.closest("[data-id]")?.dataset.id;
    this.#seleccion = this.#seleccion === id ? null : id;
    this.render(false);
  }

  /** Con una hipótesis seleccionada, un clic en la Pista crea o deshace el enlace. */
  static async #enlazar(_ev, destino) {
    if (!this.#seleccion) {
      return ui.notifications.info("Selecciona antes una hipótesis: el hilo va de la hipótesis a sus Pistas.");
    }
    await MuroApp.alternarEnlace(this.#seleccion, destino.closest("[data-id]")?.dataset.id);
  }

  static async alternarEnlace(hipotesisId, pistaId) {
    const hipo = game.items.get(hipotesisId);
    if (!hipo || !pistaId) return;
    const actuales = new Set(hipo.system.pistas);
    actuales.has(pistaId) ? actuales.delete(pistaId) : actuales.add(pistaId);
    await actualizarItem(hipo, { "system.pistas": [...actuales] });
  }

  static async #ruido(_ev, destino) {
    if (!game.user.isGM) return;
    await fijarRuidoFondo(Number(destino.dataset.valor), "Ajuste del GM");
  }

  static async #editarCaso() {
    if (!game.user.isGM) return;
    const caso = estadoCaso();
    const opciones = Object.entries(RB.UMBRALES)
      .map(([id, u]) => `<option value="${id}" ${id === caso.tamano ? "selected" : ""}>${u.label} · ${u.pistas} Pistas</option>`).join("");
    const datos = await formulario({
      titulo: "Editar el caso",
      aceptar: "Guardar",
      contenido: `<div class="rb-dialog">
        <div><label>Caso</label><input type="text" name="nombre" value="${foundry.utils.escapeHTML(caso.nombre)}"></div>
        <div><label>Pregunta Central</label><textarea name="pregunta" rows="3"
          placeholder="Debe admitir respuestas distintas y exigir una explicación, no un dato binario.">${foundry.utils.escapeHTML(caso.pregunta)}</textarea></div>
        <div><label>Tamaño</label><select name="tamano">${opciones}</select></div>
      </div>`
    });
    if (!datos) return;
    await fijarCaso(datos);
    await comprobarUmbral();
  }

  static async #nuevaEscena() {
    if (!game.user.isGM) return;
    await MuroApp.#reiniciarInvestigadores({ sesion: false });
    ui.notifications.info("Nueva escena: los Talentos de una vez por escena vuelven a estar disponibles.");
  }

  static async #nuevaSesion() {
    if (!game.user.isGM) return;
    if (!(await confirmar({
      titulo: "Nueva sesión",
      contenido: "<p>Devuelve los Talentos y las dos Anclas personales de todos los investigadores.</p>"
    }))) return;
    await MuroApp.#reiniciarInvestigadores({ sesion: true });
    ui.notifications.info("Nueva sesión: Talentos y Anclas personales devueltos.");
  }

  static async #reiniciarInvestigadores({ sesion }) {
    const cambios = game.actors
      .filter(a => a.type === "investigador")
      .map(a => sesion
        ? { _id: a.id, "system.talento.usos": 0, "system.anclas.a1.usada": false, "system.anclas.a2.usada": false }
        : { _id: a.id, "system.talento.usos": 0 });
    if (cambios.length) await Actor.updateDocuments(cambios);
  }

  /* --------------------------------------------------------------- Ayudas */

  static abrir() {
    const existente = foundry.applications.instances.get("rb-muro");
    if (existente) return existente.bringToFront();
    return new MuroApp().render(true);
  }

  static refrescar() {
    foundry.applications.instances.get("rb-muro")?.render(false);
  }
}

function leerCarga(evento) {
  try { return JSON.parse(evento.dataTransfer.getData("text/plain")); }
  catch { return null; }
}
