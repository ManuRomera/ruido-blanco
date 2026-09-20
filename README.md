# RUIDO BLANCO

**Juego de rol de investigación contemporánea emergente.**
Sistema para Foundry VTT y reglamento completo.

> **LAS PISTAS SON REALES. SU SIGNIFICADO INTERPRETABLE.**

El GM prepara un incidente, personas, lugares, presiones y Pistas concretas.
No prepara quién fue, por qué ocurrió ni una cronología causal secreta que los
jugadores deban adivinar. La mesa investiga, formula hipótesis y, cuando está
dispuesta a comprometerse con una explicación, realiza una **Revelación**: la
tirada no comprueba si han acertado la solución del GM, sino cuánto de esa
interpretación se convierte en verdad.

📖 **[Leer el reglamento](REGLAMENTO.md)** · 🌐 **[Manual en web](https://manuromera.github.io/ruido-blanco/)**

---

## Instalar en Foundry VTT

En *Configuración → Sistemas de juego → Instalar sistema*, pega este manifiesto:

```
https://github.com/ManuRomera/ruido-blanco/releases/latest/download/system.json
```

Requiere Foundry VTT v13 o superior.

## Qué trae el sistema

| | |
|---|---|
| **Ficha de investigador** | Los cuatro Métodos con tirada integrada, Profesión, Especialidades, Kit, Talento, Obsesión, Punto Ciego y Vínculo. |
| **Tensión y Ruptura** | Pista de Tensión 0-3. Marcar una cuarta provoca Ruptura automática: baja a 1 y abre el diálogo para escribir la Secuela. |
| **Anclas personales** | Una escena significativa con un Ancla borra 1 Tensión, una vez por sesión. Un botón devuelve las Anclas al empezar sesión. |
| **Muro de investigación** | Las dos únicas zonas que existen durante la investigación: PISTAS (hechos) e HIPÓTESIS (frases tachables de la mesa). |
| **Ruido de Fondo** | Contador compartido 0-6 con aviso automático de Reacción (3) y Reacción Mayor (6), que devuelve el contador a 3. |
| **Motor de Revelación** | Núcleo QUÉ/QUIÉN/POR QUÉ, clasificación obligatoria de todas las Pistas, Afinación con sus requisitos, Mordedura, Control y Lentes de Distorsión. |

### Compendios incluidos

- **Manual del investigador** — los quince capítulos, generados desde el manuscrito.
- **Investigadores pregenerados** — Alex Pardo, Iván Costa, Mara Soler y Óscar Rius.
- **Once minutos sin imagen** — el caso de playtest: hoja del caso, doce Pistas
  listas para el Muro y cuatro personas de interés. Sin solución oficial.

## Las tiradas

**Acción.** `2d6` más un `d6` por cada punto de Método; conserva los dos mejores.

| Total | Resultado |
|---|---|
| 12 | Nítido |
| 10-11 | Limpio |
| 7-9 | Con coste |
| 2-6 | Revés |

Ventaja añade 1d6 y conserva los dos mejores. Desventaja añade 1d6, elimina el
más alto y conserva los dos mejores restantes.

**Revelación.** `2d6 + Afinación`. 10+ Señal Clara, 7-9 Señal Distorsionada,
6- Falso Positivo. Con dos o más Interferencias, la Mordedura degrada cualquier
10+ a 7-9. Con Afinación +3, Control protege QUÉ, QUIÉN y POR QUÉ.

## Desarrollo

El manuscrito en `sources/` es la única fuente del reglamento: `REGLAMENTO.md`,
la web de `docs/` y el compendio del manual se generan desde él.

```bash
npm install
npm test                        # las reglas: Afinación, grados y fórmulas
python3 scripts/manuscrito.py   # .docx -> REGLAMENTO.md, docs/index.html, _data/manual.json
python3 scripts/contenido.py    # pregenerados, caso y Pistas -> _data/*.json
node scripts/build.mjs          # _data/*.json -> packs/ (cierra Foundry antes)
```

Los packs compilados no se versionan: los genera el workflow al publicar una
etiqueta `vX.Y.Z`, que debe coincidir con la versión de `system.json`.

## Estado

Edición de blind playtest (v0.5.5). Progresión de campaña, subsistema de
Organización, economía entre casos y módulo sobrenatural quedan deliberadamente
fuera hasta que el motor central haya sido probado por mesas externas. El
capítulo 15 del reglamento explica qué datos interesa registrar.

## Licencia

Código bajo [MIT](LICENSE). El texto del reglamento y las ilustraciones son
© 2026 Manu Romera, todos los derechos reservados.

RUIDO BLANCO reconoce la influencia de los juegos de investigación emergente de
la familia *Carved from Brindlewood*, del principio de no bloquear información
esencial asociado a *GUMSHOE*, y de los juegos contemporáneos que convierten la
presión institucional y personal en consecuencias de ficción.
