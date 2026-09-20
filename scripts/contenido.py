"""Genera los _data/*.json de contenido. Los ids se rellenan a 16 caracteres."""
import json, pathlib, sys

RAIZ = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent

def idf(s):
    return (s + "0" * 16)[:16]

def investigador(clave, nombre, concepto, profesion, metodos, esp, kit, talento, obsesion, ciego, anclas, vinculo):
    o, r, i, v = metodos
    return {
        "_id": idf(clave), "name": nombre, "type": "investigador",
        "img": "icons/svg/mystery-man.svg",
        "system": {
            "concepto": concepto, "pronombres": "", "profesion": profesion,
            "metodos": {"observar": o, "razonar": r, "influir": i, "intervenir": v},
            "especialidades": {"c1": esp[0], "c2": esp[1]},
            "kit": kit,
            "talento": {"nombre": talento[0], "regla": talento[1]},
            "obsesion": obsesion, "puntoCiego": ciego,
            "anclas": {"a1": {"nombre": anclas[0], "usada": False},
                       "a2": {"nombre": anclas[1], "usada": False}},
            "vinculo": vinculo,
            "tension": {"value": 0, "max": 3},
            "condiciones": {"c1": "", "c2": "", "c3": ""},
            "secuelas": {"s1": {"nombre": "", "disparador": ""}, "s2": {"nombre": "", "disparador": ""}},
            "notas": ""
        }
    }

T = {
    "lectura": ("Lectura del sistema", "Una vez por escena institucional, pregunta quién puede darte realmente lo que buscas y qué quiere evitar."),
    "preparacion": ("Preparación oculta", "Marca 1 Tensión para declarar una preparación previa concreta y razonable."),
    "encaja": ("Esto no encaja", "Una vez por escena, tras examinar un lugar, pregunta qué detalle objetivo contradice la explicación más obvia."),
    "salida": ("Salida preparada", "Una vez por sesión, cuando todo se complica, obtén Ventaja para abandonar la escena."),
}

pregenerados = [
    investigador("RBPregAlex", "Alex Pardo",
        "Abogada de cumplimiento y litigación interna.", "Abogada / cumplimiento",
        (1, 1, 2, 0), ("Derecho", "Finanzas"), "Legal", T["lectura"],
        "Obligar a una institución a reconocer la evidencia que intenta administrar.",
        "Cree que todo problema tiene una vía procesal si se encuentra el documento correcto.",
        ("Su hermana Júlia", "Su reputación profesional fuera de los casos de Ruido Blanco"),
        "Iván siempre encuentra el dato que Alex necesita convertir en argumento."),
    investigador("RBPregIvan", "Iván Costa",
        "Analista de respuesta a incidentes.", "Analista / auditor",
        (1, 2, 0, 1), ("Ciberseguridad", "Análisis de datos"), "Digital", T["preparacion"],
        "Demostrar que los sistemas dejan huellas incluso cuando las personas no.",
        "Sobrevalora los registros técnicos y sospecha demasiado de los testimonios emocionales.",
        ("Cocinar para su padre los domingos", "El taller comunitario donde repara equipos viejos"),
        "Mara le recuerda que detrás de cada log hay un cuerpo o una persona."),
    investigador("RBPregMara", "Mara Soler",
        "Enfermera forense de urgencias.", "Sanitario",
        (2, 0, 1, 1), ("Medicina forense", "Primeros auxilios"), "Forense", T["encaja"],
        "Que la historia final respete lo que el cuerpo y la escena dicen de verdad.",
        "Interpreta el autocontrol de otras personas como ocultación demasiado rápido.",
        ("Su hijo Nil", "Correr al amanecer por el puerto"),
        "Óscar la convenció de empezar a trabajar casos de Ruido Blanco y todavía no sabe si agradecérselo."),
    investigador("RBPregOscar", "Óscar Rius",
        "Investigador privado; antiguo seguridad corporativa.", "Investigador privado",
        (1, 0, 1, 2), ("Vigilancia", "Seguridad"), "Vigilancia", T["salida"],
        "Descubrir qué hace una institución cuando cree que nadie la está mirando.",
        "Asume que quien protege una organización protegerá antes la organización que la verdad.",
        ("Su hija adulta Laia", "Un gimnasio de barrio donde nadie le pregunta por su trabajo"),
        "Alex le ha sacado de más de un problema legal del que piensa admitir."),
]

PISTAS = [
    ("P1", "Informe preliminar", "El informe preliminar sitúa la muerte entre las 22:15 y las 22:35 por un traumatismo grave. El mecanismo exacto no está claro.", "ORBITA", "El mecanismo exacto no está determinado."),
    ("P2", "Once minutos sin imagen", "Las cámaras interiores de la planta 17 no grabaron entre 22:08 y 22:19. No fue una caída general: la desconexión fue manual y requería privilegios de mantenimiento.", "Seguridad", ""),
    ("P3", "Credencial S-14", "A las 22:13 una credencial S-14 abrió ORBITA. Está asignada a Sara, pero el manual de Seguridad permite crear clones temporales de contingencia.", "Seguridad", "El registro identifica la credencial, no a quien la portaba."),
    ("P4", "Copia de NEREIDA", "A las 22:05 el paquete de archivos llamado NEREIDA fue copiado desde el equipo de Irene a un soporte externo.", "Oficina de Irene", ""),
    ("P5", "El mensaje de las 21:58", "A las 21:58 Irene envió a Tomás: «Sube por servicio. ORBITA 22:10. Si esto sale mal, publica NEREIDA. No uses el resumen».", "Oficina de Irene", ""),
    ("P6", "Orden LM-3", "La orden LM-3 programó mantenimiento del CCTV de planta 17 a las 22:07. La orden fue creada con la cuenta de Leo.", "Seguridad", "Identifica la cuenta, no necesariamente a la persona."),
    ("P7", "Microfracturas y yeso", "Junto al ventanal y la mesa hay microfracturas y polvo de yeso recientes. El patrón es compatible tanto con un forcejeo como con una preparación o escenificación.", "ORBITA", "Compatible con más de una lectura física."),
    ("P8", "3,8 segundos de audio", "Se recuperan 3,8 segundos de audio de ORBITA. Una voz dice: «prometiste que terminaba aquí». La grabación no permite identificar con fiabilidad a quien habla.", "ORBITA", "No permite identificar con fiabilidad a la persona que habla."),
    ("P9", "Apertura del ventanal", "A las 22:24 el ventanal inteligente de ORBITA recibió una orden local de apertura mediante una cuenta administrativa.", "ORBITA", ""),
    ("P10", "Facturas marcadas", "Irene había marcado como irregulares varias facturas del proyecto NEREIDA vinculadas a un proveedor aprobado desde Finanzas.", "Finanzas", ""),
    ("P11", "Pago privado a Leo", "Leo recibió un pago privado de una consultora que también aparece en el circuito económico de NEREIDA.", "Finanzas", ""),
    ("P12", "Sesión administrativa a las 22:16", "A las 22:16 el portátil asignado a Eva inició una sesión administrativa hacia la automatización de planta 17. El registro identifica el dispositivo y el token, no quién estaba físicamente delante del teclado.", "Finanzas", "El registro identifica el dispositivo y el token, no a la persona."),
]

pistas = [{
    "_id": idf(f"RBPista{codigo}"), "name": nombre, "type": "pista", "img": "icons/svg/eye.svg",
    "sort": (i + 1) * 100000,
    "system": {"codigo": codigo, "texto": texto, "contexto": "", "fiabilidad": fiab,
               "lugar": lugar, "dura": False, "descubierta": False,
               "clasificacion": "", "justificacion": "", "ancla": ""}
} for i, (codigo, nombre, texto, lugar, fiab) in enumerate(PISTAS)]

PERSONAS = [
    ("RBPnjSara", "Sara Beltrán", "Cofundadora y expareja de Irene",
     "Mantener el control de NEREIDA y su vida privada fuera del escándalo.",
     "Irene le pidió material interno fuera de protocolo.",
     "Coopera hasta que la relación personal entra en juego; después llama a abogados."),
    ("RBPnjLeo", "Leo Marín", "Responsable de Seguridad",
     "Demostrar que la brecha no fue negligencia suya.",
     "Hizo cambios de mantenimiento mal documentados.",
     "Bajo presión explica demasiado y empieza a «ordenar» registros ambiguos."),
    ("RBPnjEva", "Eva Montal", "Finanzas",
     "Salvar una ronda de financiación.",
     "Autorizó pagos irregulares vinculados a NEREIDA y usa administración remota.",
     "Intenta encuadrarlo todo como problema de Seguridad."),
    ("RBPnjTomas", "Tomás Vidal", "Periodista",
     "Publicar NEREIDA y proteger a su fuente.",
     "Entró en el edificio y ocultó el motivo real.",
     "Niega su presencia hasta que los registros la hacen insostenible."),
]

personas = [{
    "_id": idf(clave), "name": nombre, "type": "pnj", "img": "icons/svg/cowled.svg",
    "system": {"rol": rol, "quiere": quiere, "oculta": oculta, "bajoPresion": presion, "notas": ""}
} for clave, nombre, rol, quiere, oculta, presion in PERSONAS]

CASO_HTML = """
<p class="rb-lead">Thriller corporativo contemporáneo. Una sesión larga o dos cortas. No existe solución oficial.</p>
<h3>Pregunta Central</h3>
<p>¿Qué ocurrió realmente en ORBITA durante los once minutos sin imagen, quién fue responsable de la muerte de Irene Salvat y qué estaba intentando conseguir?</p>
<h3>Apertura para leer</h3>
<aside class="rb-caja"><h5>02:17</h5>
<p>NEREIDA Labs sigue iluminada como si todavía fueran las diez. En la planta 17, la sala ORBITA está acordonada. Irene Salvat, directora técnica, yace junto a la mesa de demostraciones. Las cámaras interiores dejaron de grabar durante once minutos. Una credencial de contingencia abrió la puerta durante ese vacío. Nadie admite saber por qué Irene seguía allí.</p></aside>
<h3>Localizaciones</h3>
<p>ORBITA · Centro de Seguridad · Oficina de Irene · Finanzas · Garaje y entorno · Ascensores y planta 17.</p>
<p>Deja que la mesa elija el orden. Si encuentran otra vía razonable —un proveedor, una copia personal, un contacto, una cámara municipal—, mueve la Pista al lugar donde tenga sentido.</p>
<h3>Dónde pueden aparecer las Pistas</h3>
<table><thead><tr><th>Lugar</th><th>Pistas naturales / profundidad</th></tr></thead><tbody>
<tr><td>ORBITA</td><td>P1. También permite descubrir P7, P8 o P9 mediante examen físico o técnico.</td></tr>
<tr><td>Seguridad</td><td>P2, P3 y P6. Acciones arriesgadas pueden revelar procedimientos, copias y cambios recientes.</td></tr>
<tr><td>Oficina de Irene</td><td>P4, P5 y documentación relacionada con P10.</td></tr>
<tr><td>Finanzas</td><td>P10, P11 y contexto contractual. P12 puede aparecer al cruzar telemetría con administración remota.</td></tr>
<tr><td>Entrevistas</td><td>Las personas pueden contextualizar cualquier Pista, pero sus interpretaciones no se convierten automáticamente en hechos.</td></tr>
</tbody></table>
"""

REACCIONES_HTML = """
<p class="rb-lead">Una Reacción cambia la situación. Puede crear una oportunidad de información, pero nunca regala una Pista.</p>
<ul>
<li>Legal centraliza las entrevistas. A partir de ahora acceder a empleados requiere autorización. Una asistente que ha visto el movimiento documental puede convertirse en una oportunidad si el grupo decide arriesgarse a contactarla.</li>
<li>Se filtra a prensa que el equipo está tratando una muerte accidental como homicidio. La presión pública obliga a decidir entre mantener perfil bajo o utilizar la exposición para forzar a alguien a posicionarse.</li>
<li>Un proveedor anuncia un borrado rutinario de telemetría. Los investigadores tienen una ventana limitada para preservar ciertos sistemas; no saben todavía cuáles contienen algo útil.</li>
<li>Una persona de interés empieza a ordenar o mover documentación para proteger una irregularidad secundaria. El grupo puede seguir el movimiento, confrontarla o aprovechar el descuido que genera.</li>
</ul>
<h3>Reacciones Mayores</h3>
<ul>
<li>Dirección retira las credenciales temporales del equipo y entrega parte del expediente a un despacho externo. El grupo pierde accesos cómodos y deberá trabajar mediante contactos, vías laterales o información ya preservada.</li>
<li>Alguien abandona el edificio con material físico relacionado con NEREIDA. El grupo sabe quién se mueve y puede decidir perseguirlo, interceptarlo o priorizar otra vía; no recibe automáticamente una nueva Pista.</li>
</ul>
<h3>Distorsiones: usa Lentes, no soluciones preparadas</h3>
<p>No existe una lista de giros verdaderos. Si aparece un 7-9, utiliza la Interferencia disponible como Ancla y aplica una Lente. P11 puede convertirse en Encubrimiento o Beneficiario; P3 puede producir Complicidad; P7 puede alterar Método o Secuencia; P8 puede introducir otra relación; P12 puede cambiar Método sin decidir previamente quién estaba al teclado.</p>
<aside class="rb-caja"><h5>Recordatorio para el GM</h5>
<p>No escribas culpable, método verdadero, motivo verdadero ni cronología causal completa. Si la mesa no puede construir al menos dos historias radicalmente distintas sin contradecir el texto literal de estas tarjetas, has escrito una solución secreta por accidente.</p></aside>
"""

caso = {"documents": [{
    "_id": idf("RBCasoOnce"),
    "name": "Once minutos sin imagen — hoja del caso",
    "ownership": {"default": -1},
    "pages": [
        {"_id": idf("RBCasoPag1"), "name": "El caso", "type": "text",
         "title": {"show": True, "level": 1}, "sort": 100000,
         "text": {"format": 1, "content": CASO_HTML}, "ownership": {"default": -1}},
        {"_id": idf("RBCasoPag2"), "name": "Reacciones y Distorsiones", "type": "text",
         "title": {"show": True, "level": 1}, "sort": 200000,
         "text": {"format": 1, "content": REACCIONES_HTML}, "ownership": {"default": -1}},
    ]
}]}

destinos = {
    "pregenerados.json": {"documents": pregenerados},
    "caso-pistas.json": {"documents": pistas},
    "caso-personas.json": {"documents": personas},
    "caso.json": caso,
}
for nombre, datos in destinos.items():
    (RAIZ / "_data" / nombre).write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n")
    print(nombre, "->", len(datos["documents"]), "documentos")
