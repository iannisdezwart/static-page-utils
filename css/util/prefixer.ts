import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve as resolvePath } from "path";
import { Settings } from "../../settings";

// Lazy-load autoprefixer and postcss, because they are slow to load.
let autoprefixer: any;
let postcss: any;

export const getCssPrefixer = (settings: Settings) => (css: string) =>
  new Promise<string>((resolve) => {
    const hash = createHash("md5").update(css).digest("hex");
    const cacheDir = resolvePath(settings.cacheDir);
    const cssCacheDir = join(cacheDir, "css");
    const cssCacheFile = join(cssCacheDir, `${hash}.css`);

    if (existsSync(cssCacheFile)) {
      settings.logger("debug", "Using cached CSS");
      resolve(readFileSync(cssCacheFile, "utf8"));
      return;
    }

    settings.logger("debug", "Prefixing CSS");

    const browsersList = existsSync(".browserslistrc")
      ? readFileSync(".browserslistrc", "utf-8").split("\n")
      : ["> 0.01%"];

    // Load autoprefixer and postcss lazily
    // Wish they were a bit faster

    if (autoprefixer == null) {
      settings.logger("debug", "Loading autoprefixer...");
      autoprefixer = require("autoprefixer");
    }

    if (postcss == null) {
      settings.logger("debug", "Loading postcss...");
      postcss = require("postcss");
    }

    postcss([autoprefixer({ overrideBrowserslist: browsersList })])
      .process(css, {
        from: null,
      })
      .then((result: any) => {
        const warnings = result.warnings();

        for (const warning of warnings) {
          console.error(warning);
        }

        if (!existsSync(cssCacheDir)) {
          mkdirSync(cssCacheDir, { recursive: true });
        }

        writeFileSync(cssCacheFile, result.css);

        resolve(result.css);
      });
  });
