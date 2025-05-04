import { copyFileSync } from "fs";
import { join, resolve } from "path";
import { Settings } from "../settings.js";

export const importPwaServiceWorker =
  (settings: Settings) => (path: string) => {
    const webroot = resolve(settings.webroot);
    const serviceWorkerFile = join(webroot, "service-worker.js");
    copyFileSync(path, serviceWorkerFile);

    return /* html */ `
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }
  </script>
  `;
  };
