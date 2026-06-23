const DRUNK_MAX_LEVEL = 5;

const RU_DRUNK_CHAR_REPLACEMENTS: Record<string, string> = {
  "о": "а",
  "к": "кх",
  "щ": "шч",
  "ц": "тс",
  "с": "ш",
  "з": "ж",
  "р": "рр"
};

const EN_DRUNK_CHAR_REPLACEMENTS: Record<string, string> = {
  "o": "u",
  "s": "ch",
  "a": "ah",
  "u": "oo",
  "c": "k"
};

type DrunkProfile = Readonly<{
  replaceChance: number;
  mutateChance: number;
  confusedChance: number;
  burpChance: number;
}>;

const DRUNK_PROFILES: readonly DrunkProfile[] = [
  { replaceChance: 0, mutateChance: 0, confusedChance: 0, burpChance: 0 },
  { replaceChance: 0.04, mutateChance: 0.015, confusedChance: 0.015, burpChance: 0.03 },
  { replaceChance: 0.09, mutateChance: 0.035, confusedChance: 0.03, burpChance: 0.06 },
  { replaceChance: 0.16, mutateChance: 0.07, confusedChance: 0.055, burpChance: 0.1 },
  { replaceChance: 0.24, mutateChance: 0.11, confusedChance: 0.08, burpChance: 0.15 },
  { replaceChance: 0.34, mutateChance: 0.16, confusedChance: 0.12, burpChance: 0.22 }
];

export function applyDrunkSpeech(message: string, drunkLevel: number): string {
  const level = clampDrunkLevel(drunkLevel);

  if (level <= 0) {
    return message;
  }

  const profile = DRUNK_PROFILES[level] ?? DRUNK_PROFILES[0];
  let result = "";

  for (const character of message) {
    if (character === " " && Math.random() < profile.confusedChance) {
      result += "...ээммэээ...";
    }

    if (character === "." && Math.random() < profile.burpChance) {
      result += " *РРЫГ*.";
      continue;
    }

    const replaced = Math.random() < profile.replaceChance
      ? replaceDrunkCharacter(character)
      : character;

    result += Math.random() < profile.mutateChance
      ? mutateDrunkCharacter(replaced)
      : replaced;
  }

  return result;
}

export function clampDrunkLevel(value: unknown): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(DRUNK_MAX_LEVEL, Math.trunc(numericValue)));
}

function replaceDrunkCharacter(character: string): string {
  const lower = character.toLocaleLowerCase();
  const replacement =
    RU_DRUNK_CHAR_REPLACEMENTS[lower] ??
    EN_DRUNK_CHAR_REPLACEMENTS[lower];

  if (!replacement) {
    return character;
  }

  return character === character.toLocaleUpperCase()
    ? replacement.toLocaleUpperCase()
    : replacement;
}

function mutateDrunkCharacter(character: string): string {
  return Math.random() < 0.5 ? "'" : character + character;
}