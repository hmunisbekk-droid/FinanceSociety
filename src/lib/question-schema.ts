import { z } from "zod";

export const optionSchema = z.object({
  text: z.string().trim().min(1, "Every option needs text").max(500),
  correct: z.boolean(),
});

/** One question as the editor or the CSV importer submits it. */
export const questionInputSchema = z
  .object({
    type: z.enum(["single", "multiple", "true_false", "numeric"]),
    prompt: z.string().trim().min(3, "Write the question").max(2000),
    explanation: z.string().trim().max(5000),
    points: z.number().positive("Points must be positive").max(100),
    options: z.array(optionSchema).max(10),
    numericAnswer: z.number().nullable(),
    tolerance: z.number().min(0).nullable(),
    toleranceType: z.enum(["absolute", "percent"]).nullable(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "numeric") {
      if (q.numericAnswer === null) ctx.addIssue({ code: "custom", message: "Enter the correct number", path: ["numericAnswer"] });
      return;
    }
    if (q.options.length < 2) ctx.addIssue({ code: "custom", message: "Add at least two options", path: ["options"] });
    const correct = q.options.filter((o) => o.correct).length;
    if (q.type === "multiple" && correct < 1) ctx.addIssue({ code: "custom", message: "Mark at least one option as correct", path: ["options"] });
    if (q.type !== "multiple" && correct !== 1) ctx.addIssue({ code: "custom", message: "Mark exactly one option as correct", path: ["options"] });
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;
