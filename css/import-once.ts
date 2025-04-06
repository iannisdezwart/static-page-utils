import { resolve } from "path";
import { Settings } from "../settings";
import { StaticPageUtils } from "..";

export const importCssOnce =
  (settings: Settings, obj: StaticPageUtils) =>
  async (path: string, cache: Map<string, boolean>) => {
    const key = `css-${resolve(path)}`;

    if (cache.has(key)) {
      settings.logger("debug", `Skipping already imported CSS: ${path}`);
      return "";
    }

    cache.set(key, true);
    return await obj.css.import(path);
  };
