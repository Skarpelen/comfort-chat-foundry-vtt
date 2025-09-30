import { debug, info, warn, error } from "../../log";
import type { HookDefinitions } from "fvtt-hook-attacher";

export function onInitHandle(_module: foundry.packages.Module): void {
  debug("EMM feature initializing");

  (Hooks as any).on("chatCommandsReady", (chatCommands: any) => {
    try {
      debug("chatCommandsReady fired — registering /emm");
      const register = (commandKey: string) => {
        const cmd = chatCommands.createCommandFromData({
          commandKey,
          description: "Сообщение-описание действия как в Roll20",
          iconClass: "fa-bullhorn",
          shouldDisplayToChat: true,
          invokeOnCommand: (_chatLog: ChatLog, messageText: string, chatData: any) => {
            debug(`Invoked ${commandKey} via ChatCommandsLib`, { messageText });
            const html = formatEmm(messageText, chatData);
            return html;
          }
        });
        chatCommands.registerCommand(cmd);
        info(`Registered ${commandKey} with Chat Commands library`);
      };

      register("/emm");

        try { register("/em"); } catch (e) { warn("Could not register /em (might already exist)", e); }
        try { register("/me"); } catch (e) { warn("Could not register /me (might already exist)", e); }
        try { register("/emote"); } catch (e) { warn("Could not register /me (might already exist)", e); }
    } catch (e) {
      warn("Failed to register commands with Chat Commands library", e);
    }
  });
}
  
export const HOOKS_DEFINITIONS = [
  {
    hook: "chatMessage",
    once: false,
    fn: (_chatLog: ChatLog, messageText: string, chatData: any): boolean | void => {
      const trimmed = messageText?.trim() ?? "";

      const commands: string[] = ["/emm", "/em", "/me", "/emote"];

      const match = commands.find((k) => trimmed.toLowerCase().startsWith(k + " "));
      const exact = commands.includes(trimmed.toLowerCase()) ? trimmed.toLowerCase() : match;

      if (!exact) {
        return;
      }

      const text = trimmed.slice(exact.length).trim();
      debug(`Invoked ${exact} via chatMessage`, { text });

      if (!text) {
        ui.notifications?.warn(`Please provide a message after ${exact}`);
        return false;
      }

      try {
        const html = formatEmm(text, chatData);
        ChatMessage.create({
          content: html,
          speaker: chatData?.speaker
        });
        debug("ChatMessage created");
      } catch (e) {
        error("Failed to create ChatMessage", e);
      }

      return false;
    }
  },
  {
    hook: "renderChatMessage",
    once: false,
    fn: (_message: any, html: any): void => {
      try {
        const root = html?.[0] as HTMLElement | undefined;
        if (root?.querySelector?.(".cc-emm")) {
          html.addClass("cc-emm-message cc-emm-no-author");
        }
      } catch (e) {
        warn("renderChatMessage styling failed", e);
      }
    }
  }
] as unknown as HookDefinitions;

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatEmm(messageText: string, chatData: any): string {
  const name = chatData?.speaker?.alias ?? (game as any)?.user?.name ?? "Someone";
  const safeName = escapeHtml(String(name));
  const safeText = escapeHtml(String(messageText));

  return `<div class="cc-emm"><em><strong>${safeName} ${safeText}</strong></em></div>`;
}