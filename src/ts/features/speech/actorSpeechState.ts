import { MODULE_ID } from "../../constants";
import { getActorDrunkLevel } from "./drunkEffectState";

export const NO_ACCENT = "none";

export type ActorSpeechState = Readonly<{
  accent: string;
  drunkLevel: number;
}>;

export function getSpeakerActor(chatData: any): any | undefined {
  return (ChatMessage as any).getSpeakerActor?.(chatData?.speaker) ?? undefined;
}

export function getActorSpeechState(actor: any): ActorSpeechState {
  return {
    accent: getActorAccentValue(actor),
    drunkLevel: getActorDrunkLevel(actor)
  };
}

export function getActorAccentValue(actor: any): string {
  return getActorAccentId(actor) ?? NO_ACCENT;
}

export function getActorAccentId(actor: any): string | undefined {
  const accent =
    actor?.getFlag?.(MODULE_ID, "accent") ??
    actor?.getFlag?.(MODULE_ID, "speechAccent") ??
    actor?.system?.comfortChat?.accent ??
    actor?.system?.accent;

  if (typeof accent !== "string" || accent === NO_ACCENT) {
    return undefined;
  }

  return accent.toLowerCase();
}

export async function setActorAccent(actor: any, accent: string): Promise<void> {
  if (accent === NO_ACCENT) {
    await unsetActorFlag(actor, "accent");
    return;
  }

  await actor.setFlag(MODULE_ID, "accent", accent);
}

async function unsetActorFlag(actor: any, flag: string): Promise<void> {
  if (typeof actor.unsetFlag === "function") {
    await actor.unsetFlag(MODULE_ID, flag);
    return;
  }

  await actor.setFlag(MODULE_ID, flag, null);
}
