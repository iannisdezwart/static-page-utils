import { resolve } from "path";
import { Settings } from "../settings.js";
import { StaticPageUtils } from "../index.js";

export const importSassOnce =
  (settings: Settings, obj: StaticPageUtils) =>
  async (path: string, cache: Map<string, boolean>) => {
    const key = `sass-${resolve(path)}`;

    if (cache.has(key)) {
      settings.logger("debug", `Skipping already imported SASS: ${path}`);
      return "";
    }

    cache.set(key, true);
    return await obj.sass.import(path);
  };
