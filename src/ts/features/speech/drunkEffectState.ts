import { MODULE_ID } from "../../constants";
import { clampDrunkLevel } from "./drunk";
import { DRUNK_STATUS_ICON, DRUNK_STATUS_ID } from "./statusEffects";

export function getActorDrunkLevel(actor: any): number {
  const effect = findActorDrunkEffect(actor);

  if (effect && effect.disabled !== true) {
    return clampDrunkLevel(effect.getFlag?.(MODULE_ID, "drunkLevel") ?? 1);
  }

  const legacyValue =
    actor?.getFlag?.(MODULE_ID, "drunkLevel") ??
    actor?.getFlag?.(MODULE_ID, "speechDrunkLevel") ??
    actor?.system?.comfortChat?.drunkLevel ??
    actor?.system?.drunkLevel;

  return clampDrunkLevel(legacyValue);
}

export async function setActorDrunkLevel(actor: any, drunkLevel: number): Promise<void> {
  const level = clampDrunkLevel(drunkLevel);
  const effect = findActorDrunkEffect(actor);

  if (level <= 0) {
    await effect?.delete?.();
    await unsetLegacyActorDrunkFlag(actor);
    return;
  }

  const effectData = createDrunkEffectData(level);

  if (effect) {
    await effect.update?.(effectData);
    await unsetLegacyActorDrunkFlag(actor);
    return;
  }

  await actor.createEmbeddedDocuments?.("ActiveEffect", [effectData]);
  await unsetLegacyActorDrunkFlag(actor);
}

function findActorDrunkEffect(actor: any): any | undefined {
  const effects = actor?.effects;

  if (!effects) {
    return undefined;
  }

  for (const effect of effects) {
    if (isDrunkEffect(effect)) {
      return effect;
    }
  }

  return undefined;
}

function isDrunkEffect(effect: any): boolean {
  return (
    effect?.getFlag?.(MODULE_ID, "drunk") === true ||
    effect?.statuses?.has?.(DRUNK_STATUS_ID) === true ||
    effect?._source?.statuses?.includes?.(DRUNK_STATUS_ID) === true
  );
}

function createDrunkEffectData(level: number): Record<string, unknown> {
  return {
    name: getDrunkEffectName(level),
    img: DRUNK_STATUS_ICON,
    disabled: false,
    statuses: [DRUNK_STATUS_ID],
    flags: {
      [MODULE_ID]: {
        drunk: true,
        drunkLevel: level
      }
    }
  };
}

function getDrunkEffectName(level: number): string {
  const i18n = (game as any)?.i18n;

  return i18n?.format?.("COMFORT-CHAT.effects.drunk.nameWithLevel", { level }) ??
    `Drunk speech ${level}`;
}

async function unsetLegacyActorDrunkFlag(actor: any): Promise<void> {
  if (typeof actor?.unsetFlag === "function") {
    await actor.unsetFlag(MODULE_ID, "drunkLevel");
  }
}
