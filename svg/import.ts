import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { buildXML, parseXML, XMLNode } from "node-xml-parser";
import { join, resolve } from "path";
import { optimize } from "svgo";
import { Settings } from "../settings.js";

interface ImportSVGOptions {
  alt?: string;
  id?: string;
  classes?: string[];
}

export const importSvg =
  (settings: Settings) =>
  (filePath: string, options: ImportSVGOptions = {}) => {
    filePath = resolve(filePath);
    const cacheDir = resolve(settings.cacheDir);
    const svgCacheDir = join(cacheDir, "svg");

    const svgFile = readFileSync(filePath, "utf-8");
    const hash = createHash("md5").update(svgFile).digest("hex");

    const svgCacheFile = join(svgCacheDir, `${hash}.svg`);
    if (existsSync(svgCacheFile)) {
      settings.logger("debug", `Imported cached SVG for ${filePath}`);
      return readFileSync(svgCacheFile, "utf-8");
    }

    settings.logger("debug", `Inlining SVG: ${filePath}`);

    const optimisedSVG = optimize(svgFile, {
      multipass: true,
      path: filePath,
      plugins: [
        "cleanupAttrs",
        "mergeStyles",
        "inlineStyles",
        "removeDoctype",
        "removeXMLProcInst",
        "removeComments",
        "removeMetadata",
        "removeTitle",
        "removeDesc",
        "removeUselessDefs",
        "removeXMLNS",
        "removeEmptyAttrs",
        "removeHiddenElems",
        "removeEmptyText",
        "removeEmptyContainers",
        // 'removeViewBox',
        "cleanupEnableBackground",
        "minifyStyles",
        "convertStyleToAttrs",
        "convertColors",
        "convertPathData",
        "convertTransform",
        "removeUnknownsAndDefaults",
        "removeNonInheritableGroupAttrs",
        "removeUselessStrokeAndFill",
        "removeUnusedNS",
        "prefixIds",
        // 'cleanupIDs',
        "cleanupNumericValues",
        // 'cleanupListOfValues',
        "moveElemsAttrsToGroup",
        "moveGroupAttrsToElems",
        "collapseGroups",
        "mergePaths",
        "convertShapeToPath",
        "convertEllipseToCircle",
        "sortAttrs",
        "sortDefsChildren",
      ],
    });

    const svg = parseXML(optimisedSVG.data);

    if (svg === undefined) {
      settings.logger("error", `Failed to parse SVG: ${filePath}`);
      throw new Error(`Failed to parse SVG: ${filePath}`);
    }

    if (options.id != null) {
      svg.attributes.set("id", options.id);
    }

    if (options.classes !== undefined && options.classes.length > 0) {
      svg.attributes.set("class", options.classes.join(" "));
    }

    if (options.alt !== undefined) {
      svg.children.unshift(new XMLNode("title", {}, [options.alt]));
    }

    const svgString = buildXML(svg, {
      indentationSize: 0,
      seperator: "",
    });

    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
      settings.logger("debug", `Created directory: ${cacheDir}`);
    }

    writeFileSync(svgCacheFile, svgString);

    return svgString;
  };
