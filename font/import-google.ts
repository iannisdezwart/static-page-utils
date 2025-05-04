import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { Settings } from "../settings.js";
import { StaticPageUtils } from "../index.js";

interface FontStyle {
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  italic?: boolean;
}

type CharacterSet = [number, number];

export const characterSets: { [name: string]: CharacterSet } = {
  basicLatin: [0x20, 0x7f],
  allLatin: [0x20, 0x24f],
};

export const importGoogleFont =
  (settings: Settings, obj: StaticPageUtils) =>
  async (
    fontFamily: string,
    styles: FontStyle[],
    charSets: CharacterSet[] | undefined = undefined
  ) => {
    const cacheDir = resolve(settings.cacheDir);
    const stylesString = styles
      .sort((a, b) => {
        if (a.italic && !b.italic) return 1;
        if (b.italic && !a.italic) return -1;
        return a.weight - b.weight;
      })
      .map((style) => `${style.italic ? 1 : 0},${style.weight}`)
      .join(";");

    const hash = createHash("md5")
      .update(fontFamily + stylesString)
      .digest("hex");

    const fontCacheDir = join(cacheDir, "fonts");
    const fontCacheFile = join(fontCacheDir, `${hash}.css`);
    if (existsSync(join(fontCacheDir, fontCacheFile))) {
      settings.logger("debug", `Imported cached Google Font: ${fontFamily}`);
      return readFileSync(fontCacheFile, "utf8");
    }

    settings.logger("debug", `Importing Google Font: ${fontFamily}`);

    let url = `https://fonts.googleapis.com/css2?family=${fontFamily}:ital,wght@${stylesString}&display=swap`;

    if (charSets != null) {
      let text = "";
      for (const charSet of charSets) {
        for (let i = charSet[0]; i <= charSet[1]; i++) {
          text += String.fromCharCode(i);
        }
      }
      url += `&text=${encodeURIComponent(text)}`;
    }

    settings.logger("debug", `Downloading font: ${url}`);

    const css = /* html */ `
    <link rel="preconnect" href="https://fonts.gstatic.com">
    ${await obj.css.importExternal(url)}
    `;

    if (!existsSync("cache/fonts")) {
      mkdirSync("cache/fonts", { recursive: true });
      settings.logger("debug", `Created cache directory: ${fontCacheDir}`);
    }

    writeFileSync(fontCacheFile, css);

    return css;
  };
