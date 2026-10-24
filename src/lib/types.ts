import { z } from "zod";

/* ============================================================
 *  Esquema del examen (contrato con el LLM)
 * ============================================================ */

export const AnswerSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("numeric"),
    value: z.number(),
    units: z.string().optional(),
    tolerance: z.object({ mode: z.enum(["absolute", "relative"]), value: z.number() }),
  }),
  z.object({
    kind: z.literal("vector"),
    value: z.array(z.number()),
    units: z.string().optional(),
    tolerance: z.object({ mode: z.enum(["absolute", "relative"]), value: z.number() }),
  }),
  z.object({
    kind: z.literal("matrix"),
    value: z.array(z.array(z.number())),
    units: z.string().optional(),
    tolerance: z.object({ mode: z.enum(["absolute", "relative"]), value: z.number() }),
  }),
  z.object({
    kind: z.literal("symbolic"),
    expression: z.string(),
    variables: z.array(z.string()),
    tolerance: z.object({ mode: z.literal("relative"), value: z.number() }),
  }),
  z.object({
    kind: z.literal("text"),
    acceptedAnswers: z.array(z.string()),
  }),
]);

export type AnswerSpec = z.infer<typeof AnswerSpecSchema>;

export const MCQuestionSchema = z.object({
  id: z.string(),
  statement: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correctOptionId: z.string(),
  explanation: z.string(),
  points: z.number().optional(),
  svg: z.string().optional(),
  imageIndex: z.number().optional(),
});

export const OpenQuestionSchema = z.object({
  id: z.string(),
  statement: z.string(),
  rubric: z.array(z.string()).min(1),
  modelAnswer: z.string(),
  points: z.number(),
  svg: z.string().optional(),
  imageIndex: z.number().optional(),
});

export const ShortProblemSchema = z.object({
  id: z.string(),
  statement: z.string(),
  answer: AnswerSpecSchema,
  solution: z.string(),
  points: z.number(),
  svg: z.string().optional(),
  imageIndex: z.number().optional(),
});

export const LongProblemSchema = z.object({
  id: z.string(),
  statement: z.string(),
  svg: z.string().optional(),
  imageIndex: z.number().optional(),
  subparts: z.array(
    z.object({
      id: z.string(),
      statement: z.string(),
      answer: AnswerSpecSchema,
      solution: z.string(),
      points: z.number(),
      svg: z.string().optional(),
      imageIndex: z.number().optional(),
    })
  ).min(1),
});

export const SectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("multiple_choice"), points: z.number().optional(), questions: z.array(MCQuestionSchema).min(1) }),
  z.object({ type: z.literal("open_reasoning"), points: z.number().optional(), questions: z.array(OpenQuestionSchema).min(1) }),
  z.object({ type: z.literal("short_problem"), points: z.number().optional(), problems: z.array(ShortProblemSchema).min(1) }),
  z.object({ type: z.literal("long_problem"), points: z.number().optional(), problems: z.array(LongProblemSchema).min(1) }),
]);

export const ExamSchema = z.object({
  title: z.string(),
  subject: z.string(),
  totalPoints: z.number(),
  sections: z.array(SectionSchema).min(1),
});

export type Exam = z.infer<typeof ExamSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type MCQuestion = z.infer<typeof MCQuestionSchema>;
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;
export type ShortProblem = z.infer<typeof ShortProblemSchema>;
export type LongProblem = z.infer<typeof LongProblemSchema>;

/* ============================================================
 *  Respuestas del alumno
 * ============================================================ */
export type StudentAnswers = {
  // mc: questionId -> optionId
  mc: Record<string, string>;
  // open: questionId -> text
  open: Record<string, string>;
  // short: problemId -> string (raw input depending on kind)
  short: Record<string, string>;
  // long: problemId -> { subpartId -> raw }
  long: Record<string, Record<string, string>>;
  // long vector/matrix raw stored as JSON string; parsed on grade
};

/* ============================================================
 *  Resultado de corrección
 * ============================================================ */
export type GradeResult = {
  totalScore: number;
  totalPoints: number;
  items: GradeItem[];
};

export type GradeItem = {
  id: string; // question/problem/subpart id
  sectionType: string;
  label: string;
  score: number;
  points: number;
  feedback: string;
  correctSolution: string;
  isCorrect: boolean;
};
