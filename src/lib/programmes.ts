/** WIUT programmes students choose from at sign-up (list from the club, 7 Oct 2026). */
export const PROGRAMMES = [
  "BSc (Hons) in Finance",
  "CIFS",
  "BA (Hons) in International Relations and Law",
  "BSc (Hons) in Economics and its Pathways",
  "BA (Hons) in Commercial Law",
  "BA (Hons) in Business Management and its Pathways",
  "BSc (Hons) in Business Information Systems",
] as const;

export type Programme = (typeof PROGRAMMES)[number];

export function isProgramme(value: string): value is Programme {
  return (PROGRAMMES as readonly string[]).includes(value);
}
