import { readFileSync } from "fs";
import { buildXML, parseXML } from "node-xml-parser";
import { Settings } from "../settings.js";

export const svgAsDataString = (settings: Settings) => (filePath: string) => {
  const svgFile = readFileSync(filePath, "utf-8");
  const svg = parseXML(svgFile);
  if (svg === undefined) {
    settings.logger("error", `Failed to parse SVG: ${filePath}`);
    throw new Error(`Failed to parse SVG: ${filePath}`);
  }

  return encodeURI(
    "data:image/svg+xml;base64," +
      Buffer.from(
        buildXML(svg, { indentationSize: 0, seperator: "" })
      ).toString("base64")
  );
};
