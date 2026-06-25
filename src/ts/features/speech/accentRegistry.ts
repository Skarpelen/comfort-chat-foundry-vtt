import {
  createReplacementAccentData,
  type ReplacementAccentData
} from "./replacementAccent";

import demonicFtl from "./data/accents/demonic.ftl?raw";
import demonicYaml from "./data/accents/demonic.yml?raw";
import dwarfFtl from "./data/accents/dwarf.ftl?raw";
import dwarfYaml from "./data/accents/dwarf.yml?raw";
import oldcommonFtl from "./data/accents/oldcommon.ftl?raw";
import oldcommonYaml from "./data/accents/oldcommon.yml?raw";
import pirateFtl from "./data/accents/pirate.ftl?raw";
import pirateYaml from "./data/accents/pirate.yml?raw";

const ACCENT_YAML = [
  dwarfYaml,
  oldcommonYaml,
  pirateYaml,
  demonicYaml
].join("\n");

const ACCENT_FTL = [
  dwarfFtl,
  oldcommonFtl,
  pirateFtl,
  demonicFtl
].join("\n");

const ACCENTS = createReplacementAccentData(ACCENT_YAML, ACCENT_FTL);

export function getAccentData(accentId: string | undefined): ReplacementAccentData | undefined {
  return accentId ? ACCENTS.get(accentId) : undefined;
}

export function getAvailableAccentIds(): string[] {
  return [...ACCENTS.keys()];
}

export function isKnownAccent(accentId: string): boolean {
  return ACCENTS.has(accentId);
}
