import { resolve } from "path";
import { Settings } from "../settings.js";
import { importJs } from "./import.js";

export const importJsOnce =
  (settings: Settings) => async (path: string, cache: Map<string, boolean>) => {
    const key = `js-${resolve(path)}`;

    if (cache.has(key)) {
      settings.logger("debug", `Skipping already imported JS: ${path}`);
      return "";
    }

    cache.set(key, true);
    return await importJs(path);
  };
