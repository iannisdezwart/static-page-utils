import { LRUCache } from "lru-cache";
import { Settings } from "../settings";
import https from "https";

export const importExternalJs =
  (settings: Settings, memCache: LRUCache<string, string>) => (url: string) =>
    new Promise<string>((resolve) => {
      const cachedVal = memCache.get(url);
      if (cachedVal !== undefined) {
        settings.logger("debug", `Using cached JS: ${url}`);
        resolve(cachedVal);
        return;
      }

      settings.logger("debug", `Downloading JS: ${url}`);

      let html = "<script>";

      https.get(url, (res) => {
        let content = "";

        res.on("data", (chunk) => (content += chunk));

        res.on("end", () => {
          html += content + "</script>";
          memCache.set(url, html);
          resolve(html);
        });
      });
    });
