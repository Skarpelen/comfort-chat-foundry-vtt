// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/module.scss";

import { MODULE_ID } from "./constants";
import { ComfortChat as Module, ComfortChatHooks as ModuleHooks } from "./types";
import { Settings } from "./settings";
import { info, debug } from "./log";
import { HooksAttacher } from "fvtt-hook-attacher";

let module: Module;

Hooks.once("init", () => {
  console.log(`Initializing ${MODULE_ID} (init hook)`);

  Settings.registerAll();

  module = game?.modules?.get(MODULE_ID) as Module;

  for (const callback of ModuleHooks.ON_INIT_MODULE_CALLBACKS) {
    try {
      callback(module);
    } catch (e) {
      console.error(`[${MODULE_ID}] init callback failed`, e);
    }
  }

  HooksAttacher.attachHooks(ModuleHooks.HOOKS_DEFINITIONS_SET);

  info("comfort-chat initialized");
});

Hooks.once("ready", () => {
  debug("comfort-chat is ready and listening for /emm");
});
