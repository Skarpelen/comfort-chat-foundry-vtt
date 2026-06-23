import {
  createReplacementAccentData,
  type ReplacementAccentData
} from "./replacementAccent";
import dwarfAccentFtl from "./data/dwarf.ftl?raw";
import wordReplacementsYaml from "./data/word_replacements.yml?raw";

const ACCENTS = createReplacementAccentData(wordReplacementsYaml, dwarfAccentFtl);

export function getAccentData(accentId: string | undefined): ReplacementAccentData | undefined {
  return accentId ? ACCENTS.get(accentId) : undefined;
}

export function getAvailableAccentIds(): string[] {
  return [...ACCENTS.keys()];
}

export function isKnownAccent(accentId: string): boolean {
  return ACCENTS.has(accentId);
}
