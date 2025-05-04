import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { renderSync } from "sass";
import { getCssPrefixer } from "../css/util/prefixer.js";
import { Settings } from "../settings.js";

export const importSass =
  (settings: Settings, prefixCss: ReturnType<typeof getCssPrefixer>) =>
  async (filePath: string) => {
    filePath = resolve(filePath);
    const file = readFileSync(filePath, "utf-8");
    const hash = createHash("md5").update(file).digest("hex");
    const cacheDir = resolve(settings.cacheDir);
    const cssCacheDir = `${cacheDir}/css`;
    const cssCacheFile = `${cssCacheDir}/${hash}.css`;

    if (existsSync(cssCacheFile)) {
      settings.logger(
        "debug",
        `Using cached compiled SASS file for ${filePath}`
      );

      return /* html */ `
      <style>
        ${readFileSync(cssCacheFile, "utf-8")}
      </style>
		  `;
    }

    settings.logger("debug", `Compiling SASS: ${filePath}`);

    const compiledCSS = await prefixCss(
      renderSync({ file: filePath }).css.toString()
    );

    if (!existsSync(cssCacheDir)) {
      mkdirSync(cssCacheDir, { recursive: true });
    }

    writeFileSync(cssCacheFile, compiledCSS);

    return /* html */ `
    <style>
      ${compiledCSS}
    </style>
    `;
  };
