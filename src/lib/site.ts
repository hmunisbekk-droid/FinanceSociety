/**
 * Site-wide facts. Contact details and social links are placeholders until the
 * club provides the real ones (ТЗ §12).
 */
export const site = {
  name: "WIUT Finance Society",
  shortName: "Finance Society",
  university: "Westminster International University in Tashkent",
  tagline: "Structured study materials, quizzes with worked solutions and events for WIUT finance students.",
  contactEmail: "financesociety@wiut.uz", // placeholder
  links: {
    telegram: "https://t.me/wiutfinancesociety", // placeholder
    instagram: "https://instagram.com/wiutfinancesociety", // placeholder
  },
  timeZone: "Asia/Tashkent",
} as const;

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
