/** "Net Present Value (NPV)" → "net-present-value-npv" */
export function slugify(text: string) {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "item";
}

/** Adds -2, -3 … until `exists` says the slug is free. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    if (!(await exists(candidate))) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}
