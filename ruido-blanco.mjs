/**
 * RUIDO BLANCO — sistema para Foundry VTT.
 * Las Pistas son reales. Su significado, interpretable.
 */
import { RB } from "./module/config.mjs";
import { InvestigadorData, PnjData, PistaData, HipotesisData } from "./module/data-models.mjs";
import { RuidoBlancoActor } from "./module/actor.mjs";
import { InvestigadorSheet, PnjSheet, PistaSheet, HipotesisSheet } from "./module/sheets.mjs";
import { MuroApp } from "./module/muro-app.mjs";
import { RevelacionApp } from "./module/revelacion-app.mjs";
import {
  registrarAjustes, escucharSocket, resolverReaccionMayor,
  subirRuidoFondo, bajarRuidoFondo, comprobarUmbral
} from "./module/caso.mjs";
import { preguntarTexto } from "./module/dialogos.mjs";
import { ActorsCollection, ItemsCollection } from "./module/compat.mjs";

/** Los bordes rasgados del papel salen de un filtro SVG que vive una sola vez. */
const FILTROS = `
<svg class="rb-filtros" aria-hidden="true">
  <filter id="rb-rasgado">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.055" numOctaves="4" seed="7" result="ruido"/>
    <feDisplacementMap in="SourceGraphic" in2="ruido" scale="11" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>`;

Hooks.once("init", () => {
  console.log("RUIDO BLANCO | Limpiando la frecuencia.");

  CONFIG.RB = RB;
  CONFIG.Actor.documentClass = RuidoBlancoActor;
  CONFIG.Actor.dataModels = { investigador: InvestigadorData, pnj: PnjData };
  CONFIG.Item.dataModels = { pista: PistaData, hipotesis: HipotesisData };

  ActorsCollection.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  ActorsCollection.registerSheet(RB.ID, InvestigadorSheet, { types: ["investigador"], makeDefault: true, label: "RB.Ficha.Investigador" });
  ActorsCollection.registerSheet(RB.ID, PnjSheet, { types: ["pnj"], makeDefault: true, label: "RB.Ficha.Pnj" });

  ItemsCollection.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  ItemsCollection.registerSheet(RB.ID, PistaSheet, { types: ["pista"], makeDefault: true, label: "RB.Ficha.Pista" });
  ItemsCollection.registerSheet(RB.ID, HipotesisSheet, { types: ["hipotesis"], makeDefault: true, label: "RB.Ficha.Hipotesis" });

  registrarAjustes();
});

Hooks.once("ready", async () => {
  document.body.insertAdjacentHTML("beforeend", FILTROS);
  escucharSocket();
  game.ruidoBlanco = {
    RB,
    abrirMuro: () => MuroApp.abrir(),
    abrirRevelacion: () => RevelacionApp.abrir(),
    subirRuidoFondo,
    bajarRuidoFondo
  };
  await comprobarUmbral();
});

/** Imagen por defecto por tipo, venga la creación de donde venga. */
const IMAGENES = {
  Actor: { investigador: "icons/svg/mystery-man.svg", pnj: "icons/svg/cowled.svg" },
  Item: { pista: "icons/svg/eye.svg", hipotesis: "icons/svg/sound.svg" }
};

for (const documento of ["Actor", "Item"]) {
  Hooks.on(`preCreate${documento}`, doc => {
    const img = IMAGENES[documento][doc.type];
    if (img && !doc._source.img) doc.updateSource({ img });
  });
}

/** Botones del lienzo. */
Hooks.on("getSceneControlButtons", controles => {
  controles[RB.ID] = {
    name: RB.ID,
    order: 90,
    title: "RB.Muro.Titulo",
    icon: "fa-solid fa-diagram-project",
    activeTool: "muro",
    tools: {
      muro: { name: "muro", order: 1, title: "RB.Muro.Titulo", icon: "fa-solid fa-diagram-project", button: true, onChange: () => MuroApp.abrir() },
      revelacion: { name: "revelacion", order: 2, title: "RB.Revelacion.Titulo", icon: "fa-solid fa-bullseye", button: true, onChange: () => RevelacionApp.abrir() }
    }
  };
});

/** El Muro y la Revelación leen documentos del mundo: se refrescan al cambiar. */
function refrescarTodo() {
  MuroApp.refrescar();
  RevelacionApp.refrescar();
}

Hooks.on("createItem", async item => {
  if (!["pista", "hipotesis"].includes(item.type)) return;
  refrescarTodo();
  if (item.type === "pista") await comprobarUmbral();
});

Hooks.on("updateItem", async (item, cambios) => {
  if (!["pista", "hipotesis"].includes(item.type)) return;
  refrescarTodo();
  if (cambios.system?.descubierta !== undefined) await comprobarUmbral();
});

Hooks.on("deleteItem", async item => {
  if (!["pista", "hipotesis"].includes(item.type)) return;
  refrescarTodo();
  await comprobarUmbral();
});

Hooks.on("ruidoBlancoRuidoFondo", () => MuroApp.refrescar());
Hooks.on("ruidoBlancoRefrescar", refrescarTodo);

/* ------------------------------------------------------ Botones del chat */

const ACCIONES_CHAT = {
  "ruido-mas": () => subirRuidoFondo(1, "Consecuencia anunciada en la Apuesta"),
  "ruido-menos": () => bajarRuidoFondo(1, "Resultado Nítido: la investigación deja menos rastro"),
  "reaccion-mayor": () => resolverReaccionMayor(),
  "abrir-revelacion": () => RevelacionApp.abrir(),
  "pista-dura": () => RevelacionApp.marcarPistaDura(),
  retirada: () => RevelacionApp.retirada(),
  grieta: () => RevelacionApp.grieta(),
  lente: boton => RevelacionApp.aplicarLente(boton.dataset.lente),

  encajar: async (_boton, actor) => actor?.marcarTension(1, { motivo: "Encajar una consecuencia personal" }),

  "encajar-ayudante": async boton => {
    const ayudante = game.actors.get(boton.dataset.id);
    await ayudante?.marcarTension(1, { motivo: `Ayudar expone: ${ayudante.name} absorbe parte del coste` });
  },

  condicion: async (_boton, actor) => {
    if (!actor) return;
    const texto = await preguntarTexto({
      titulo: `Condición · ${actor.name}`,
      etiqueta: "Descriptor de ficción",
      ayuda: "«Costillas golpeadas», «sin credencial», «agotada», «mano vendada». Desaparece cuando la ficción lo permite.",
      aceptar: "Marcar"
    });
    if (texto) await actor.anadirCondicion(texto);
  }
};

/** Solo quien dirige mueve el estado del caso desde el chat. */
const SOLO_GM = new Set(["reaccion-mayor", "pista-dura", "retirada", "grieta", "lente"]);

Hooks.on("renderChatMessageHTML", (mensaje, html) => {
  for (const boton of html.querySelectorAll("[data-rb]")) {
    const accion = boton.dataset.rb;
    if (SOLO_GM.has(accion) && !game.user.isGM) { boton.remove(); continue; }

    const actor = ChatMessage.getSpeakerActor(mensaje.speaker)
      ?? game.actors.get(html.querySelector("[data-actor]")?.dataset.actor);

    // Encajar y marcar Condición solo los pulsa quien controla al investigador.
    if (["encajar", "condicion"].includes(accion) && !(actor?.isOwner)) { boton.remove(); continue; }

    boton.addEventListener("click", ev => {
      ev.preventDefault();
      ACCIONES_CHAT[accion]?.(boton, actor);
    });
  }
});
