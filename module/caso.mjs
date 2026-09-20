/** Estado compartido del caso: Ruido de Fondo, Umbral y Núcleo de la Revelación. */
import { RB } from "./config.mjs";

export const SOCKET = `system.${RB.ID}`;

export const AJUSTES = {
  nombre: "casoNombre",
  pregunta: "casoPregunta",
  tamano: "casoTamano",
  ruido: "ruidoFondo",
  nucleoQue: "nucleoQue",
  nucleoQuien: "nucleoQuien",
  nucleoPorQue: "nucleoPorQue"
};

const get = clave => game.settings.get(RB.ID, clave);

export function registrarAjustes() {
  const mundo = (clave, nombre, tipo, valorInicial, extra = {}) =>
    game.settings.register(RB.ID, clave, {
      name: nombre, scope: "world", config: false, type: tipo, default: valorInicial, ...extra
    });

  mundo(AJUSTES.nombre, "Nombre del caso", String, "");
  mundo(AJUSTES.pregunta, "Pregunta Central", String, "");
  mundo(AJUSTES.tamano, "Tamaño del caso", String, "estandar");
  mundo(AJUSTES.ruido, "Ruido de Fondo", Number, 0, {
    onChange: valor => Hooks.callAll("ruidoBlancoRuidoFondo", valor)
  });
  mundo(AJUSTES.nucleoQue, "QUÉ OCURRIÓ", String, "");
  mundo(AJUSTES.nucleoQuien, "QUIÉN / QUÉ LO PROVOCÓ", String, "");
  mundo(AJUSTES.nucleoPorQue, "POR QUÉ", String, "");

  game.settings.register(RB.ID, "mostrarPistasJugadores", {
    name: "RB.Ajustes.MostrarPistas",
    hint: "RB.Ajustes.MostrarPistasHint",
    scope: "world", config: true, type: Boolean, default: true
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
    nucleo: {
      que: get(AJUSTES.nucleoQue),
      quien: get(AJUSTES.nucleoQuien),
      porque: get(AJUSTES.nucleoPorQue)
    }
  };
}

/** Todas las Pistas del mundo, en orden de código. */
export function pistas({ soloDescubiertas = false } = {}) {
  const todas = game.items.filter(i => i.type === "pista");
  const lista = soloDescubiertas ? todas.filter(i => i.system.descubierta) : todas;
  return lista.sort((a, b) => (a.system.codigo || a.name).localeCompare(b.system.codigo || b.name, "es", { numeric: true }));
}

export function hipotesis() {
  return game.items.filter(i => i.type === "hipotesis").sort((a, b) => a.sort - b.sort);
}

/**
 * Sube el Ruido de Fondo. Nunca aumenta solo porque pase tiempo: siempre
 * refleja algo que la investigación ha provocado, así que exige un motivo.
 */
export async function subirRuidoFondo(cantidad = 1, motivo = "") {
  if (!game.user.isGM) {
    game.socket.emit(SOCKET, { accion: "ruido", cantidad, motivo, usuario: game.user.id });
    return;
  }
  const antes = Number(get(AJUSTES.ruido) ?? 0);
  const despues = Math.clamp(antes + cantidad, 0, RB.RUIDO_FONDO.MAX);
  await game.settings.set(RB.ID, AJUSTES.ruido, despues);
  await avisarRuido(antes, despues, motivo);
}

export async function fijarRuidoFondo(valor, motivo = "") {
  if (!game.user.isGM) return;
  const antes = Number(get(AJUSTES.ruido) ?? 0);
  const despues = Math.clamp(Number(valor) || 0, 0, RB.RUIDO_FONDO.MAX);
  if (antes === despues) return;
  await game.settings.set(RB.ID, AJUSTES.ruido, despues);
  await avisarRuido(antes, despues, motivo);
}

/** Tras una Reacción Mayor el contador vuelve a 3; el coste irreversible ya ha ocurrido. */
export async function resolverReaccionMayor() {
  if (!game.user.isGM) return;
  await game.settings.set(RB.ID, AJUSTES.ruido, RB.RUIDO_FONDO.TRAS_MAYOR);
  await ChatMessage.create({
    content: `<div class="rb-chat rb-chat-ruido"><h3>Reacción Mayor resuelta</h3>
      <p>El coste irreversible ya ha ocurrido. Ruido de Fondo vuelve a ${RB.RUIDO_FONDO.TRAS_MAYOR}.</p></div>`
  });
}

async function avisarRuido(antes, despues, motivo) {
  const cruza = umbral => antes < umbral && despues >= umbral;
  let titulo = `Ruido de Fondo ${antes} → ${despues}`;
  let cuerpo = motivo ? `<p>${motivo}</p>` : "";

  if (cruza(RB.RUIDO_FONDO.REACCION_MAYOR)) {
    titulo = "REACCIÓN MAYOR";
    cuerpo += `<p>Ocurre un coste irreversible: una fuente deja de colaborar, un acceso se pierde,
      alguien huye, una relación se rompe, una prueba desaparece, entra una autoridad externa o la
      investigación se hace pública.</p>
      <button type="button" data-action="rb-reaccion-mayor">Resolver y bajar a ${RB.RUIDO_FONDO.TRAS_MAYOR}</button>`;
  } else if (cruza(RB.RUIDO_FONDO.REACCION)) {
    titulo = "REACCIÓN";
    cuerpo += `<p>Algo responde a la investigación: cambia conducta, restringe una vía, crea urgencia
      o expone una vulnerabilidad. Puede abrir una oportunidad, pero no entrega una Pista.</p>`;
  }

  await ChatMessage.create({
    content: `<div class="rb-chat rb-chat-ruido"><h3>${titulo}</h3>${cuerpo}</div>`
  });
}

/** El GM aplica lo que piden los jugadores: los ajustes de mundo solo los escribe él. */
export function escucharSocket() {
  game.socket.on(SOCKET, async datos => {
    if (!game.user.isGM) return;
    if (datos?.accion === "ruido") await subirRuidoFondo(datos.cantidad, datos.motivo);
  });
}
