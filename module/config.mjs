/** Constantes de RUIDO BLANCO. Todo lo que el manual fija como lista cerrada vive aquí. */
export const RB = {
  ID: "ruido-blanco",

  /** Los cuatro Métodos. Se reparten 2, 1, 1 y 0. */
  METODOS: {
    observar: "RB.Metodo.Observar",
    razonar: "RB.Metodo.Razonar",
    influir: "RB.Metodo.Influir",
    intervenir: "RB.Metodo.Intervenir"
  },

  /** Reparto legal de Métodos en creación. */
  REPARTO_METODOS: [2, 1, 1, 0],

  PROFESIONES: [
    "Periodista",
    "Abogada / cumplimiento",
    "Sanitario",
    "Analista / auditor",
    "Especialista técnico",
    "Investigador privado",
    "Académico / investigador",
    "Seguridad / emergencias"
  ],

  KITS: [
    "Digital",
    "Forense",
    "Vigilancia",
    "Movilidad",
    "Médico",
    "Acceso",
    "Comunicaciones",
    "Legal",
    "Prensa",
    "Campo"
  ],

  /** Talentos de inicio: preguntas, permisos o excepciones. Nunca bonificadores. */
  TALENTOS: [
    { id: "no-encaja", nombre: "Esto no encaja", regla: "Una vez por escena, tras examinar un lugar, pregunta qué detalle objetivo contradice la explicación más obvia." },
    { id: "lectura-sistema", nombre: "Lectura del sistema", regla: "Una vez por escena institucional, pregunta quién puede darte realmente lo que buscas y qué quiere evitar." },
    { id: "ultima-pregunta", nombre: "Una última pregunta", regla: "Cuando termina una conversación, pregunta qué tema intenta cerrar el PNJ. El GM responde con sinceridad." },
    { id: "tengo-alguien", nombre: "Tengo a alguien", regla: "Una vez por caso, introduce un contacto plausible. El GM dice qué quiere a cambio." },
    { id: "acceso-lateral", nombre: "Acceso lateral", regla: "Una vez por escena de entrada, declara una vía secundaria plausible. No elimina el riesgo: cambia la situación." },
    { id: "salida-preparada", nombre: "Salida preparada", regla: "Una vez por sesión, cuando todo se complica, obtén Ventaja para abandonar la escena." },
    { id: "preparacion-oculta", nombre: "Preparación oculta", regla: "Marca 1 Tensión para declarar una preparación previa concreta y razonable." },
    { id: "manos-firmes", nombre: "Manos firmes", regla: "Una vez por sesión, un 7-9 al mantener control físico bajo presión no puede quitarte el objetivo básico." }
  ],

  /** Secuelas de ejemplo tras una Ruptura. La mesa puede escribir otras. */
  SECUELAS: [
    { nombre: "Hipervigilancia", disparador: "Sentirte observado o seguido." },
    { nombre: "Necesidad de control", disparador: "Alguien cambia el plan sin consultarte." },
    { nombre: "Insomnio", disparador: "Horas de espera, noche avanzada o silencio prolongado." },
    { nombre: "Dolor crónico", disparador: "Esfuerzo físico, frío o mala postura." }
  ],

  /** Umbral de Revelación por tamaño de caso. */
  UMBRALES: {
    breve: { label: "Breve", pistas: 5 },
    estandar: { label: "Estándar", pistas: 6 },
    amplio: { label: "Amplio", pistas: 8 }
  },

  /** Clasificación de Pistas durante la Revelación. */
  CLASIFICACION: {
    "": "RB.Clasificacion.SinClasificar",
    senal: "RB.Clasificacion.Senal",
    ruido: "RB.Clasificacion.Ruido",
    interferencia: "RB.Clasificacion.Interferencia"
  },

  /** Las tres Anclas del Núcleo. Deben ser tarjetas distintas. */
  ANCLAS: {
    "": "RB.Ancla.Ninguna",
    que: "RB.Ancla.Que",
    quien: "RB.Ancla.Quien",
    porque: "RB.Ancla.PorQue"
  },

  /** Lentes de Distorsión para un 7-9. PROPÓSITO solo está disponible sin Control. */
  LENTES: [
    { id: "proposito", nombre: "PROPÓSITO", pregunta: "¿Qué parte del motivo habíais interpretado de forma incompleta?", requiereSinControl: true },
    { id: "metodo", nombre: "MÉTODO", pregunta: "¿Qué parte ocurrió de otra manera?" },
    { id: "secuencia", nombre: "SECUENCIA", pregunta: "¿Qué ocurrió antes o después de lo que creíais?" },
    { id: "complicidad", nombre: "COMPLICIDAD", pregunta: "¿Quién más intervino sin sustituir al responsable principal?" },
    { id: "encubrimiento", nombre: "ENCUBRIMIENTO", pregunta: "¿Quién manipuló posteriormente lo ocurrido y por qué?" },
    { id: "beneficiario", nombre: "BENEFICIARIO", pregunta: "¿Quién aprovechó el incidente sin haberlo provocado?" },
    { id: "consecuencia", nombre: "CONSECUENCIA", pregunta: "¿Qué efecto importante de lo ocurrido todavía no habíais visto?" }
  ],

  /** Efectos del contador compartido de Ruido de Fondo (0-6). */
  RUIDO_FONDO: {
    MAX: 6,
    REACCION: 3,
    REACCION_MAYOR: 6,
    /** Tras una Reacción Mayor el contador vuelve a 3. */
    TRAS_MAYOR: 3
  },

  /** La Prueba de Aporte: funciones que convierten una Pista en Señal. */
  FUNCIONES_SENAL: [
    "relaciona una persona, grupo o fenómeno con el incidente",
    "establece acceso, oportunidad, capacidad, herramienta, método o ventana temporal",
    "sostiene un motivo, objetivo, beneficio o presión relevante",
    "establece una secuencia o una acción necesaria",
    "explica una anomalía concreta que ya estaba sobre la mesa",
    "conecta materialmente dos elementos del caso que antes estaban separados"
  ]
};

/**
 * Afinación según número de Señales. Los mínimos de +2 y +3 se comprueban aparte:
 * +2 exige las tres Anclas; +3 exige además 2 Pistas por encima del Umbral.
 */
export function afinacionPorSenales(senales) {
  if (senales >= 7) return 3;
  if (senales >= 5) return 2;
  if (senales >= 3) return 1;
  return 0;
}

/**
 * Afinación real de una Revelación, aplicando los requisitos de Anclas y Umbral.
 * @param {{senales:number, anclas:string[], pistasTotales:number, umbral:number}} estado
 */
export function calcularAfinacion({ senales, anclas = [], pistasTotales = 0, umbral = 6 }) {
  const base = afinacionPorSenales(senales);
  const anclasDistintas = new Set(anclas.filter(Boolean)).size === 3;
  if (base >= 3 && (!anclasDistintas || pistasTotales < umbral + 2)) {
    return anclasDistintas ? 2 : 1;
  }
  if (base === 2 && !anclasDistintas) return 1;
  return base;
}

/** Resultado de una Acción: 2d6 + Método conservando los dos mejores. */
export function gradoAccion(total) {
  if (total >= 12) return "nitido";
  if (total >= 10) return "limpio";
  if (total >= 7) return "coste";
  return "reves";
}

/**
 * Resultado de una Revelación. La Mordedura degrada cualquier 10+ a 7-9
 * cuando se llega al clímax con 2 o más Interferencias.
 */
export function gradoRevelacion(total, interferencias = 0) {
  if (total >= 10) return interferencias >= 2 ? "distorsionada" : "clara";
  if (total >= 7) return "distorsionada";
  return "falso-positivo";
}

/** Fórmula de dados: 2d6 + un d6 por punto de Método, conservando los dos mejores. */
export function formulaAccion(metodo = 0, { ventaja = false, desventaja = false } = {}) {
  // Ventaja y Desventaja se cancelan entre sí y nunca se acumulan más de una vez.
  const neto = (ventaja ? 1 : 0) - (desventaja ? 1 : 0);
  const dados = 2 + Math.max(0, Number(metodo) || 0) + (neto === 0 ? 0 : 1);
  return neto < 0 ? `${dados}d6dh1kh2` : `${dados}d6kh2`;
}
