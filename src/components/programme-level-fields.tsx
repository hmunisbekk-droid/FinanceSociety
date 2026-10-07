"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui";
import { FOUNDATION_PROGRAMME, PROGRAMMES, levelNumbersFor } from "@/lib/programmes";

export interface LevelOption {
  id: string;
  number: number;
  label: string;
}

/**
 * Programme + level dropdowns that keep each other consistent:
 * CIFS → Level 3 is chosen automatically; any degree programme → Levels 4–6 only.
 * Used by the sign-up and account forms (the server applies the same rule).
 */
export function ProgrammeLevelFields({
  levels,
  initialProgramme = "",
  initialLevelId = "",
  errors = {},
}: {
  levels: LevelOption[];
  initialProgramme?: string;
  initialLevelId?: string;
  errors?: Record<string, string>;
}) {
  const [programme, setProgramme] = useState(initialProgramme);
  const [levelId, setLevelId] = useState(initialLevelId);

  const allowed = levelNumbersFor(programme);
  const visibleLevels = allowed ? levels.filter((l) => allowed.includes(l.number)) : levels;
  const isFoundation = programme === FOUNDATION_PROGRAMME;

  function changeProgramme(next: string) {
    setProgramme(next);
    const nextAllowed = levelNumbersFor(next);
    if (next === FOUNDATION_PROGRAMME) {
      setLevelId(levels.find((l) => l.number === 3)?.id ?? "");
      return;
    }
    const current = levels.find((l) => l.id === levelId);
    if (nextAllowed && current && !nextAllowed.includes(current.number)) setLevelId("");
  }

  return (
    <>
      <Field label="Programme" htmlFor="programme" error={errors.programme}>
        <Select id="programme" name="programme" value={programme} onChange={(e) => changeProgramme(e.target.value)} aria-invalid={!!errors.programme}>
          <option value="">Choose your programme</option>
          {PROGRAMMES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </Field>

      {levels.length > 0 && (
        <Field
          label="Current level"
          htmlFor="levelId"
          error={errors.levelId}
          hint={isFoundation ? "CIFS students are in Level 3 (foundation year)." : programme ? "Degree programmes run through Levels 4 to 6." : "Pick your programme first — it decides which levels apply."}
        >
          <Select id="levelId" name="levelId" value={levelId} onChange={(e) => setLevelId(e.target.value)} aria-invalid={!!errors.levelId}>
            {!isFoundation && <option value="">Choose your level</option>}
            {visibleLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </>
  );
}
