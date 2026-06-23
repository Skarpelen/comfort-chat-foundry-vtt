import { error } from "../../log";
import { isKnownAccent } from "./accentRegistry";
import {
  getSpeakerActor,
  NO_ACCENT,
  setActorAccent
} from "./actorSpeechState";
import { setActorDrunkLevel } from "./drunkEffectState";

const ACCENT_COMMAND = "/ccaccent";
const DRUNK_COMMAND = "/ccdrunk";

export function registerSpeechCommands(chatCommands: any): void {
  registerAccentCommand(chatCommands);
  registerDrunkCommand(chatCommands);
}

function registerAccentCommand(chatCommands: any): void {
  const i18n = (game as any)?.i18n;
  const description =
    i18n?.localize?.("COMFORT-CHAT.commands.accent.description") ??
    "Set the active character accent";

  const cmd = chatCommands.createCommandFromData({
    commandKey: ACCENT_COMMAND,
    description,
    iconClass: "fa-comment-dots",
    shouldDisplayToChat: false,
    invokeOnCommand: (_chatLog: ChatLog, messageText: string, chatData: any) => {
      void setAccentCommand(messageText, chatData).catch((e) => {
        error("Failed to set speech accent", e);
      });

      return "";
    }
  });

  chatCommands.registerCommand(cmd);
}

function registerDrunkCommand(chatCommands: any): void {
  const i18n = (game as any)?.i18n;
  const description =
    i18n?.localize?.("COMFORT-CHAT.commands.drunk.description") ??
    "Set the active character drunk speech level";

  const cmd = chatCommands.createCommandFromData({
    commandKey: DRUNK_COMMAND,
    description,
    iconClass: "fa-wine-bottle",
    shouldDisplayToChat: false,
    invokeOnCommand: (_chatLog: ChatLog, messageText: string, chatData: any) => {
      void setDrunkCommand(messageText, chatData).catch((e) => {
        error("Failed to set drunk speech level", e);
      });

      return "";
    }
  });

  chatCommands.registerCommand(cmd);
}

async function setAccentCommand(messageText: string, chatData: any): Promise<void> {
  const actor = getSpeakerActor(chatData);
  const accent = (messageText ?? "").trim().toLowerCase();

  if (!actor) {
    notifyWarn("COMFORT-CHAT.notifications.needActor", "Select a character first.");
    return;
  }

  if (!accent) {
    notifyWarn(
      "COMFORT-CHAT.notifications.needAccent",
      `Use ${ACCENT_COMMAND} dwarf or ${ACCENT_COMMAND} none.`
    );
    return;
  }

  if (accent !== NO_ACCENT && !isKnownAccent(accent)) {
    notifyWarn(
      "COMFORT-CHAT.notifications.unknownAccent",
      `Unknown accent: ${accent}.`,
      { accent }
    );
    return;
  }

  await setActorAccent(actor, accent);

  if (accent === NO_ACCENT) {
    notifyInfo("COMFORT-CHAT.notifications.accentCleared", "Accent cleared.");
    return;
  }

  notifyInfo("COMFORT-CHAT.notifications.accentSet", `Accent set to ${accent}.`, { accent });
}

async function setDrunkCommand(messageText: string, chatData: any): Promise<void> {
  const actor = getSpeakerActor(chatData);
  const input = (messageText ?? "").trim().toLowerCase();

  if (!actor) {
    notifyWarn("COMFORT-CHAT.notifications.needActor", "Select a character first.");
    return;
  }

  if (!input) {
    notifyWarn(
      "COMFORT-CHAT.notifications.needDrunkLevel",
      `Use ${DRUNK_COMMAND} 0..5 or ${DRUNK_COMMAND} none.`
    );
    return;
  }

  if (input === NO_ACCENT) {
    await setActorDrunkLevel(actor, 0);
    notifyInfo("COMFORT-CHAT.notifications.drunkCleared", "Drunk speech cleared.");
    return;
  }

  const drunkLevel = Number(input);

  if (!Number.isFinite(drunkLevel) || drunkLevel < 0 || drunkLevel > 5 || !Number.isInteger(drunkLevel)) {
    notifyWarn(
      "COMFORT-CHAT.notifications.badDrunkLevel",
      "Drunk speech level must be an integer between 0 and 5."
    );
    return;
  }

  await setActorDrunkLevel(actor, drunkLevel);
  notifyInfo("COMFORT-CHAT.notifications.drunkSet", `Drunk speech level set to ${drunkLevel}.`, {
    level: drunkLevel
  });
}

function notifyWarn(key: string, fallback: string, data?: Record<string, unknown>): void {
  ui.notifications?.warn(localize(key, fallback, data));
}

function notifyInfo(key: string, fallback: string, data?: Record<string, unknown>): void {
  ui.notifications?.info(localize(key, fallback, data));
}

function localize(key: string, fallback: string, data?: Record<string, unknown>): string {
  const i18n = (game as any)?.i18n;

  return data
    ? i18n?.format?.(key, data) ?? fallback
    : i18n?.localize?.(key) ?? fallback;
}
