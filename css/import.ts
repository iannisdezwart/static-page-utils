import { readFileSync } from "fs";
import { getCssPrefixer } from "./util/prefixer";

export const importCss =
  (prefixCss: ReturnType<typeof getCssPrefixer>) => async (path: string) =>
    /* html */ `
    <style>
      ${await prefixCss(readFileSync(path, "utf-8"))}
    </style>
    `;
