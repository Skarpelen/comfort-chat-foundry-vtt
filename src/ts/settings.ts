import { MODULE_ID } from "./constants";

export class Settings {
  static registerAll(): void {
    const g: any = game;
    const i18n = g?.i18n;

    g.settings.register(MODULE_ID, "debug", {
      name: i18n?.localize?.("COMFORT-CHAT.settings.debug.name") ?? "Enable debug logging",
      hint: i18n?.localize?.("COMFORT-CHAT.settings.debug.hint") ?? "Log verbose information for Comfort Chat while developing.",
      scope: "client",
      config: true,
      type: Boolean,
      default: true
    });
  }

  static get debug(): boolean {
    const g: any = game;
    return g.settings.get(MODULE_ID, "debug") as boolean;
  }
}
