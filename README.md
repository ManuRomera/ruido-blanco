# RUIDO BLANCO

<p align="center">
  <a href="https://github.com/ManuRomera/ruido-blanco/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/ManuRomera/ruido-blanco?include_prereleases&style=for-the-badge&color=5a6270&label=release"></a>
  <a href="https://foundryvtt.com"><img alt="Foundry VTT V13" src="https://img.shields.io/badge/Foundry%20VTT-V13-57d8c8?style=for-the-badge"></a>
  <a href="https://github.com/ManuRomera/ruido-blanco/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/ManuRomera/ruido-blanco/total?style=for-the-badge&color=ff7a1f"></a>
  <img alt="Game system" src="https://img.shields.io/badge/type-game%20system-2b3245?style=for-the-badge">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-2b3245?style=for-the-badge"></a>
</p>

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
| **Ficha de investigador** | Los cuatro Métodos con tirada integrada, Profesión, Especialidades, Kit, Talento con contador de usos, Obsesión, Punto Ciego y Vínculo. |
| **Diálogo de Apuesta** | Antes de tirar: el riesgo en una frase, quién Ayuda, qué Condiciones afectan a la Acción, y si Forzáis o si la Apuesta incluye Ruido. |
| **Ayudar** | Concede Ventaja y deja al ayudante expuesto; la tarjeta de chat trae el botón para repartirle el coste. |
| **Tensión y Ruptura** | Pista de 0 a 3. La cuarta marca provoca Ruptura automática: baja a 1 y abre el diálogo de Secuela. |
| **Condiciones y Secuelas** | Las Condiciones aplican Desventaja solas al marcarlas en el diálogo. Cada Secuela tiene un botón de Disparador: marcar 1 Tensión o aceptar la complicación. |
| **Anclas personales** | Una escena significativa borra 1 Tensión, una vez por sesión. Nueva escena y Nueva sesión las devuelven a toda la mesa. |
| **Muro de investigación** | PISTAS e HIPÓTESIS, las dos únicas zonas que existen durante la investigación, con hilo rojo real entre cada hipótesis y las Pistas que dice usar. |
| **Ruido de Fondo** | Contador compartido 0-6 con Reacción en 3 y Reacción Mayor en 6, que avisa en chat y vuelve a 3. |
| **Revelación** | Clasificación arrastrando las Pistas entre cuatro bandejas, Anclas del Núcleo, Afinación con sus requisitos, Mordedura, Control, Lentes de Distorsión y flujo completo de Falso Positivo. |

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
npm run maqueta                 # dev/maqueta.html: las plantillas reales, sin abrir Foundry
python3 scripts/manuscrito.py   # .docx -> REGLAMENTO.md, docs/index.html, _data/manual.json
python3 scripts/contenido.py    # pregenerados, caso y Pistas -> _data/*.json
node scripts/build.mjs          # _data/*.json -> packs/ (cierra Foundry antes)
```

Los packs compilados no se versionan: los genera el workflow al publicar una
etiqueta `vX.Y.Z`, que debe coincidir con la versión de `system.json`.

> **Cuidado si desarrollas dentro de `Data/systems/ruido-blanco`.**
> Instalar o actualizar el sistema desde el manifiesto **borra el directorio y
> lo reemplaza por el contenido del zip**, que no incluye `.git`, `_data/`,
> `scripts/`, `sources/`, `tests/` ni `docs/`. Mientras trabajes en el
> repositorio, no pulses instalar ni actualizar sobre este sistema: haz `git push`
> a menudo, porque el remoto es la única copia que sobrevive.

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
