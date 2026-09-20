/** Las reglas que sí pueden romperse: Afinación, grados y fórmula de dados. */
import test from "node:test";
import assert from "node:assert/strict";
import { calcularAfinacion, gradoAccion, gradoRevelacion, formulaAccion, afinacionPorSenales } from "../module/config.mjs";

const TRES_ANCLAS = ["a", "b", "c"];

test("la tabla base de Afinación sigue al manual", () => {
  assert.equal(afinacionPorSenales(0), 0);
  assert.equal(afinacionPorSenales(2), 0);
  assert.equal(afinacionPorSenales(3), 1);
  assert.equal(afinacionPorSenales(4), 1);
  assert.equal(afinacionPorSenales(5), 2);
  assert.equal(afinacionPorSenales(6), 2);
  assert.equal(afinacionPorSenales(7), 3);
});

test("+2 y +3 exigen tres Anclas distintas", () => {
  const base = { pistasTotales: 10, umbral: 6 };
  assert.equal(calcularAfinacion({ ...base, senales: 5, anclas: TRES_ANCLAS }), 2);
  assert.equal(calcularAfinacion({ ...base, senales: 5, anclas: ["a", "b", ""] }), 1);
  // Tres Anclas apuntando a la misma tarjeta no son tres Anclas distintas.
  assert.equal(calcularAfinacion({ ...base, senales: 5, anclas: ["a", "a", "a"] }), 1);
});

test("+3 exige además dos Pistas por encima del Umbral", () => {
  assert.equal(calcularAfinacion({ senales: 7, anclas: TRES_ANCLAS, pistasTotales: 8, umbral: 6 }), 3);
  assert.equal(calcularAfinacion({ senales: 7, anclas: TRES_ANCLAS, pistasTotales: 7, umbral: 6 }), 2);
  assert.equal(calcularAfinacion({ senales: 7, anclas: ["a", "b", ""], pistasTotales: 9, umbral: 6 }), 1);
});

test("los grados de Acción cortan donde dice la tabla", () => {
  assert.equal(gradoAccion(12), "nitido");
  assert.equal(gradoAccion(11), "limpio");
  assert.equal(gradoAccion(10), "limpio");
  assert.equal(gradoAccion(9), "coste");
  assert.equal(gradoAccion(7), "coste");
  assert.equal(gradoAccion(6), "reves");
  assert.equal(gradoAccion(2), "reves");
});

test("la Mordedura degrada un 10+ solo con 2 o más Interferencias", () => {
  assert.equal(gradoRevelacion(11, 0), "clara");
  assert.equal(gradoRevelacion(11, 1), "clara");
  assert.equal(gradoRevelacion(11, 2), "distorsionada");
  assert.equal(gradoRevelacion(8, 0), "distorsionada");
  assert.equal(gradoRevelacion(6, 5), "falso-positivo");
});

test("la fórmula añade un d6 por Método y conserva los dos mejores", () => {
  assert.equal(formulaAccion(0), "2d6kh2");
  assert.equal(formulaAccion(2), "4d6kh2");
  assert.equal(formulaAccion(1, { ventaja: true }), "4d6kh2");
  // Desventaja: añade 1d6, elimina el más alto y conserva los dos mejores restantes.
  assert.equal(formulaAccion(1, { desventaja: true }), "4d6dh1kh2");
  // Ventaja y Desventaja se cancelan y nunca se acumulan más de una vez.
  assert.equal(formulaAccion(1, { ventaja: true, desventaja: true }), "3d6kh2");
});
