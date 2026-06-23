export type ReplacementAccentData = Readonly<{
  id: string;
  wordReplacements: readonly ReplacementPair[];
}>;

type ReplacementPair = Readonly<{
  source: string;
  replacement: string;
}>;

type ReplacementAccentPrototype = Readonly<{
  id: string;
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
  let current: { id?: string; replacements: [string, string][] } | undefined;
  let inWordReplacements = false;

  const pushCurrent = (): void => {
    if (current?.id) {
      result.push({
        id: current.id,
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
      current = { replacements: [] };
      inWordReplacements = false;
      continue;
    }

    if (!current) {
      continue;
    }

    if (trimmed.startsWith("id:")) {
      current.id = trimmed.slice(3).trim();
      continue;
    }

    if (trimmed === "wordReplacements:") {
      inWordReplacements = true;
      continue;
    }

    if (!inWordReplacements) {
      continue;
    }

    if (!line.startsWith("    ")) {
      inWordReplacements = false;
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

function applySimpleCapitalization(source: string, replacement: string): string {
  if (isAllUpperCase(source)) {
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
