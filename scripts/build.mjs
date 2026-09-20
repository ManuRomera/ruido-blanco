/** Compila _data/*.json a los packs LevelDB que lee Foundry. */
import fs from "node:fs/promises";
import { ClassicLevel } from "classic-level";

const manifiesto = JSON.parse(await fs.readFile("system.json"));

/** Prefijos LevelDB de Foundry: documento raíz y colecciones embebidas. */
const RAIZ = { JournalEntry: "journal", Item: "items", Actor: "actors", RollTable: "tables", Scene: "scenes" };
const EMBEBIDOS = {
  JournalEntry: ["pages"],
  Actor: ["items", "effects"],
  Item: ["effects"],
  RollTable: ["results"]
};

/**
 * Compilar con Foundry abierto destruye los packs: `fs.rm` borra el directorio
 * bajo los descriptores que Foundry mantiene abiertos, LevelDB entra en
 * recuperación y deja la base vacía. Se comprueba antes de tocar nada.
 */
async function comprobarCerrados(packs) {
  const bloqueados = [];
  for (const pack of packs) {
    if (!(await fs.stat(pack.path).catch(() => null))) continue;
    const db = new ClassicLevel(pack.path, { valueEncoding: "json" });
    try {
      await db.open();
      await db.close();
    } catch (error) {
      if ((error.cause?.code ?? error.code) === "LEVEL_LOCKED") bloqueados.push(pack.name);
      else throw error;
    }
  }
  if (bloqueados.length) {
    throw new Error(
      `Foundry tiene abiertos estos packs: ${bloqueados.join(", ")}.\n` +
      "Cierra Foundry por completo antes de compilar."
    );
  }
}

await comprobarCerrados(manifiesto.packs);
await fs.mkdir("packs", { recursive: true });

for (const pack of manifiesto.packs) {
  await fs.rm(pack.path, { recursive: true, force: true });
  const db = new ClassicLevel(pack.path, { valueEncoding: "json" });
  const crudo = JSON.parse(await fs.readFile(`_data/${pack.name}.json`));
  const carpetas = Array.isArray(crudo) ? [] : (crudo.folders ?? []);
  const documentos = Array.isArray(crudo) ? crudo : (crudo.documents ?? []);
  const raiz = RAIZ[pack.type];
  if (!raiz) throw new Error(`${pack.name}: tipo de pack no soportado (${pack.type})`);

  for (const carpeta of carpetas) await db.put(`!folders!${carpeta._id}`, { type: pack.type, ...carpeta });

  for (const origen of documentos) {
    const doc = structuredClone(origen);
    for (const coleccion of EMBEBIDOS[pack.type] ?? []) {
      const filas = doc[coleccion];
      if (!Array.isArray(filas)) continue;
      // El padre guarda solo los ids; cada hijo va en su propia clave.
      doc[coleccion] = filas.map(f => f._id);
      for (const fila of filas) await db.put(`!${raiz}.${coleccion}!${doc._id}.${fila._id}`, fila);
    }
    await db.put(`!${raiz}!${doc._id}`, doc);
  }

  await db.close();
  console.log(`pack ${pack.name}: ${documentos.length} documentos`);
}
