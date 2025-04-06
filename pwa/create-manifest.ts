import imageSize from "image-size";
import { PageShell } from "../page-shell/page-shell";
import { Settings } from "../settings";
import { join, parse, resolve } from "path";
import { SubClass } from "gm";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";

interface PWAManifestProtocolHandler {
  protocol: string;
  url: string;
}

interface PWAManifestRelatedApplication {
  platform: "chrome_web_store" | "play" | "itunes" | "webapp" | "windows";
  url: string;
  id?: string;
}

interface PWAManifestShortcut {
  name: string;
  shortName?: string;
  description?: string;
  url: string;
  icon?: string;
}

interface PWAManifest {
  backgroundColour?: string;
  categories?: string[];
  description?: string;
  dir?: "auto" | "ltr" | "rtl";
  display?: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  iarcRatingID?: string;
  icon: {
    svg?: string;
    png?: string;
    maskableSvg?: string;
    maskablePng?: string;
  };
  lang?: string;
  name: string;
  orientation?:
    | "any"
    | "natural"
    | "landscape"
    | "landscape-primary"
    | "landscape-secondary"
    | "portrait"
    | "portrait-primary"
    | "portrait-secondary";
  preferRelatedApplications?: boolean;
  protocolHandlers?: PWAManifestProtocolHandler[];
  relatedApplications?: PWAManifestRelatedApplication[];
  scope?: string;
  screenshots?: string[];
  shortName?: string;
  shortcuts?: PWAManifestShortcut[];
  startURL?: string;
  themeColour?: string;
}

export const createPwaManifest =
  (settings: Settings, imageMagick: SubClass) =>
  async (manifest: PWAManifest, page: PageShell) => {
    settings.logger("debug", `Creating PWA Manifest`);
    const webroot = resolve(settings.webroot);
    const pwaDir = join(webroot, "res", "pwa");

    const json = {} as any;

    if (manifest.backgroundColour != null) {
      json["background_color"] = manifest.backgroundColour;
    }

    if (manifest.categories != null && manifest.categories.length != 0) {
      json["categories"] = manifest.categories;
    }

    if (manifest.description != null) {
      json["description"] = manifest.description;
    }

    if (manifest.dir != null) {
      json["dir"] = manifest.dir;
    }

    if (manifest.display != null) {
      json["display"] = manifest.display;
    }

    if (manifest.iarcRatingID != null) {
      json["iarc_rating_id"] = manifest.iarcRatingID;
    }

    if (manifest.icon != null) {
      if (!existsSync(pwaDir)) {
        mkdirSync(pwaDir, { recursive: true });
      }

      json["icons"] = [];

      if (manifest.icon.svg != null) {
        const { width, height } = imageSize(readFileSync(manifest.icon.svg));
        const iconFile = join(pwaDir, "icon.svg");
        copyFileSync(manifest.icon.svg, iconFile);

        json["icons"].push({
          src: "/res/pwa/icon.svg",
          sizes: `${width}x${height}`,
          type: "image/svg",
        });
      }

      if (manifest.icon.maskableSvg != null) {
        const { width, height } = imageSize(
          readFileSync(manifest.icon.maskableSvg)
        );
        const iconFile = join(pwaDir, "maskable-icon.svg");
        copyFileSync(manifest.icon.maskableSvg, iconFile);

        json["icons"].push({
          src: "/res/pwa/maskable-icon.svg",
          sizes: `${width}x${height}`,
          type: "image/svg",
          purpose: "any maskable",
        });
      }

      if (manifest.icon.png != null) {
        const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

        await scaleImages(
          settings,
          imageMagick,
          manifest.icon.png,
          sizes.map((size) => [size, size]),
          90,
          pwaDir,
          "icon"
        );

        json["icons"].push(
          ...sizes.map((size) => ({
            src: `/res/pwa/icon-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
          }))
        );

        page.appendToHead(/* html */ `
        <link rel="icon" type="image/png" href="/res/pwa/icon-16x16.png" sizes="16x16">
        <link rel="icon" type="image/png" href="/res/pwa/icon-32x32.png" sizes="32x32">
        <link rel="icon" type="image/png" href="/res/pwa/icon-96x96.png" sizes="96x96">
        <link rel="apple-touch-icon" type="image/png" href="/res/pwa/icon-192x192.png" sizes="192x192.png">
        `);
      }

      if (manifest.icon.maskablePng != null) {
        const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

        await scaleImages(
          settings,
          imageMagick,
          manifest.icon.maskablePng,
          sizes.map((size) => [size, size]),
          90,
          pwaDir,
          "maskable-icon"
        );

        json["icons"].push(
          ...sizes.map((size) => ({
            src: `/res/pwa/maskable-icon-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "any maskable",
          }))
        );
      }
    }

    if (manifest.lang != null) {
      json["lang"] = manifest.lang;
    }

    if (manifest.name != null) {
      json["name"] = manifest.name;
    }

    if (manifest.orientation != null) {
      json["orientation"] = manifest.orientation;
    }

    if (manifest.preferRelatedApplications != null) {
      json["prefer_related_applications"] = manifest.preferRelatedApplications;
    }

    if (
      manifest.protocolHandlers != null &&
      manifest.protocolHandlers.length > 0
    ) {
      json["protocol_handlers"] = manifest.protocolHandlers;
    }

    if (
      manifest.relatedApplications != null &&
      manifest.relatedApplications.length > 0
    ) {
      json["related_applications"] = manifest.relatedApplications;
    }

    if (manifest.scope != null) {
      json["scope"] = manifest.scope;
    }

    if (manifest.screenshots != null && manifest.screenshots.length > 0) {
      json["screenshots"] = manifest.screenshots;
    }

    if (manifest.shortName != null) {
      json["short_name"] = manifest.shortName;
    }

    if (manifest.shortcuts != null && manifest.shortcuts.length > 0) {
      json["shortcuts"] = manifest.shortcuts;
    }

    if (manifest.startURL != null) {
      json["start_url"] = manifest.startURL;
    }

    if (manifest.themeColour != null) {
      json["theme_color"] = manifest.themeColour;
      page.appendToHead(/* html */ `
      <meta name="theme-color" content="${manifest.themeColour}">
      <meta name="apple-mobile-web-app-status-bar" content="${manifest.themeColour}">
      `);
    }

    const manifestFile = join(webroot, "manifest.json");
    writeFileSync(manifestFile, JSON.stringify(json));

    page.appendToHead(/* html */ `
    <link rel="manifest" href="/manifest.json">
    `);
  };

export const scaleImages = (
  settings: Settings,
  imageMagick: SubClass,
  inputPath: string,
  dimensions: [number, number][],
  quality: number,
  outputDirectory: string,
  outputFilename: string
) =>
  new Promise<void>((resolve) => {
    const filePath = parse(inputPath);
    let finishedImages = 0;

    const increment = () => {
      finishedImages++;
      if (finishedImages == dimensions.length) resolve();
    };

    const imageWriteCallback = (path: string) => (err: Error | null) => {
      if (err !== null) {
        console.error("error while converting image:", err);
        throw err;
      }

      settings.logger("info", `Processed image: ${path}`);
      increment();
    };

    for (const dimension of dimensions) {
      const outputFilePath = `${outputDirectory}/${outputFilename}-${dimension[0]}x${dimension[1]}${filePath.ext}`;
      if (existsSync(outputFilePath)) {
        increment();
        continue;
      }

      imageMagick(inputPath)
        .resize(dimension[0], dimension[1], ">")
        .quality(quality)
        .write(outputFilePath, imageWriteCallback(outputFilePath));
    }
  });
