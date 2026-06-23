import { applyDrunkSpeech } from "./drunk";
import { applyReplacementAccent } from "./replacementAccent";
import { getAccentData } from "./accentRegistry";
import {
  getActorAccentId,
  getSpeakerActor
} from "./actorSpeechState";
import { getActorDrunkLevel } from "./drunkEffectState";

export function shouldTransformChatMessage(messageText: string, chatData: any): boolean {
  const text = messageText ?? "";

  if (!text.trim() || text.trimStart().startsWith("/")) {
    return false;
  }

  if (!isIcChatData(chatData)) {
    return false;
  }

  const actor = getSpeakerActor(chatData);

  if (!actor) {
    return false;
  }

  return getActorAccentId(actor) != null || getActorDrunkLevel(actor) > 0;
}

export function transformSpeech(messageText: string, chatData: any): string {
  const actor = getSpeakerActor(chatData);

  if (!actor) {
    return messageText;
  }

  const accent = getAccentData(getActorAccentId(actor));
  const withAccent = applyReplacementAccent(messageText, accent);

  return applyDrunkSpeech(withAccent, getActorDrunkLevel(actor));
}

function isIcChatData(chatData: any): boolean {
  const styles = (CONST as any).CHAT_MESSAGE_STYLES ?? (CONST as any).CHAT_MESSAGE_TYPES;
  const messageStyle = chatData?.style ?? chatData?.type;

  return messageStyle == null || messageStyle === styles?.IC;
}
