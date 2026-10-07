import { csvToRecords } from "./csv";
import { questionInputSchema, type QuestionInput } from "./question-schema";

/**
 * Turns the CSV template (public/questions-template.csv) into validated questions (FR-25).
 *
 * Columns: type, question, points, option_a … option_e, correct, numeric_answer,
 * tolerance, tolerance_type, explanation. "correct" is a letter (A), several letters
 * for multiple choice (A;C), or TRUE/FALSE for true/false questions.
 */
export function parseQuestionsCsv(text: string): { questions: QuestionInput[]; errors: string[] } {
  const records = csvToRecords(text);
  const questions: QuestionInput[] = [];
  const errors: string[] = [];

  if (records.length === 0) return { questions, errors: ["The file has no rows below the header."] };

  records.forEach((r, i) => {
    const rowNo = i + 2; // 1 = header
    const type = (r.type ?? "").toLowerCase().replace(/[\s-]+/g, "_").replace("truefalse", "true_false");
    const prompt = r.question ?? r.prompt ?? "";
    const points = r.points ? Number(r.points.replace(",", ".")) : 1;

    const letters = ["a", "b", "c", "d", "e"];
    const optionTexts = letters.map((l) => r[`option_${l}`] ?? r[l] ?? "").filter((t) => t !== "");
    const correctRaw = (r.correct ?? r.answer ?? "").toUpperCase();
    const correctLetters = new Set(
      correctRaw
        .split(/[;,|/\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    );

    let options: QuestionInput["options"] = [];
    if (type === "true_false") {
      const isTrue = ["TRUE", "T", "A", "YES", "1"].includes(correctRaw.trim());
      options = [
        { text: "True", correct: isTrue },
        { text: "False", correct: !isTrue },
      ];
      if (!["TRUE", "T", "A", "YES", "1", "FALSE", "F", "B", "NO", "0"].includes(correctRaw.trim())) {
        errors.push(`Row ${rowNo}: "correct" must be TRUE or FALSE.`);
      }
    } else if (type !== "numeric") {
      options = optionTexts.map((text, idx) => ({ text, correct: correctLetters.has(letters[idx]!.toUpperCase()) }));
      for (const letter of correctLetters) {
        if (!letters.includes(letter.toLowerCase()) || letters.indexOf(letter.toLowerCase()) >= optionTexts.length) {
          errors.push(`Row ${rowNo}: correct option "${letter}" does not exist.`);
        }
      }
    }

    const num = (value: string | undefined) => (value && value.trim() !== "" ? Number(value.replace(",", ".")) : null);
    const toleranceType = (r.tolerance_type ?? "").toLowerCase().startsWith("p") ? "percent" : "absolute";

    const parsed = questionInputSchema.safeParse({
      type,
      prompt,
      explanation: r.explanation ?? r.solution ?? "",
      points: Number.isFinite(points) ? points : 1,
      options,
      numericAnswer: num(r.numeric_answer ?? r.answer_number),
      tolerance: num(r.tolerance),
      toleranceType: num(r.tolerance) === null ? null : toleranceType,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push(`Row ${rowNo}: ${issue?.path[0] === "type" ? `unknown type "${r.type}" (use single, multiple, true_false or numeric)` : issue?.message ?? "invalid"}.`);
      return;
    }
    questions.push(parsed.data);
  });

  return { questions, errors };
}
