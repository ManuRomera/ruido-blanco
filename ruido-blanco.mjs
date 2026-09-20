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
import { registrarAjustes, escucharSocket, resolverReaccionMayor } from "./module/caso.mjs";
import { ActorsCollection, ItemsCollection } from "./module/compat.mjs";

const PLANTILLAS = [
  "systems/ruido-blanco/templates/partials/pista-tarjeta.hbs",
  "systems/ruido-blanco/templates/partials/ruido-track.hbs"
];

Hooks.once("init", async () => {
  console.log("RUIDO BLANCO | Limpiando la frecuencia.");

  CONFIG.RB = RB;
  CONFIG.Actor.documentClass = RuidoBlancoActor;
  CONFIG.Actor.dataModels = { investigador: InvestigadorData, pnj: PnjData };
  CONFIG.Item.dataModels = { pista: PistaData, hipotesis: HipotesisData };

  ActorsCollection.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  ActorsCollection.registerSheet(RB.ID, InvestigadorSheet, {
    types: ["investigador"], makeDefault: true, label: "RB.Ficha.Investigador"
  });
  ActorsCollection.registerSheet(RB.ID, PnjSheet, {
    types: ["pnj"], makeDefault: true, label: "RB.Ficha.Pnj"
  });

  ItemsCollection.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  ItemsCollection.registerSheet(RB.ID, PistaSheet, {
    types: ["pista"], makeDefault: true, label: "RB.Ficha.Pista"
  });
  ItemsCollection.registerSheet(RB.ID, HipotesisSheet, {
    types: ["hipotesis"], makeDefault: true, label: "RB.Ficha.Hipotesis"
  });

  registrarAjustes();
  await foundry.applications.handlebars.loadTemplates(PLANTILLAS);
});

Hooks.once("ready", () => {
  escucharSocket();
  game.ruidoBlanco = { RB, MuroApp, RevelacionApp, abrirMuro: () => MuroApp.abrir() };
});

/** Botones de la barra lateral del lienzo. */
Hooks.on("getSceneControlButtons", controls => {
  controls[RB.ID] = {
    name: RB.ID,
    order: 90,
    title: "RB.Muro.Titulo",
    icon: "fa-solid fa-diagram-project",
    activeTool: "muro",
    tools: {
      muro: {
        name: "muro",
        order: 1,
        title: "RB.Muro.Titulo",
        icon: "fa-solid fa-diagram-project",
        button: true,
        onChange: () => MuroApp.abrir()
      },
      revelacion: {
        name: "revelacion",
        order: 2,
        title: "RB.Revelacion.Titulo",
        icon: "fa-solid fa-bullseye",
        button: true,
        onChange: () => new RevelacionApp().render(true)
      }
    }
  };
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

/** El Muro y la Revelación leen documentos del mundo: se refrescan cuando cambian. */
for (const hook of ["createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hook, item => {
    if (!["pista", "hipotesis"].includes(item.type)) return;
    MuroApp.refrescar();
    RevelacionApp.refrescar();
  });
}

Hooks.on("ruidoBlancoRuidoFondo", () => MuroApp.refrescar());

/** Botón "Resolver Reacción Mayor" dentro del mensaje de chat. */
Hooks.on("renderChatMessageHTML", (_message, html) => {
  const boton = html.querySelector("[data-action='rb-reaccion-mayor']");
  if (!boton) return;
  if (!game.user.isGM) return boton.remove();
  boton.addEventListener("click", () => resolverReaccionMayor());
});
