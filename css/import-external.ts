import { LRUCache } from "lru-cache";
import { Settings } from "../settings";
import https from "https";

export const importExternalCss =
  (settings: Settings, memCache: LRUCache<string, string>) => (url: string) =>
    new Promise<string>((resolve) => {
      const cachedVal = memCache.get(url);
      if (cachedVal !== undefined) {
        settings.logger("debug", `Using cached CSS: ${url}`);
        resolve(cachedVal);
        return;
      }

      settings.logger("debug", `Downloading CSS: ${url}`);

      let html = "<style>";

      https.get(url, (res) => {
        let content = "";

        res.on("data", (chunk) => (content += chunk));

        res.on("end", () => {
          html += content + "</style>";
          memCache.set(url, html);
          resolve(html);
        });
      });
    });
