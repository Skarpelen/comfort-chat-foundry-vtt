import type { HookDefinitions } from "fvtt-hook-attacher";
import { debug } from "../../log";
import { registerSpeechCommands } from "./commands";
import { HOOKS_DEFINITIONS as ACCENT_UI_HOOKS_DEFINITIONS } from "./accentUi";
import { HOOKS_DEFINITIONS as DRUNK_UI_HOOKS_DEFINITIONS } from "./drunkUi";
import { registerComfortChatStatusEffects } from "./statusEffects";

export { shouldTransformChatMessage, transformSpeech } from "./pipeline";

export const HOOKS_DEFINITIONS: HookDefinitions = {
  on: [
    ...asArray(ACCENT_UI_HOOKS_DEFINITIONS.on),
    ...asArray(DRUNK_UI_HOOKS_DEFINITIONS.on)
  ]
};

export function onInitHandle(_module: foundry.packages.Module): void {
  debug("Speech feature initializing");
  registerComfortChatStatusEffects();

  (Hooks as any).on("chatCommandsReady", (chatCommands: any) => {
    registerSpeechCommands(chatCommands);
  });
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
