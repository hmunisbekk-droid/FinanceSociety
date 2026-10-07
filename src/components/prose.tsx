import { cn } from "@/lib/cn";
import { hasMath, renderMath } from "@/lib/math";

/**
 * Renders editor-written text: blank lines become paragraphs, single line
 * breaks are kept, and LaTeX between $…$ / $$…$$ is rendered with KaTeX (FR-13).
 */
export function Prose({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={cn("space-y-4 text-base leading-7 text-slate-700", className)}>
      {paragraphs.map((p, i) =>
        hasMath(p) ? (
          <p key={i} className="[&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto" dangerouslySetInnerHTML={{ __html: renderMath(p) }} />
        ) : (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ),
      )}
    </div>
  );
}

/** Inline text with formulas, for question prompts and options. */
export function MathText({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
