/**
 * Genera dev/maqueta.html renderizando las plantillas REALES del sistema con
 * datos de ejemplo. Sirve para revisar el estilo sin abrir Foundry y, de paso,
 * detecta plantillas rotas: si no compilan, este script falla.
 */
import fs from "node:fs";
import path from "node:path";
import Handlebars from "../node_modules/handlebars/lib/index.js";

const RAIZ = path.resolve(import.meta.dirname, "..");
const leer = p => fs.readFileSync(path.join(RAIZ, p), "utf8");

// Ayudantes equivalentes a los que Foundry registra.
Handlebars.registerHelper({
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  not: v => !v,
  and() { return Array.prototype.every.call(arguments, Boolean); },
  or() { return Array.prototype.slice.call(arguments, 0, -1).some(Boolean); },
  checked: v => (v ? "checked" : ""),
  disabled: v => (v ? "disabled" : ""),
  selectOptions: (opciones, opts) => new Handlebars.SafeString(
    opciones.map(o => `<option value="${o[opts.hash.valueAttr]}" ${o[opts.hash.valueAttr] === opts.hash.selected ? "selected" : ""}>${o[opts.hash.labelAttr]}</option>`).join("")),
  editor: () => new Handlebars.SafeString('<div class="editor"><p>Notas del investigador.</p></div>')
});

const pinta = (plantilla, datos) => Handlebars.compile(leer(plantilla))(datos);

/* ----------------------------------------------------------- Datos falsos */

const pista = (id, codigo, nombre, texto, extra = {}) => ({
  id, codigo, nombre, texto, giro: ((id.charCodeAt(0) % 7) - 3) * 0.4,
  descubierta: true, lugar: "Seguridad", editable: true, ...extra
});

const contextoMuro = {
  esGM: true,
  caso: { nombre: "Once minutos sin imagen", umbral: 6, umbralLabel: "Estándar",
    pregunta: "¿Qué ocurrió realmente en ORBITA durante los once minutos sin imagen, quién fue responsable de la muerte de Irene Salvat y qué estaba intentando conseguir?" },
  descubiertas: 7, faltan: 0, umbralAlcanzado: true, sobreUmbral: 1,
  seleccionId: "h1", seleccionTexto: "Alguien de dentro preparó la ventana de once minutos",
  ruidoTrack: [0, 1, 2, 3, 4, 5, 6].map(n => ({ n, activo: n <= 3, reaccion: n === 3, mayor: n === 6 })),
  enReaccionMayor: false,
  pistas: [
    pista("p2", "P2", "Once minutos sin imagen",
      "Las cámaras interiores de la planta 17 no grabaron entre 22:08 y 22:19. No fue una caída general: la desconexión fue manual y requería privilegios de mantenimiento.",
      { contexto: "La cuenta usada era de mantenimiento, no personal.", enlazada: true }),
    pista("p5", "P5", "El mensaje de las 21:58",
      "A las 21:58 Irene envió a Tomás: «Sube por servicio. ORBITA 22:10. Si esto sale mal, publica NEREIDA. No uses el resumen».",
      { lugar: "Oficina de Irene", clasificada: true, clasificacion: "senal", marca: "SEÑAL" }),
    pista("p12", "P12", "Sesión administrativa 22:16",
      "A las 22:16 el portátil asignado a Eva inició una sesión administrativa hacia la automatización de planta 17.",
      { lugar: "Finanzas", dura: true, fiabilidad: "El registro identifica el dispositivo y el token, no quién estaba delante del teclado." }),
    pista("p11", "P11", "Pago privado a Leo",
      "Leo recibió un pago privado de una consultora que también aparece en el circuito económico de NEREIDA.",
      { descubierta: false })
  ],
  hipotesis: [
    { id: "h1", giro: 1.2, texto: "Alguien de dentro preparó la ventana de once minutos con antelación.", autor: "Mara", codigos: "P2, P6", seleccionada: true, descartada: false },
    { id: "h2", giro: -1.5, texto: "Tomás la empujó durante una discusión.", autor: "Óscar", descartada: true },
    { id: "h3", giro: 0.6, texto: "El ventanal se abrió después de la muerte, para contar otra historia.", autor: "Iván", codigos: "P9" }
  ]
};

const fichaPista = (id, codigo, texto, extra = {}) => ({
  id, codigo, texto, giro: 0.6, anclas: [
    { id: "que", corto: "QUÉ", activa: false },
    { id: "quien", corto: "QUIÉN", activa: false },
    { id: "porque", corto: "POR QUÉ", activa: false }
  ], ...extra
});

const contextoRevelacion = {
  esGM: true,
  caso: { umbral: 6, nucleo: {
    que: "Irene murió durante una entrega de material interno que alguien interrumpió.",
    quien: "Leo Marín, cubriendo una brecha que él mismo había abierto.",
    porque: "" } },
  senales: { length: 5 }, ruido: { length: 1 }, interferencias: { length: 1 },
  afinacion: 2, control: false, mordedura: false, anclaObligatoria: true,
  bandejas: [
    { id: "", clase: "sin", titulo: "Sin clasificar", nota: "Ninguna Pista puede ignorarse.",
      pistas: [fichaPista("p7", "P7", "Microfracturas y polvo de yeso recientes junto al ventanal.")] },
    { id: "senal", clase: "senal", titulo: "Señal", nota: "Aporta materialmente a la teoría.", pistas: [
      fichaPista("p6", "P6", "La orden LM-3 programó mantenimiento del CCTV a las 22:07, creada con la cuenta de Leo.",
        { esSenal: true, justificacion: "…establece acceso y ventana temporal.",
          anclas: [{ id: "que", corto: "QUÉ", activa: false }, { id: "quien", corto: "QUIÉN", activa: true }, { id: "porque", corto: "POR QUÉ", activa: false }] }),
      fichaPista("p2", "P2", "Las cámaras no grabaron entre 22:08 y 22:19; desconexión manual.",
        { esSenal: true, faltaJustificacion: true,
          anclas: [{ id: "que", corto: "QUÉ", activa: true }, { id: "quien", corto: "QUIÉN", activa: false }, { id: "porque", corto: "POR QUÉ", activa: false }] })
    ] },
    { id: "ruido", clase: "ruido", titulo: "Ruido", nota: "Cerrada por un Puente Causal válido.", pistas: [
      fichaPista("p10", "P10", "Irene había marcado facturas irregulares del proyecto NEREIDA.",
        { justificacion: "…pertenece al fraude de Finanzas, no a la muerte." })] },
    { id: "interferencia", clase: "interferencia", titulo: "Interferencia", nota: "Ocurrió. Todavía no sabéis por qué.", pistas: [
      fichaPista("p8", "P8", "«Prometiste que terminaba aquí». 3,8 segundos de audio sin hablante identificable.")] }
  ],
  requisitos: [
    { texto: "+1 · 3 Señales", cumplido: true },
    { texto: "+2 · 5 Señales y las tres Anclas", cumplido: true },
    { texto: "+3 · 7 Señales, las tres Anclas y 8 Pistas", cumplido: false }
  ],
  bloqueos: ["Falta 1 justificación (Prueba de Aporte).", "Formulad las tres afirmaciones del Núcleo."]
};

const contextoFicha = {
  actor: { name: "Mara Soler", img: "../assets/manual/6.webp" },
  editable: true,
  system: {
    concepto: "Enfermera forense de urgencias.", pronombres: "ella",
    profesion: "Sanitario", kit: "Forense",
    especialidades: { c1: "Medicina forense", c2: "Primeros auxilios" },
    talento: { nombre: "Esto no encaja", regla: "Una vez por escena, tras examinar un lugar, pregunta qué detalle objetivo contradice la explicación más obvia.", usos: 1, usosMax: 2 },
    obsesion: "Que la historia final respete lo que el cuerpo y la escena dicen de verdad.",
    puntoCiego: "Interpreta el autocontrol de otras personas como ocultación demasiado rápido.",
    vinculo: "Óscar la convenció de empezar a trabajar casos de Ruido Blanco.",
    tension: { value: 2, max: 3 }
  },
  repartoValido: true, talentoDisponible: true, enRiesgoDeRuptura: false,
  profesiones: ["Sanitario", "Periodista"], kits: ["Forense", "Digital"],
  talentos: [{ id: "encaja", nombre: "Esto no encaja" }, { id: "salida", nombre: "Salida preparada" }],
  metodos: [
    { clave: "observar", etiqueta: "OBSERVAR", valor: 2, dados: 4 },
    { clave: "razonar", etiqueta: "RAZONAR", valor: 0, dados: 2 },
    { clave: "influir", etiqueta: "INFLUIR", valor: 1, dados: 3 },
    { clave: "intervenir", etiqueta: "INTERVENIR", valor: 1, dados: 3 }
  ],
  tensionCasillas: [{ n: 1, marcada: true }, { n: 2, marcada: true }, { n: 3, marcada: false }],
  usosTalento: [{ n: 1, gastado: true }, { n: 2, gastado: false }],
  condiciones: [{ slot: "c1", texto: "Costillas golpeadas", n: 1 }, { slot: "c2", texto: "Sin credencial", n: 2 }, { slot: "c3", texto: "", n: 3 }],
  secuelas: [{ slot: "s1", nombre: "Hipervigilancia", disparador: "Sentirte observado o seguido." }, { slot: "s2", nombre: "", disparador: "" }],
  anclas: [{ slot: "a1", nombre: "Su hijo Nil", usada: false }, { slot: "a2", nombre: "Correr al amanecer por el puerto", usada: true }],
  notasHTML: ""
};

const contextoChatAccion = {
  actorId: "a1", actor: "Mara Soler", metodo: "OBSERVAR", valor: 2, total: 8,
  apuesta: "Si tiras, Seguridad sabrá que alguien ha revisado los registros.",
  ventaja: true, desventaja: false, formula: "5d6kh2", gradoId: "coste",
  grado: { titulo: "Con coste", efecto: "Consigues lo esencial y el GM cobra una consecuencia coherente con la Apuesta." },
  ayudante: { id: "a2", nombre: "Iván Costa" }, condiciones: [], esNitido: false,
  dados: [{ result: 5, active: true }, { result: 3, active: true }, { result: 1, active: false }, { result: 2, active: false }, { result: 1, active: false }]
};

const contextoChatRevelacion = {
  caso: contextoRevelacion.caso, total: 8, afinacion: 2, grado: "distorsionada",
  degradado: false, control: false, mordedura: false,
  senales: 5, ruido: 1, interferencias: 1,
  donde: "Confrontación privada en el garaje", riesgo: "La fuente de Tomás y vuestro acceso al edificio",
  anclaDistorsion: { codigo: "P8", texto: "«Prometiste que terminaba aquí»." }, anclaEsInterferencia: true,
  lentes: [{ id: "metodo", nombre: "MÉTODO" }, { id: "complicidad", nombre: "COMPLICIDAD" }, { id: "encubrimiento", nombre: "ENCUBRIMIENTO" }],
  esDistorsionada: true
};

/* ------------------------------------------------------------- Montaje */

const seccion = (titulo, html, clase = "") =>
  `<p class="nota-dev">${titulo}</p><div class="ventana ruido-blanco ${clase}">
     <header class="window-header"><span class="window-title">${titulo}</span></header>
     <div class="window-content">${html}</div></div>`;

const salida = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>RUIDO BLANCO · maqueta de estilo</title>
<link rel="stylesheet" href="../styles/ruido-blanco.css">
<style>
  body{margin:0;background:#05090c;font-family:"Spectral",serif}
  .lienzo{max-width:1220px;margin:0 auto;padding:18px}
  .ventana{border:1px solid #2a3138;margin-bottom:26px;box-shadow:0 20px 60px rgba(0,0,0,.8)}
  .window-header{display:flex;align-items:center;padding:.35rem .7rem}
  .window-content{height:800px;display:flex;flex-direction:column}
  .window-content>form,.window-content>div{flex:1;min-height:0;display:flex;flex-direction:column}
  .nota-dev{font-family:"Special Elite",monospace;font-size:.62rem;letter-spacing:.2em;color:#c89a5e;text-transform:uppercase;padding:6px 0}
  .chats{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:26px}
</style></head>
<body class="ruido-blanco">
<svg class="rb-filtros" aria-hidden="true">
  <filter id="rb-rasgado">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.055" numOctaves="4" seed="7" result="ruido"/>
    <feDisplacementMap in="SourceGraphic" in2="ruido" scale="11" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
<div class="lienzo">
${seccion("01 · Ficha de investigador", pinta("templates/actors/investigador.hbs", contextoFicha))}
${seccion("02 · Muro de investigación", pinta("templates/apps/muro.hbs", contextoMuro))}
${seccion("03 · La Revelación", pinta("templates/apps/revelacion.hbs", contextoRevelacion))}
<p class="nota-dev">04 · Tarjetas de chat</p>
<div class="chats">
  ${pinta("templates/chat/accion.hbs", contextoChatAccion)}
  ${pinta("templates/chat/revelacion.hbs", contextoChatRevelacion)}
</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/js/all.min.js"></script>
<script>
  // La primera pestaña visible, como haría Foundry.
  document.querySelectorAll(".rb-tabs").forEach(nav => {
    nav.querySelector(".item").classList.add("active");
    const cuerpo = nav.parentElement.querySelector(".rb-sheet-body");
    cuerpo.querySelectorAll(".tab").forEach((t, i) => { t.style.display = i ? "none" : ""; });
    nav.querySelectorAll(".item").forEach((a, i) => a.addEventListener("click", () => {
      nav.querySelectorAll(".item").forEach(x => x.classList.remove("active"));
      a.classList.add("active");
      cuerpo.querySelectorAll(".tab").forEach((t, j) => { t.style.display = i === j ? "" : "none"; });
    }));
  });
</script>
</body></html>`;

fs.writeFileSync(path.join(RAIZ, "dev/maqueta.html"), salida);
console.log("dev/maqueta.html generada desde las plantillas reales");
