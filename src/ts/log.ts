import { MODULE_ID } from "./constants";
import { Settings } from "./settings";

export function debug(...args: unknown[]): void {
  try {
    if (Settings.debug) {
      console.log(`[${MODULE_ID}][debug]`, ...args);
    }
  } catch {
    console.log(`[${MODULE_ID}][debug]`, ...args);
  }
}

export function info(...args: unknown[]): void {
  console.log(`[${MODULE_ID}]`, ...args);
}

export function warn(...args: unknown[]): void {
  console.warn(`[${MODULE_ID}]`, ...args);
}

export function error(...args: unknown[]): void {
  console.error(`[${MODULE_ID}]`, ...args);
}
