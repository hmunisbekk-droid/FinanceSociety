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
  mission:
    "The Finance Society is a student-run club at WIUT. We help finance students understand their modules, prepare for exams with practice questions, and meet people who work in banking, investment and corporate finance in Uzbekistan.",
} as const;

/** Board members for the About page (ТЗ §12 — names, photos and roles to be provided by the club). */
export const board: Array<{ name: string; role: string; photo?: string }> = [
  { name: "To be announced", role: "President" },
  { name: "To be announced", role: "Vice-president" },
  { name: "To be announced", role: "Head of content" },
  { name: "To be announced", role: "Head of events" },
];

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
