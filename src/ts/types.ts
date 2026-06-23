import { HookDefinitions } from "fvtt-hook-attacher";
import * as emmFeature from "./features/emm";
import * as speechFeature from "./features/speech";

/**
 * Interface for the Comfort Chat module, extending Foundry's Module interface.
 */
export interface ComfortChat extends foundry.packages.Module {}

/**
 * Callback type for module initialization.
 */
export type OnInitModuleFunc = (module: ComfortChat) => void;

/**
 * Точки расширения модуля: коллбеки и т.д.
 */
export class ComfortChatHooks {
  static ON_INIT_MODULE_CALLBACKS: Iterable<OnInitModuleFunc> = [
    emmFeature.onInitHandle,
    speechFeature.onInitHandle
  ];

  static HOOKS_DEFINITIONS_SET: Iterable<HookDefinitions> = [
    emmFeature.HOOKS_DEFINITIONS,
    speechFeature.HOOKS_DEFINITIONS
  ];
}
