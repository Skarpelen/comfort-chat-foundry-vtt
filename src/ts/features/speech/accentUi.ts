import type { HookDefinitions } from "fvtt-hook-attacher";
import { error } from "../../log";
import { getAvailableAccentIds, isKnownAccent } from "./accentRegistry";
import {
  getActorAccentValue,
  NO_ACCENT,
  setActorAccent
} from "./actorSpeechState";

const ACCENT_ACTION = "comfortChatAccent";
const POPOVER_CLASS = "cc-accent-popover";

let activePopover: HTMLElement | undefined;
let outsideClickHandler: ((event: MouseEvent) => void) | undefined;

export const HOOKS_DEFINITIONS: HookDefinitions = {
  on: [
    {
      name: "getHeaderControlsApplicationV2" as Hooks.HookName,
      callback: (application: any, controls: any): void => {
        const actor = getApplicationActor(application);

        if (!actor) {
          return;
        }

        attachAccentAction(application, actor);

        const controlList = Array.isArray(controls) ? controls : controls?.controls;

        if (!Array.isArray(controlList) || controlList.some((control) => control.action === ACCENT_ACTION)) {
          return;
        }

        controlList.unshift({
          action: ACCENT_ACTION,
          icon: "fa-solid fa-comment-dots",
          label: "COMFORT-CHAT.ui.accent.button",
          visible: () => actor.isOwner !== false
        });
      }
    },
    {
      name: "renderApplicationV2" as Hooks.HookName,
      callback: (application: any): void => {
        const actor = getApplicationActor(application);

        if (!actor) {
          return;
        }

        attachAccentAction(application, actor);
        attachRenderedButtonFallback(application, actor);
      }
    },
    {
      name: "renderActorSheet" as Hooks.HookName,
      callback: (application: any): void => {
        const actor = getApplicationActor(application);

        if (!actor) {
          return;
        }

        attachLegacyHeaderButton(application, actor);
      }
    },
    {
      name: "closeApplicationV2" as Hooks.HookName,
      callback: (): void => {
        closeAccentPopover();
      }
    }
  ]
};

function attachAccentAction(application: any, actor: any): void {
  const actions = application?.options?.actions;

  if (!actions || actions[ACCENT_ACTION]) {
    return;
  }

  actions[ACCENT_ACTION] = (event: PointerEvent, target: HTMLElement): void => {
    event.preventDefault();
    event.stopPropagation();
    toggleAccentPopover(actor, target);
  };
}

function attachRenderedButtonFallback(application: any, actor: any): void {
  const root = application?.element as HTMLElement | undefined;
  const button = root?.querySelector<HTMLElement>(`[data-action="${ACCENT_ACTION}"]`);

  if (!button || button.dataset.ccAccentBound === "true") {
    return;
  }

  button.dataset.ccAccentBound = "true";
  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleAccentPopover(actor, button);
    },
    { capture: true }
  );
}

function attachLegacyHeaderButton(application: any, actor: any): void {
  const root = getApplicationElement(application);
  const header = root?.querySelector<HTMLElement>(".window-header");

  if (!header || header.querySelector(`[data-action="${ACCENT_ACTION}"]`)) {
    return;
  }

  const button = document.createElement("a");
  button.className = "header-control cc-accent-header-control";
  button.dataset.action = ACCENT_ACTION;
  button.title = localize("COMFORT-CHAT.ui.accent.button", "Accent");
  button.innerHTML = `<i class="fa-solid fa-comment-dots"></i>${localize("COMFORT-CHAT.ui.accent.button", "Accent")}`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleAccentPopover(actor, button);
  });

  const close = header.querySelector(".close");
  header.insertBefore(button, close);
}

function toggleAccentPopover(actor: any, anchor: HTMLElement): void {
  if (activePopover) {
    closeAccentPopover();
    return;
  }

  activePopover = createAccentPopover(actor, anchor);
  document.body.append(activePopover);
  positionPopover(activePopover, anchor);

  window.setTimeout(() => {
    outsideClickHandler = (event: MouseEvent): void => {
      const target = event.target;

      if (target instanceof Node && activePopover?.contains(target)) {
        return;
      }

      closeAccentPopover();
    };

    document.addEventListener("mousedown", outsideClickHandler, true);
  });
}

function createAccentPopover(actor: any, anchor: HTMLElement): HTMLElement {
  const popover = document.createElement("div");
  popover.className = POPOVER_CLASS;
  popover.setAttribute("role", "menu");

  const label = document.createElement("label");
  label.textContent = localize("COMFORT-CHAT.ui.accent.label", "Accent");

  const select = document.createElement("select");
  select.append(createAccentOption(NO_ACCENT));

  for (const accentId of getAvailableAccentIds()) {
    select.append(createAccentOption(accentId));
  }

  select.value = getActorAccentValue(actor);
  select.addEventListener("change", () => {
    void updateActorAccent(actor, select.value, anchor).catch((e) => {
      error("Failed to update actor accent from UI", e);
    });
  });

  label.append(select);
  popover.append(label);

  return popover;
}

function createAccentOption(accentId: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = accentId;
  option.textContent = getAccentLabel(accentId);

  return option;
}

async function updateActorAccent(actor: any, accent: string, anchor: HTMLElement): Promise<void> {
  if (accent !== NO_ACCENT && !isKnownAccent(accent)) {
    return;
  }

  await setActorAccent(actor, accent);
  anchor.classList.toggle("active", accent !== NO_ACCENT);
  closeAccentPopover();
}

function positionPopover(popover: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const width = 220;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const top = Math.max(8, rect.bottom + 4);

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function closeAccentPopover(): void {
  activePopover?.remove();
  activePopover = undefined;

  if (outsideClickHandler) {
    document.removeEventListener("mousedown", outsideClickHandler, true);
    outsideClickHandler = undefined;
  }
}

function getApplicationActor(application: any): any | undefined {
  const document = application?.document ?? application?.object;

  if (document?.documentName === "Actor") {
    return document;
  }

  return undefined;
}

function getApplicationElement(application: any): HTMLElement | undefined {
  const element = application?.element;

  if (element instanceof HTMLElement) {
    return element;
  }

  if (element?.[0] instanceof HTMLElement) {
    return element[0] as HTMLElement;
  }

  return undefined;
}

function getAccentLabel(accentId: string): string {
  return localize(`COMFORT-CHAT.ui.accent.options.${accentId}`, accentId);
}

function localize(key: string, fallback: string): string {
  const localized = (game as any)?.i18n?.localize?.(key);

  return localized && localized !== key ? localized : fallback;
}
