import { resolve } from "path";
import { Settings } from "../settings.js";
import { StaticPageUtils } from "../index.js";

export const importExternalJsOnce =
  (settings: Settings, obj: StaticPageUtils) =>
  async (path: string, cache: Map<string, boolean>) => {
    const key = `js-${resolve(path)}`;

    if (cache.has(key)) {
      settings.logger(
        "debug",
        `Skipping already imported external JS: ${path}`
      );
      return "";
    }

    cache.set(key, true);
    return await obj.js.importExternal(path);
  };
