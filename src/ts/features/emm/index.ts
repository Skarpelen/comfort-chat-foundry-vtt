import { debug, error } from "../../log";
import { MODULE_ID } from "../../constants";
import type { HookDefinitions } from "fvtt-hook-attacher";

const EMM_COMMANDS: string[] = ["/emm", "/em", "/me", "/emote"];
const DESC_COMMAND = "/desc";
const EMPTY_LINE_SEPARATOR = /\r?\n[ \t]*\r?\n+/;

type ParsedChatBlock =
  | { kind: "plain"; text: string }
  | { kind: "emm"; text: string };

export function onInitHandle(_module: foundry.packages.Module): void {
  debug("EMM feature initializing");

  (Hooks as any).on("chatCommandsReady", (chatCommands: any) => {
    const i18n = (game as any)?.i18n;
    const descTmpl = i18n?.localize?.("COMFORT-CHAT.commands.emm.description") ?? "Post an emote";

    const register = (commandKey: string): void => {
      const cmd = chatCommands.createCommandFromData({
        commandKey,
        description: descTmpl,
        iconClass: "fa-bullhorn",
        shouldDisplayToChat: false,
        invokeOnCommand: (_chatLog: ChatLog, messageText: string, chatData: any) => {
          const fullText = `${commandKey} ${messageText ?? ""}`;
          const parsed = parseComfortChatInput(fullText);

          if (parsed.emptyCommand) {
            ui.notifications?.warn(`Please provide a message after ${parsed.emptyCommand}`);
            return "";
          }

          void createComfortChatMessages(parsed.blocks, chatData).catch((e) => {
            error("Failed to create comfort chat messages", e);
          });

          return "";
        }
      });

      chatCommands.registerCommand(cmd);
    };

    register("/emm");
    register("/em");
    register("/me");
    register("/emote");
  });
}

export const HOOKS_DEFINITIONS: HookDefinitions = {
  on: [
    {
      name: "chatMessage" as Hooks.HookName,
      callback: (_chatLog: ChatLog, messageText: string, chatData: any): boolean | void => {
        const parsed = parseComfortChatInput(messageText);

        if (!parsed.shouldHandle) {
          return;
        }

        if (parsed.emptyCommand) {
          const i18n = (game as any)?.i18n;
          const msg =
            i18n?.format?.("COMFORT-CHAT.notifications.needText", { command: parsed.emptyCommand }) ??
            `Please provide a message after ${parsed.emptyCommand}`;
          ui.notifications?.warn(msg);
          return false;
        }

        void createComfortChatMessages(parsed.blocks, chatData).catch((e) => {
          error("Failed to create comfort chat messages", e);
        });

        return false;
      }
    },
    {
      name: "renderChatMessage" as Hooks.HookName,
      callback: (message: any, html: any): void => {
        try {
          const root = getChatMessageRoot(html);

          if (!root) {
            return;
          }

          const isEmm =
            message?.getFlag?.(MODULE_ID, "emm") === true ||
            root.querySelector(".cc-emm") != null;

          if (isEmm) {
            root.classList.add("cc-emm-message", "cc-emm-no-author");
            return;
          }

          const previous = root.previousElementSibling as HTMLElement | null;

          if (previous?.classList.contains("cc-emm-message")) {
            root.classList.add("cc-message-after-emm");

            root.classList.remove(
              "same-sender",
              "message-same-sender",
              "continued",
              "compact",
              "no-header"
            );

            forceAuthorBlockVisible(root);
          }
        } catch (e) {
          error("renderChatMessage styling failed", e);
        }
      }
    }
  ]
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseComfortChatInput(messageText: string): {
  shouldHandle: boolean;
  blocks: ParsedChatBlock[];
  emptyCommand?: string;
} {
  const source = messageText ?? "";
  const firstLine = source.trimStart().toLowerCase();

  if (firstLine === DESC_COMMAND || firstLine.startsWith(`${DESC_COMMAND} `)) {
    return { shouldHandle: false, blocks: [] };
  }

  const rawBlocks = source
    .split(EMPTY_LINE_SEPARATOR)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const hasEmmBlock = rawBlocks.some((block) => findEmmCommand(block) != null);

  if (!hasEmmBlock) {
    return { shouldHandle: false, blocks: [] };
  }

  const blocks: ParsedChatBlock[] = [];

  for (const rawBlock of rawBlocks) {
    const command = findEmmCommand(rawBlock);

    if (!command) {
      blocks.push({ kind: "plain", text: rawBlock });
      continue;
    }

    const text = rawBlock.slice(command.length).trim();

    if (!text) {
      return { shouldHandle: true, blocks: [], emptyCommand: command };
    }

    const previous = blocks[blocks.length - 1];

    if (previous?.kind === "emm") {
      previous.text = `${previous.text}\n\n${text}`;
    } else {
      blocks.push({ kind: "emm", text });
    }
  }

  return { shouldHandle: true, blocks };
}

function findEmmCommand(text: string): string | undefined {
  const trimmed = text.trimStart().toLowerCase();

  return EMM_COMMANDS.find((command) =>
    trimmed === command || trimmed.startsWith(`${command} `)
  );
}

async function createComfortChatMessages(blocks: ParsedChatBlock[], chatData: any): Promise<void> {
  for (const block of blocks) {
    if (block.kind === "plain") {
      await ChatMessage.create({
        ...chatData,
        content: block.text,
        speaker: chatData?.speaker
      });
      continue;
    }

    await ChatMessage.create({
      ...chatData,
      content: formatEmm(block.text, chatData),
      speaker: createTechnicalEmmSpeaker(chatData),
      flags: createEmmFlags(chatData)
    });
  }
}

function createTechnicalEmmSpeaker(chatData: any): any {
  const speaker = { ...(chatData?.speaker ?? {}) };
  const randomId = (foundry as any)?.utils?.randomID?.() ?? String(Date.now());

  speaker.alias = `cc-emm-${randomId}`;
  delete speaker.actor;
  delete speaker.token;

  return speaker;
}

function createEmmFlags(chatData: any): Record<string, unknown> {
  return {
    ...(chatData?.flags ?? {}),
    [MODULE_ID]: {
      ...(chatData?.flags?.[MODULE_ID] ?? {}),
      emm: true
    }
  };
}

function formatEmm(messageText: string, chatData: any): string {
  const g: any = game;
  const i18n = g?.i18n;
  const fallback =
    i18n?.localize?.("COMFORT-CHAT.fallback.someone") ??
    "Someone";

  const name = chatData?.speaker?.alias ?? g?.user?.name ?? fallback;
  const safeName = escapeHtml(String(name));
  const safeText = escapeHtml(String(messageText)).replace(/\r?\n/g, "<br>");

  return `<div class="cc-emm"><em><strong>${safeName} ${safeText}</strong></em></div>`;
}

function getChatMessageRoot(html: any): HTMLElement | undefined {
  if (html instanceof HTMLElement) {
    return html;
  }

  if (html?.[0] instanceof HTMLElement) {
    return html[0] as HTMLElement;
  }

  return undefined;
}

function forceAuthorBlockVisible(root: HTMLElement): void {
  const selectors = [
    ":scope > header",
    ".message-header",
    ".message-sender",
    ".message-portrait",
    ".message-metadata"
  ];

  for (const selector of selectors) {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.style.removeProperty("display");
      element.style.removeProperty("visibility");
    });
  }
}