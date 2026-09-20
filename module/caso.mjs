/** Estado compartido del caso: Ruido de Fondo, Umbral, Núcleo y relevo por socket. */
import { RB } from "./config.mjs";

export const SOCKET = `system.${RB.ID}`;

export const AJUSTES = {
  nombre: "casoNombre",
  pregunta: "casoPregunta",
  tamano: "casoTamano",
  ruido: "ruidoFondo",
  nucleoQue: "nucleoQue",
  nucleoQuien: "nucleoQuien",
  nucleoPorQue: "nucleoPorQue",
  umbralAvisado: "umbralAvisado"
};

const get = clave => game.settings.get(RB.ID, clave);
const set = (clave, valor) => game.settings.set(RB.ID, clave, valor);

export function registrarAjustes() {
  const mundo = (clave, nombre, tipo, inicial, extra = {}) =>
    game.settings.register(RB.ID, clave, { name: nombre, scope: "world", config: false, type: tipo, default: inicial, ...extra });

  mundo(AJUSTES.nombre, "Nombre del caso", String, "");
  mundo(AJUSTES.pregunta, "Pregunta Central", String, "");
  mundo(AJUSTES.tamano, "Tamaño del caso", String, "estandar");
  mundo(AJUSTES.ruido, "Ruido de Fondo", Number, 0, {
    onChange: valor => Hooks.callAll("ruidoBlancoRuidoFondo", valor)
  });
  mundo(AJUSTES.nucleoQue, "QUÉ OCURRIÓ", String, "");
  mundo(AJUSTES.nucleoQuien, "QUIÉN / QUÉ LO PROVOCÓ", String, "");
  mundo(AJUSTES.nucleoPorQue, "POR QUÉ", String, "");
  mundo(AJUSTES.umbralAvisado, "Umbral ya anunciado", Boolean, false);

  game.settings.register(RB.ID, "mostrarPistasJugadores", {
    name: "RB.Ajustes.MostrarPistas",
    hint: "RB.Ajustes.MostrarPistasHint",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: () => Hooks.callAll("ruidoBlancoRefrescar")
  });
}

export function estadoCaso() {
  const tamano = get(AJUSTES.tamano);
  const umbral = RB.UMBRALES[tamano] ?? RB.UMBRALES.estandar;
  return {
    nombre: get(AJUSTES.nombre),
    pregunta: get(AJUSTES.pregunta),
    tamano,
    umbral: umbral.pistas,
    umbralLabel: umbral.label,
    ruido: Number(get(AJUSTES.ruido) ?? 0),
    nucleo: { que: get(AJUSTES.nucleoQue), quien: get(AJUSTES.nucleoQuien), porque: get(AJUSTES.nucleoPorQue) }
  };
}

export async function fijarCaso({ nombre, pregunta, tamano }) {
  if (!game.user.isGM) return;
  if (nombre !== undefined) await set(AJUSTES.nombre, nombre);
  if (pregunta !== undefined) await set(AJUSTES.pregunta, pregunta);
  if (tamano !== undefined) await set(AJUSTES.tamano, tamano);
  Hooks.callAll("ruidoBlancoRefrescar");
}

/** El Núcleo lo dictan los jugadores; si no son GM, el GM lo escribe por ellos. */
export async function fijarNucleo(campo, valor) {
  const clave = { que: AJUSTES.nucleoQue, quien: AJUSTES.nucleoQuien, porque: AJUSTES.nucleoPorQue }[campo];
  if (!clave) return;
  if (!game.user.isGM) return game.socket.emit(SOCKET, { accion: "nucleo", campo, valor });
  if (get(clave) === valor) return;
  await set(clave, valor);
  Hooks.callAll("ruidoBlancoRefrescar");
}

export function pistas({ soloDescubiertas = false } = {}) {
  const todas = game.items.filter(i => i.type === "pista");
  const lista = soloDescubiertas ? todas.filter(i => i.system.descubierta) : todas;
  return lista.sort((a, b) =>
    (a.system.codigo || a.name).localeCompare(b.system.codigo || b.name, "es", { numeric: true }));
}

export function hipotesis() {
  return game.items.filter(i => i.type === "hipotesis").sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

/** Avisa una sola vez, cuando la mesa alcanza el Umbral del caso. */
export async function comprobarUmbral() {
  if (!game.user.isGM) return;
  const { umbral } = estadoCaso();
  const descubiertas = pistas({ soloDescubiertas: true }).length;
  if (descubiertas < umbral) {
    if (get(AJUSTES.umbralAvisado)) await set(AJUSTES.umbralAvisado, false);
    return;
  }
  if (get(AJUSTES.umbralAvisado)) return;
  await set(AJUSTES.umbralAvisado, true);
  await ChatMessage.create({
    content: `<div class="rb-chat"><div class="rb-chat-cab">
        <span class="rb-chat-quien">Umbral del caso</span><h3>Podéis Revelar</h3>
        <span class="rb-chat-total">${descubiertas}</span></div>
      <p class="rb-chat-efecto">Habéis alcanzado el Umbral de ${umbral} Pistas. Podéis Revelar, pero no estáis obligados:
        encontrar más información nunca reduce directamente vuestra Afinación.</p>
      <div class="rb-chat-botones"><button type="button" data-rb="abrir-revelacion">Abrir la Revelación</button></div></div>`
  });
}

/* ------------------------------------------------------------ Ruido de Fondo */

export async function subirRuidoFondo(cantidad = 1, motivo = "") {
  if (!game.user.isGM) return game.socket.emit(SOCKET, { accion: "ruido", cantidad, motivo });
  await moverRuido(Number(get(AJUSTES.ruido) ?? 0) + cantidad, motivo);
}

export async function bajarRuidoFondo(cantidad = 1, motivo = "") {
  if (!game.user.isGM) return game.socket.emit(SOCKET, { accion: "ruido", cantidad: -cantidad, motivo });
  await moverRuido(Number(get(AJUSTES.ruido) ?? 0) - cantidad, motivo);
}

export async function fijarRuidoFondo(valor, motivo = "") {
  if (!game.user.isGM) return;
  await moverRuido(valor, motivo);
}

async function moverRuido(destino, motivo) {
  const antes = Number(get(AJUSTES.ruido) ?? 0);
  const despues = Math.clamp(Number(destino) || 0, 0, RB.RUIDO_FONDO.MAX);
  if (antes === despues) return;
  await set(AJUSTES.ruido, despues);
  await avisarRuido(antes, despues, motivo);
}

/** Tras una Reacción Mayor el contador vuelve a 3: el coste irreversible ya ocurrió. */
export async function resolverReaccionMayor() {
  if (!game.user.isGM) return;
  await set(AJUSTES.ruido, RB.RUIDO_FONDO.TRAS_MAYOR);
  Hooks.callAll("ruidoBlancoRefrescar");
  await ChatMessage.create({
    content: `<div class="rb-chat rb-chat-ruido"><div class="rb-chat-cab">
        <span class="rb-chat-quien">Ruido de Fondo</span><h3>Reacción Mayor resuelta</h3>
        <span class="rb-chat-total">${RB.RUIDO_FONDO.TRAS_MAYOR}</span></div>
      <p class="rb-chat-efecto">El coste irreversible ya ha ocurrido. El contador vuelve a 3.</p></div>`
  });
}

async function avisarRuido(antes, despues, motivo) {
  const cruza = umbral => antes < umbral && despues >= umbral;
  let titulo = despues > antes ? "Sube el Ruido de Fondo" : "Baja el Ruido de Fondo";
  let cuerpo = motivo ? `<p class="rb-chat-apuesta">${motivo}</p>` : "";
  let botones = "";

  if (cruza(RB.RUIDO_FONDO.REACCION_MAYOR)) {
    titulo = "Reacción Mayor";
    cuerpo += `<p class="rb-chat-efecto">Ocurre un coste irreversible: una fuente deja de colaborar, un acceso se pierde,
      alguien huye, una relación se rompe, una prueba desaparece, entra una autoridad externa o la investigación se hace pública.</p>
      <p class="rb-chat-nota">No puede convertir el caso en injugable: si quemáis dos de cuatro vías, quedan dos.</p>`;
    botones = `<div class="rb-chat-botones"><button type="button" data-rb="reaccion-mayor">Resolver y bajar a 3</button></div>`;
  } else if (cruza(RB.RUIDO_FONDO.REACCION)) {
    titulo = "Reacción";
    cuerpo += `<p class="rb-chat-efecto">Algo responde a la investigación: cambia conducta, restringe una vía, crea urgencia
      o expone una vulnerabilidad.</p>
      <p class="rb-chat-nota">Puede abrir una oportunidad, pero nunca regala una Pista: para convertirla en información hay que actuar.</p>`;
  }

  await ChatMessage.create({
    content: `<div class="rb-chat rb-chat-ruido"><div class="rb-chat-cab">
        <span class="rb-chat-quien">Ruido de Fondo ${antes} → ${despues}</span><h3>${titulo}</h3>
        <span class="rb-chat-total">${despues}</span></div>${cuerpo}${botones}</div>`
  });
}

/* ------------------------------------------------------------------- Socket */

/**
 * Los ajustes de mundo y los documentos los escribe el GM. Los jugadores piden;
 * el primer GM conectado aplica, para que dos GM no dupliquen la acción.
 */
export function escucharSocket() {
  game.socket.on(SOCKET, async datos => {
    const primerGM = game.users.activeGM;
    if (!primerGM || primerGM.id !== game.user.id) return;

    switch (datos?.accion) {
      case "ruido":
        await (datos.cantidad >= 0
          ? subirRuidoFondo(datos.cantidad, datos.motivo)
          : bajarRuidoFondo(-datos.cantidad, datos.motivo));
        break;
      case "nucleo":
        await fijarNucleo(datos.campo, datos.valor);
        break;
      case "crearHipotesis":
        await Item.createDocuments([{
          name: String(datos.texto).slice(0, 60),
          type: "hipotesis",
          img: "icons/svg/sound.svg",
          system: { texto: datos.texto, autor: datos.autor, pistas: [] }
        }]);
        break;
      case "actualizarItem": {
        const doc = game.items.get(datos.id);
        if (doc) await doc.update(datos.cambios);
        break;
      }
      case "borrarItem": {
        const doc = game.items.get(datos.id);
        if (doc) await doc.delete();
        break;
      }
    }
  });
}

/** Actualiza un Item del mundo, pasando por el GM cuando hace falta. */
export async function actualizarItem(item, cambios) {
  if (item.isOwner) return item.update(cambios);
  game.socket.emit(SOCKET, { accion: "actualizarItem", id: item.id, cambios });
}
