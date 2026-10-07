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

/** CIFS (foundation) students are in Level 3; every degree programme runs through Levels 4–6. */
export const FOUNDATION_PROGRAMME: Programme = "CIFS";
export const FOUNDATION_LEVEL = 3;

/** Level numbers a student on this programme can be in. Empty programme = no restriction yet. */
export function levelNumbersFor(programme: string): number[] | null {
  if (!programme) return null;
  return programme === FOUNDATION_PROGRAMME ? [FOUNDATION_LEVEL] : [4, 5, 6];
}

export interface LevelRef {
  id: string;
  number: number;
}

/**
 * Server-side check of the programme ↔ level rule. CIFS is always Level 3;
 * other programmes may not pick Level 3. Returns the level id to store.
 */
export function resolveLevelForProgramme(
  programme: string,
  levelId: string,
  levels: LevelRef[],
): { ok: true; levelId: string | null } | { ok: false; message: string } {
  if (programme === FOUNDATION_PROGRAMME) {
    const foundation = levels.find((l) => l.number === FOUNDATION_LEVEL);
    return { ok: true, levelId: foundation?.id ?? null };
  }
  if (!levelId) return { ok: true, levelId: null };
  const level = levels.find((l) => l.id === levelId);
  if (!level) return { ok: false, message: "Choose your level from the list" };
  if (programme && level.number === FOUNDATION_LEVEL) {
    return { ok: false, message: "Level 3 is for CIFS students — choose Level 4, 5 or 6" };
  }
  return { ok: true, levelId: level.id };
}
