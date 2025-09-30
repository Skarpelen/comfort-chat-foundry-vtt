import { MODULE_ID } from "./constants";

export class Settings {
  static registerAll(): void {
    const g = game as any;

    g.settings.register(MODULE_ID, "debug", {
      name: "comfort-chat: Debug logs",
      hint: "Enable verbose logging for comfort-chat",
      scope: "client",
      config: true,
      type: Boolean,
      default: true
    });
  }

  static get debug(): boolean {
    const g = game as any;
    return g.settings.get(MODULE_ID, "debug") as boolean;
  }
}
