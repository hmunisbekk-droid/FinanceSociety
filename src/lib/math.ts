import katex from "katex";

/**
 * Renders editor text to HTML with formulas (FR-13).
 *
 * Supported delimiters:
 *   $$ … $$  or  \[ … \]   display (own line)
 *   $ … $    or  \( … \)   inline
 *
 * Money is left alone: "$5,000" is not maths because a "$" that is followed by a
 * digit or a space never opens a formula, and a "$" preceded by a space never closes one.
 * Everything outside formulas is HTML-escaped.
 */

const BLOCK = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
const INLINE = /\$(?![\s\d$])((?:\\.|[^$\\\n])+?)(?<![\s\\])\$|\\\(([\s\S]+?)\\\)/g;

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tex(expression: string, displayMode: boolean) {
  try {
    return katex.renderToString(expression.trim(), { displayMode, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
  } catch {
    return `<code>${escapeHtml(expression)}</code>`;
  }
}

function renderInline(text: string) {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    out += escapeHtml(text.slice(last, match.index)) + tex(match[1] ?? match[2] ?? "", false);
    last = match.index + match[0].length;
  }
  return out + escapeHtml(text.slice(last));
}

/** True when the text contains any formula delimiters, so plain text can skip the renderer. */
export function hasMath(text: string) {
  return /\$|\\\(|\\\[/.test(text);
}

/** Whole text (may span paragraphs) → HTML. Line breaks are kept as <br>. */
export function renderMath(text: string) {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(BLOCK)) {
    out += renderInline(text.slice(last, match.index)) + tex(match[1] ?? match[2] ?? "", true);
    last = match.index + match[0].length;
  }
  out += renderInline(text.slice(last));
  return out.replace(/\n/g, "<br>");
}
