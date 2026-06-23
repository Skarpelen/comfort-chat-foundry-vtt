import type { HookDefinitions } from "fvtt-hook-attacher";
import { error } from "../../log";
import { getAvailableAccentIds, isKnownAccent } from "./accentRegistry";
import { getActorAccentValue, NO_ACCENT, setActorAccent } from "./actorSpeechState";
import { getActorDrunkLevel, setActorDrunkLevel } from "./drunkEffectState";

const ROOT_CLASS = "cc-speech-sheet-controls";

export const HOOKS_DEFINITIONS: HookDefinitions = {
  on: [
    {
      name: "renderApplicationV2" as Hooks.HookName,
      callback: (application: any): void => {
        injectSpeechControls(application);
      }
    },
    {
      name: "renderActorSheet" as Hooks.HookName,
      callback: (application: any): void => {
        injectSpeechControls(application);
      }
    }
  ]
};

function injectSpeechControls(application: any): void {
  const actor = getApplicationActor(application);

  if (!actor || actor.type !== "character" || actor.isOwner === false) {
    return;
  }

  const root = getApplicationElement(application);
  const detailsTab = root?.querySelector<HTMLElement>('section[data-tab="details"]');

  if (!detailsTab || detailsTab.querySelector(`.${ROOT_CLASS}`)) {
    return;
  }

  const rightColumn = detailsTab.querySelector<HTMLElement>(".right");

  if (!rightColumn) {
    return;
  }

  const languagesGroup = findLanguagesGroup(rightColumn);
  const controls = document.createElement("div");
  controls.className = ROOT_CLASS;
  controls.append(createAccentControl(actor), createDrunkControl(actor));

  if (languagesGroup) {
    languagesGroup.after(controls);
    return;
  }

  rightColumn.append(controls);
}

function findLanguagesGroup(rightColumn: HTMLElement): HTMLElement | undefined {
  const languagesButton = rightColumn.querySelector<HTMLElement>(
    '[data-action="showConfiguration"][data-trait="languages"]'
  );

  if (languagesButton) {
    return languagesButton.closest<HTMLElement>(".pills-group") ?? undefined;
  }

  const groups = Array.from(rightColumn.querySelectorAll<HTMLElement>(":scope > .pills-group"));

  return groups.at(-1);
}

function createAccentControl(actor: any): HTMLElement {
  const group = createControlGroup("fa-solid fa-comment-dots", localize("COMFORT-CHAT.ui.accent.section", "Accents"));
  const select = document.createElement("select");

  select.append(createOption(NO_ACCENT, getAccentLabel(NO_ACCENT)));

  for (const accentId of getAvailableAccentIds()) {
    select.append(createOption(accentId, getAccentLabel(accentId)));
  }

  select.value = getActorAccentValue(actor);
  select.addEventListener("change", () => {
    const accent = select.value;

    if (accent !== NO_ACCENT && !isKnownAccent(accent)) {
      return;
    }

    void setActorAccent(actor, accent).catch((e) => {
      error("Failed to update actor accent from sheet UI", e);
    });
  });

  group.querySelector(".cc-speech-fields")?.append(select);

  return group;
}

function createDrunkControl(actor: any): HTMLElement {
  const group = createControlGroup("fa-solid fa-wine-bottle", localize("COMFORT-CHAT.ui.drunk.label", "Drunk speech"));
  const select = document.createElement("select");

  for (let level = 0; level <= 5; level++) {
    select.append(createOption(String(level), localize(`COMFORT-CHAT.ui.drunk.options.${level}`, String(level))));
  }

  select.value = String(getActorDrunkLevel(actor));
  select.addEventListener("change", () => {
    void setActorDrunkLevel(actor, Number(select.value)).catch((e) => {
      error("Failed to update actor drunk speech from sheet UI", e);
    });
  });

  group.querySelector(".cc-speech-fields")?.append(select);

  return group;
}

function createControlGroup(icon: string, label: string): HTMLElement {
  const group = document.createElement("div");
  group.className = "pills-group cc-speech-control";
  group.innerHTML = `
    <h3 class="icon">
      <i class="${icon}" inert></i>
      <span class="roboto-upper"></span>
    </h3>
    <div class="cc-speech-fields"></div>
  `;

  const labelElement = group.querySelector("span");

  if (labelElement) {
    labelElement.textContent = label;
  }

  return group;
}

function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;

  return option;
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