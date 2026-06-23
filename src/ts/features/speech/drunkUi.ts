import type { HookDefinitions } from "fvtt-hook-attacher";
import { error } from "../../log";
import { getActorDrunkLevel, setActorDrunkLevel } from "./drunkEffectState";

const DRUNK_ACTION = "comfortChatDrunk";
const POPOVER_CLASS = "cc-drunk-popover";

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

        attachDrunkAction(application, actor);

        const controlList = Array.isArray(controls) ? controls : controls?.controls;

        if (!Array.isArray(controlList) || controlList.some((control) => control.action === DRUNK_ACTION)) {
          return;
        }

        controlList.unshift({
          action: DRUNK_ACTION,
          icon: "fa-solid fa-wine-bottle",
          label: "COMFORT-CHAT.ui.drunk.button",
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

        attachDrunkAction(application, actor);
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
        closeDrunkPopover();
      }
    }
  ]
};

function attachDrunkAction(application: any, actor: any): void {
  const actions = application?.options?.actions;

  if (!actions || actions[DRUNK_ACTION]) {
    return;
  }

  actions[DRUNK_ACTION] = (event: PointerEvent, target: HTMLElement): void => {
    event.preventDefault();
    event.stopPropagation();
    toggleDrunkPopover(actor, target);
  };
}

function attachRenderedButtonFallback(application: any, actor: any): void {
  const root = application?.element as HTMLElement | undefined;
  const button = root?.querySelector<HTMLElement>(`[data-action="${DRUNK_ACTION}"]`);

  if (!button || button.dataset.ccDrunkBound === "true") {
    return;
  }

  button.dataset.ccDrunkBound = "true";
  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleDrunkPopover(actor, button);
    },
    { capture: true }
  );
}

function attachLegacyHeaderButton(application: any, actor: any): void {
  const root = getApplicationElement(application);
  const header = root?.querySelector<HTMLElement>(".window-header");

  if (!header || header.querySelector(`[data-action="${DRUNK_ACTION}"]`)) {
    return;
  }

  const button = document.createElement("a");
  button.className = "header-control cc-drunk-header-control";
  button.dataset.action = DRUNK_ACTION;
  button.title = localize("COMFORT-CHAT.ui.drunk.button", "Drunk speech");
  button.innerHTML = `<i class="fa-solid fa-wine-bottle"></i>${localize("COMFORT-CHAT.ui.drunk.button", "Drunk speech")}`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleDrunkPopover(actor, button);
  });

  const close = header.querySelector(".close");
  header.insertBefore(button, close);
}

function toggleDrunkPopover(actor: any, anchor: HTMLElement): void {
  if (activePopover) {
    closeDrunkPopover();
    return;
  }

  activePopover = createDrunkPopover(actor, anchor);
  document.body.append(activePopover);
  positionPopover(activePopover, anchor);

  window.setTimeout(() => {
    outsideClickHandler = (event: MouseEvent): void => {
      const target = event.target;

      if (target instanceof Node && activePopover?.contains(target)) {
        return;
      }

      closeDrunkPopover();
    };

    document.addEventListener("mousedown", outsideClickHandler, true);
  });
}

function createDrunkPopover(actor: any, anchor: HTMLElement): HTMLElement {
  const popover = document.createElement("div");
  popover.className = POPOVER_CLASS;
  popover.setAttribute("role", "menu");

  const label = document.createElement("label");
  label.textContent = localize("COMFORT-CHAT.ui.drunk.label", "Drunk speech");

  const select = document.createElement("select");

  for (let level = 0; level <= 5; level++) {
    select.append(createDrunkOption(level));
  }

  select.value = String(getActorDrunkLevel(actor));
  select.addEventListener("change", () => {
    void updateActorDrunkLevel(actor, Number(select.value), anchor).catch((e) => {
      error("Failed to update actor drunk speech from UI", e);
    });
  });

  label.append(select);
  popover.append(label);

  return popover;
}

function createDrunkOption(level: number): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = String(level);
  option.textContent = localize(`COMFORT-CHAT.ui.drunk.options.${level}`, String(level));

  return option;
}

async function updateActorDrunkLevel(actor: any, drunkLevel: number, anchor: HTMLElement): Promise<void> {
  await setActorDrunkLevel(actor, drunkLevel);
  anchor.classList.toggle("active", drunkLevel > 0);
  closeDrunkPopover();
}

function positionPopover(popover: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const width = 240;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const top = Math.max(8, rect.bottom + 4);

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function closeDrunkPopover(): void {
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

function localize(key: string, fallback: string): string {
  const localized = (game as any)?.i18n?.localize?.(key);

  return localized && localized !== key ? localized : fallback;
}
