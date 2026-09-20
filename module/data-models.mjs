/** Modelos de datos de RUIDO BLANCO (Foundry v13, sin template.json). */
import { RB } from "./config.mjs";

const fields = foundry.data.fields;
const str = (initial = "") => new fields.StringField({ required: true, blank: true, initial });
const bool = (initial = false) => new fields.BooleanField({ required: true, initial });

/** Casillas con nombre en vez de arrays: Foundry no acepta updates por índice. */
function slotsTexto(n) {
  const out = {};
  for (let i = 1; i <= n; i++) out[`c${i}`] = str();
  return new fields.SchemaField(out);
}

export class InvestigadorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const metodo = () => new fields.NumberField({
      required: true, integer: true, min: 0, max: 3, initial: 0
    });
    return {
      concepto: str(),
      pronombres: str(),
      profesion: str(),
      metodos: new fields.SchemaField({
        observar: metodo(),
        razonar: metodo(),
        influir: metodo(),
        intervenir: metodo()
      }),
      especialidades: new fields.SchemaField({ c1: str(), c2: str() }),
      kit: str(),
      talento: new fields.SchemaField({ nombre: str(), regla: str() }),
      obsesion: str(),
      puntoCiego: str(),
      anclas: new fields.SchemaField({
        a1: new fields.SchemaField({ nombre: str(), usada: bool() }),
        a2: new fields.SchemaField({ nombre: str(), usada: bool() })
      }),
      vinculo: str(),
      tension: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, max: 3, initial: 0 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 3 })
      }),
      condiciones: slotsTexto(3),
      secuelas: new fields.SchemaField({
        s1: new fields.SchemaField({ nombre: str(), disparador: str() }),
        s2: new fields.SchemaField({ nombre: str(), disparador: str() })
      }),
      notas: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }

  /** Datos derivados que la ficha y las tiradas consultan sin recalcularlos. */
  prepareDerivedData() {
    const m = this.metodos;
    this.repartoValido = [m.observar, m.razonar, m.influir, m.intervenir]
      .slice().sort((a, b) => b - a)
      .every((v, i) => v === RB.REPARTO_METODOS[i]);
    this.condicionesActivas = Object.values(this.condiciones).filter(Boolean);
    this.secuelasActivas = Object.values(this.secuelas).filter(s => s.nombre);
    this.anclasDisponibles = Object.values(this.anclas).filter(a => a.nombre && !a.usada).length;
  }
}

export class PnjData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rol: str(),
      quiere: str(),
      oculta: str(),
      bajoPresion: str(),
      notas: new fields.HTMLField({ required: true, blank: true, initial: "" })
    };
  }
}

export class PistaData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      codigo: str(),
      /** El hecho, sin su explicación. */
      texto: str(),
      /** Contexto añadido al Profundizar: procedencia, cronología, relación, límite técnico. */
      contexto: str(),
      /** Limitaciones de la fuente escritas en la propia tarjeta. */
      fiabilidad: str(),
      lugar: str(),
      /** Una Pista Dura nace de un Falso Positivo y no puede volver a ser Ruido sin información nueva. */
      dura: bool(),
      /** Solo las Pistas descubiertas cuentan para el Umbral y la clasificación. */
      descubierta: bool(),
      clasificacion: new fields.StringField({
        required: true, blank: true, initial: "",
        choices: Object.keys(RB.CLASIFICACION)
      }),
      /** Prueba de Aporte si es Señal; Puente Causal si es Ruido. */
      justificacion: str(),
      ancla: new fields.StringField({
        required: true, blank: true, initial: "",
        choices: Object.keys(RB.ANCLAS)
      })
    };
  }
}

export class HipotesisData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      texto: str(),
      /** Las Hipótesis se tachan libremente: no son hechos. */
      descartada: bool(),
      autor: str()
    };
  }
}
