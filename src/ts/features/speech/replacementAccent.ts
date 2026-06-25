export type ReplacementAccentData = Readonly<{
  id: string;
  prefixes: readonly string[];
  prefixChance: number;
  suffixes: readonly string[];
  suffixChance: number;
  uppercase: boolean;
  wordReplacements: readonly ReplacementPair[];
}>;

type ReplacementPair = Readonly<{
  source: string;
  replacement: string;
}>;

type ReplacementAccentPrototype = Readonly<{
  id: string;
  prefixes: readonly string[];
  prefixChance: number;
  suffixes: readonly string[];
  suffixChance: number;
  uppercase: boolean;
  wordReplacements: readonly [string, string][];
}>;

const WORD_BOUNDARY = "[\\p{L}\\p{N}_]";

export function parseFtl(text: string): Map<string, string> {
  const result = new Map<string, string>();

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator < 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (key) {
      result.set(key, value);
    }
  }

  return result;
}

export function parseReplacementAccentYaml(text: string): ReplacementAccentPrototype[] {
  const result: ReplacementAccentPrototype[] = [];
  let current: {
    id?: string;
    prefixes: string[];
    prefixChance: number;
    replacements: [string, string][];
    suffixes: string[];
    suffixChance: number;
    uppercase: boolean;
  } | undefined;
  let currentSection: "prefixes" | "suffixes" | "wordReplacements" | undefined;

  const pushCurrent = (): void => {
    if (current?.id) {
      result.push({
        id: current.id,
        prefixes: current.prefixes,
        prefixChance: current.prefixChance,
        suffixes: current.suffixes,
        suffixChance: current.suffixChance,
        uppercase: current.uppercase,
        wordReplacements: current.replacements
      });
    }
  };

  for (const line of text.split(/\r?\n/)) {
    const withoutComment = stripYamlComment(line);
    const trimmed = withoutComment.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed === "- type: accent") {
      pushCurrent();
      current = {
        prefixes: [],
        prefixChance: 1,
        replacements: [],
        suffixes: [],
        suffixChance: 1,
        uppercase: false
      };
      currentSection = undefined;
      continue;
    }

    if (!current) {
      continue;
    }

    if (trimmed.startsWith("id:")) {
      current.id = trimmed.slice(3).trim();
      continue;
    }

    if (trimmed.startsWith("prefixChance:")) {
      current.prefixChance = parseChance(trimmed.slice("prefixChance:".length).trim());
      currentSection = undefined;
      continue;
    }

    if (trimmed.startsWith("suffixChance:")) {
      current.suffixChance = parseChance(trimmed.slice("suffixChance:".length).trim());
      currentSection = undefined;
      continue;
    }

    if (trimmed.startsWith("uppercase:")) {
      current.uppercase = trimmed.slice("uppercase:".length).trim().toLowerCase() === "true";
      currentSection = undefined;
      continue;
    }

    if (trimmed === "prefixes:") {
      currentSection = "prefixes";
      continue;
    }

    if (trimmed === "suffixes:") {
      currentSection = "suffixes";
      continue;
    }

    if (trimmed === "wordReplacements:") {
      currentSection = "wordReplacements";
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (!line.startsWith("    ")) {
      currentSection = undefined;
      continue;
    }

    if (currentSection === "prefixes" || currentSection === "suffixes") {
      if (trimmed.startsWith("- ")) {
        const key = trimmed.slice(2).trim();

        if (key) {
          current[currentSection].push(key);
        }
      }

      continue;
    }

    const separator = trimmed.indexOf(":");

    if (separator < 0) {
      continue;
    }

    const sourceKey = trimmed.slice(0, separator).trim();
    const replacementKey = trimmed.slice(separator + 1).trim();

    if (sourceKey && replacementKey) {
      current.replacements.push([sourceKey, replacementKey]);
    }
  }

  pushCurrent();

  return result;
}

export function createReplacementAccentData(
  yaml: string,
  ftl: string
): Map<string, ReplacementAccentData> {
  const localizedStrings = parseFtl(ftl);
  const result = new Map<string, ReplacementAccentData>();

  for (const prototype of parseReplacementAccentYaml(yaml)) {
    const prefixes = prototype.prefixes
      .map((key) => localizedStrings.get(key))
      .filter((value): value is string => value != null && value.length > 0);
    const suffixes = prototype.suffixes
      .map((key) => localizedStrings.get(key))
      .filter((value): value is string => value != null && value.length > 0);
    const wordReplacements: ReplacementPair[] = [];

    for (const [sourceKey, replacementKey] of prototype.wordReplacements) {
      const source = localizedStrings.get(sourceKey);
      const replacement = localizedStrings.get(replacementKey);

      if (!source || !replacement) {
        continue;
      }

      wordReplacements.push({ source, replacement });
    }

    result.set(prototype.id, {
      id: prototype.id,
      prefixes,
      prefixChance: prototype.prefixChance,
      suffixes,
      suffixChance: prototype.suffixChance,
      uppercase: prototype.uppercase,
      wordReplacements: wordReplacements.sort((left, right) =>
        right.source.length - left.source.length
      )
    });
  }

  return result;
}

export function applyReplacementAccent(
  message: string,
  accent: ReplacementAccentData | undefined
): string {
  if (!accent) {
    return message;
  }

  let result = message;
  let mask = message;

  for (const { source, replacement } of accent.wordReplacements) {
    const regex = new RegExp(
      `(?<!${WORD_BOUNDARY})${escapeRegExp(source)}(?!${WORD_BOUNDARY})`,
      "iu"
    );

    let match = regex.exec(mask);

    while (match) {
      const transformedReplacement = applySimpleCapitalization(match[0], replacement);

      result =
        result.slice(0, match.index) +
        transformedReplacement +
        result.slice(match.index + match[0].length);
      mask =
        mask.slice(0, match.index) +
        "_".repeat(transformedReplacement.length) +
        mask.slice(match.index + match[0].length);

      match = regex.exec(mask);
    }
  }

  if (accent.prefixes.length > 0 && Math.random() < accent.prefixChance) {
    result = applyPrefix(result, pickRandom(accent.prefixes));
  }

  if (accent.suffixes.length > 0 && Math.random() < accent.suffixChance) {
    result = `${result} ${pickRandom(accent.suffixes)}`;
  }

  if (accent.uppercase) {
    result = result.toLocaleUpperCase();
  }

  return result;
}

function stripYamlComment(line: string): string {
  const commentIndex = line.indexOf("#");

  if (commentIndex < 0) {
    return line;
  }

  return line.slice(0, commentIndex);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseChance(input: string): number {
  const value = Number(input);

  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

function pickRandom(values: readonly string[]): string {
  return values[Math.floor(Math.random() * values.length)] ?? "";
}

function applyPrefix(message: string, prefix: string): string {
  if (!message || !prefix) {
    return message;
  }

  if (isFirstWordAllUpperCase(message)) {
    return `${prefix.toLocaleUpperCase()} ${message}`;
  }

  return capitalizeFirst(`${prefix} ${lowercaseFirst(message)}`);
}

function lowercaseFirst(input: string): string {
  return input.length > 0 ? input[0].toLocaleLowerCase() + input.slice(1) : input;
}

function capitalizeFirst(input: string): string {
  return input.length > 0 ? input[0].toLocaleUpperCase() + input.slice(1) : input;
}

function applySimpleCapitalization(source: string, replacement: string): string {
  if (isAllUpperCase(source) && (source.length > 1 || replacement.length === 1)) {
    return replacement.toLocaleUpperCase();
  }

  if (source.length > 0 && source[0] === source[0].toLocaleUpperCase()) {
    return replacement[0].toLocaleUpperCase() + replacement.slice(1);
  }

  return replacement;
}

function isAllUpperCase(input: string): boolean {
  const letters = [...input].filter((character) => /\p{L}/u.test(character));

  return letters.length > 0 && letters.every((character) =>
    character === character.toLocaleUpperCase()
  );
}

function isFirstWordAllUpperCase(input: string): boolean {
  const firstWord = input.match(/^\S+/u)?.[0] ?? "";

  return isAllUpperCase(firstWord);
}
