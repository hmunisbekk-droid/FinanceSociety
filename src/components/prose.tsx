import { cn } from "@/lib/cn";

/**
 * Renders editor-written text: blank lines become paragraphs, single line
 * breaks are kept. Formula rendering (KaTeX) is layered on top of this later.
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
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}
