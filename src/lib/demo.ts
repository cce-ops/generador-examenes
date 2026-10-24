import type { Exam } from "./types";

export const DEMO_EXAM: Exam = {
  title: "Examen de ejemplo - Resistencia de Materiales",
  subject: "Resistencia de Materiales",
  totalPoints: 20,
  sections: [
    {
      type: "multiple_choice",
      points: 4,
      questions: [
        {
          id: "mc1",
          statement: "La ley de Hooke relaciona:",
          options: [
            { id: "a", text: "Tensión y deformación unitaria" },
            { id: "b", text: "Fuerza y área" },
            { id: "c", text: "Masa y volumen" },
            { id: "d", text: "Tiempo y velocidad" },
          ],
          correctOptionId: "a",
          explanation: "σ = E·ε",
          points: 2,
        },
        {
          id: "mc2",
          statement: "El módulo de Young tiene unidades de:",
          options: [
            { id: "a", text: "N/m² (Pa)" },
            { id: "b", text: "m" },
            { id: "c", text: "kg" },
            { id: "d", text: "s" },
          ],
          correctOptionId: "a",
          explanation: "Es un módulo elástico, presión.",
          points: 2,
        },
      ],
    },
    {
      type: "open_reasoning",
      points: 5,
      questions: [
        {
          id: "or1",
          statement: "Explica la diferencia entre tensión normal y tensión cortante.",
          rubric: ["Define tensión normal", "Define tensión cortante", "Indica planos de actuación", "Menciona unidades"],
          modelAnswer: "La tensión normal actúa perpendicular al plano (σ), la cortante paralela (τ). Ambas en Pa.",
          points: 5,
        },
      ],
    },
    {
      type: "short_problem",
      points: 6,
      problems: [
        {
          id: "sp1",
          statement: "Una barra de acero (E=200 GPa) de longitud 2 m y sección 10 cm² soporta 50 kN. Calcula el alargamiento (mm).",
          answer: { kind: "numeric", value: 0.5, units: "mm", tolerance: { mode: "relative", value: 0.02 } },
          solution: "δ = FL/(EA) = 50000*2/(200e9*1e-3) = 0.0005 m = 0.5 mm.",
          points: 3,
        },
        {
          id: "sp2",
          statement: "Vector de fuerzas F = (3,4) N. Módulo (N).",
          answer: { kind: "numeric", value: 5, units: "N", tolerance: { mode: "relative", value: 0.01 } },
          solution: "|F| = sqrt(3²+4²)=5 N.",
          points: 3,
        },
      ],
    },
    {
      type: "long_problem",
      points: 5,
      problems: [
        {
          id: "lp1",
          statement: "Viga simplemente apoyada con carga puntual P en el centro.",
          subparts: [
            { id: "a", statement: "Reacción en cada apoyo (N) en función de P.", answer: { kind: "symbolic", expression: "P/2", variables: ["P"], tolerance: { mode: "relative", value: 0.01 } }, solution: "Por simetría R = P/2.", points: 2 },
            { id: "b", statement: "Momento flector máximo (N·m) si L=4 m y P=10 kN.", answer: { kind: "numeric", value: 10000, units: "N·m", tolerance: { mode: "relative", value: 0.01 } }, solution: "Mmax = PL/4 = 10000*4/4 = 10000 N·m.", points: 3 },
          ],
        },
      ],
    },
  ],
};
