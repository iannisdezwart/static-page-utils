import { existsSync, mkdirSync, symlinkSync } from "fs";
import { join, parse, resolve } from "path";
import { Settings } from "../settings.js";

export const linkResource = (settings: Settings) => (srcPath: string) => {
  const webroot = resolve(settings.webroot);
  const resDir = join(webroot, "res");
  const outputFilename = parse(srcPath).name + (parse(srcPath).ext || "");
  const dstPath = join(resDir, outputFilename);

  if (!existsSync(resDir)) {
    mkdirSync(resDir, { recursive: true });
    settings.logger("debug", `Created directory: ${resDir}`);
  }

  if (!existsSync(dstPath)) {
    symlinkSync(resolve(srcPath), dstPath);
    settings.logger("debug", `Created symlink for resource: ${srcPath}`);
  }
};
