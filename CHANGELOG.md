# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.6.0] — 2026-09-20

Reescritura de la interfaz y de la automatización. La v0.5.5 tenía el motor de
reglas correcto pero una presentación genérica y demasiado trabajo manual.

### Identidad visual

- Paleta y tipografía tomadas del manual maquetado: negro cálido, papel sepia,
  rojo óxido del hilo y las chinchetas, ámbar de lámpara.
- Papel con bordes rasgados mediante filtro SVG, grano, chinchetas y tarjetas
  ligeramente torcidas, con un giro estable por documento.
- `dev/maqueta.html` se genera con `npm run maqueta` renderizando las plantillas
  reales: permite revisar el estilo sin abrir Foundry y detecta plantillas rotas.

### Muro de investigación

- Hilo rojo real: cada Hipótesis se une a las Pistas que dice usar, dibujado en
  SVG y recalculado al desplazar las columnas.
- Enlaces por arrastre de la tarjeta sobre la nota, o seleccionando la Hipótesis
  y pulsando el hilo de la Pista.
- Alta de Pistas en un solo diálogo con código, lugar, hecho y fiabilidad.
- Profundizar añade contexto a la tarjeta sin crear una Pista nueva.
- Botones de Nueva escena y Nueva sesión, que devuelven Talentos y Anclas.
- Aviso automático en chat la primera vez que se alcanza el Umbral.

### Revelación

- Clasificación arrastrando las Pistas entre cuatro bandejas en vez de marcar
  casillas; las Anclas del Núcleo se eligen con un botón por afirmación y se
  liberan solas al reasignarlas.
- El Núcleo lo escribe la mesa, no solo quien dirige: los cambios de los
  jugadores llegan al GM por socket.
- Diálogo de Apuesta antes de tirar: dónde Reveláis y qué ponéis en riesgo.
- Las Lentes de Distorsión se aplican desde la propia tarjeta de chat.
- Tras un Falso Positivo, botón para crear la Pista Dura y para elegir entre
  Retirada y Seguir la Grieta.

### Automatización

- **Ayudar**: el diálogo de Acción lista a los demás investigadores; ayudar
  concede Ventaja y deja al ayudante expuesto, con botón en el chat para
  repartirle el coste.
- **Condiciones**: se marcan en el diálogo y aplican Desventaja solas.
- **Talentos**: contador de usos con botón de gasto y reinicio por escena.
- **Secuelas**: botón de Disparador que ofrece marcar 1 Tensión o aceptar la
  complicación.
- Botones en las tarjetas de chat para subir o bajar Ruido de Fondo, marcar una
  Condición y Encajar.

### Corregido

- Escribir una justificación en la Revelación robaba el foco en cada tecla:
  los campos se guardan al salir de ellos, no al teclear.
- La chincheta pisaba el fondo de papel y las tarjetas del Muro salían
  transparentes.
- El selector de Talento enviaba un campo inexistente al Actor en cada cambio.

## [0.5.5] — 2026-09-20

Primera versión publicada. Corresponde al manuscrito consolidado v0.5.5,
edición de blind playtest.

### Añadido

- **Ficha de investigador**: cuatro Métodos con tirada integrada, Profesión,
  Especialidades, Kit, Talento, Obsesión, Punto Ciego, Vínculo, Tensión 0-3
  con Ruptura automática, tres Condiciones, dos Secuelas y dos Anclas
  personales que borran 1 Tensión una vez por sesión.
- **Motor de Acción**: `2d6 + 1d6 por Método`, conserva los dos mejores.
  Diálogo de Apuesta antes de tirar, Ventaja/Desventaja, Forzar, y tarjeta de
  chat con el grado (Nítido, Limpio, Con coste, Revés).
- **Muro de investigación**: zonas PISTAS e HIPÓTESIS, tarjetas de Pista con
  contexto y fiabilidad, notas tachables y contador compartido de Ruido de
  Fondo 0-6 con avisos de Reacción (3) y Reacción Mayor (6).
- **Motor de Revelación**: Núcleo QUÉ / QUIÉN / POR QUÉ, clasificación
  obligatoria de todas las Pistas en Señal / Ruido / Interferencia con
  justificación, Anclas del Núcleo, cálculo de Afinación con sus requisitos,
  Mordedura, Control y tirada `2d6 + Afinación` con Lentes de Distorsión.
- **Compendios**: manual completo, los cuatro investigadores pregenerados y el
  caso de playtest «Once minutos sin imagen» con sus doce Pistas y sus cuatro
  personas de interés.
- **Reglamento** en `REGLAMENTO.md` y web en GitHub Pages, ambos generados
  desde el manuscrito original.

### Deliberadamente fuera de esta edición

Progresión de campaña, subsistema de Organización, economía entre casos y
módulo sobrenatural. El motor central se prueba primero.
