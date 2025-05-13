import { existsSync, mkdirSync, readFileSync } from "fs";
import imageSize from "image-size";
import mime from "mime";
import { join, parse, resolve as resolvePath } from "path";
import { Settings } from "../settings.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";

const standardImageDimensions = [640, 960, 1280, 1920, 2560, 3840];
const defaultExtensions = ["jpg", "webp"];

const imageScales = new Map<number, [number, number, number, number, number]>([
  [640, [640, 960, 1280, 1920, 1920]],
  [960, [960, 1920, 1920, 2560, 3840]],
  [1280, [1280, 1920, 2560, 3840, 3840]],
  [1920, [1920, 2560, 3840, 3840, 3840]],
  [2560, [2560, 3840, 3840, 3840, 3840]],
  [3840, [3840, 3840, 3840, 3840, 3840]],
]);

export type ImportImageOptions = {
  widthRatio?: number;
  heightRatio?: number;
  quality?: number;
  id?: string;
  classes?: string[];
  alt: string;
  extensions?: string[];
  forceSize?: boolean;
};

export const importImg =
  (settings: Settings) => (filePath: string, options: ImportImageOptions) =>
    new Promise<string>(async (resolve) => {
      settings.logger("debug", `Importing JPG: ${filePath}`);

      if (options.extensions === undefined) {
        options.extensions = defaultExtensions;
      }

      // Get width, height & aspect ratio of image.
      const { width, height } = imageSize(readFileSync(filePath));
      const aspectRatio = width / height;

      if (
        options.widthRatio === undefined &&
        options.heightRatio === undefined
      ) {
        options.widthRatio = 1;
        options.heightRatio = 1;
      } else if (
        options.widthRatio === undefined &&
        options.heightRatio !== undefined
      ) {
        options.widthRatio = aspectRatio * options.heightRatio;
      } else if (
        options.widthRatio !== undefined &&
        options.heightRatio === undefined
      ) {
        options.heightRatio = options.widthRatio / aspectRatio;
      }

      const imageDimensions = standardImageDimensions.map(
        (el) => el * options.widthRatio!
      );
      const inputFilePath = resolvePath(filePath);
      const filePathHash = createHash("md5")
        .update(inputFilePath)
        .digest("hex");
      const outputName = `${filePathHash}-${options.widthRatio}`;
      const webroot = resolvePath(settings.webroot);
      const resDir = join(webroot, "res");

      // Create output directory, if needed.
      if (!existsSync(resDir)) {
        mkdirSync(resDir, { recursive: true });
        settings.logger("info", `Created directory: ${resDir}`);
      }

      // Called when all images have been processed.
      const finish = () => {
        const createURL = (size: number, extension: string) =>
          encodeURI(
            `/res/${outputName}-${size.toFixed()}.${extension}?cache-age=604800`
          );

        const createSource = (size: number, extension: string) => {
          const sizes = imageScales.get(size)!;

          const url1x = createURL(sizes[0], extension);
          const url1_5x = createURL(sizes[1], extension);
          const url2x = createURL(sizes[2], extension);
          const url2_5x = createURL(sizes[3], extension);
          const url3x = createURL(sizes[4], extension);

          return /* html */ `
          <source type="${mime.getType(
            extension
          )}" media="(max-width: ${size}px)"
            srcset="${url1x} ${size}w, ${url1_5x} 1.5x, ${url2x} 2x, ${url2_5x} 2.5x, ${url3x} 3x">
          `;
        };

        resolve(/* html */ `
        <picture>
          ${createSource(640, "webp")}
          ${createSource(640, "jpg")}
          ${createSource(960, "webp")}
          ${createSource(960, "jpg")}
          ${createSource(1280, "webp")}
          ${createSource(1280, "jpg")}
          ${createSource(1920, "webp")}
          ${createSource(1920, "jpg")}
          ${createSource(2560, "webp")}
          ${createSource(2560, "jpg")}
          ${createSource(3840, "webp")}
          ${createSource(3840, "jpg")}
          <img src="${createURL(640, "jpg")}"
            alt="${options.alt}" ${
          options.id == null ? "" : `id="${options.id}"`
        }
            ${
              options.classes === undefined || options.classes.length == 0
                ? ""
                : `class="${options.classes.join(" ")}"`
            }>
        </picture>
        `);
      };

      // Check if the images have already been processed.
      let imagesAlreadyProcessed = true;

      const outputFile = join(resDir, outputName);
      for (const standardDimension of standardImageDimensions) {
        const outputFileWithDim = `${outputFile}-${standardDimension}`;
        if (
          !options.extensions.every((ext) =>
            existsSync(`${outputFileWithDim}.${ext}`)
          )
        ) {
          imagesAlreadyProcessed = false;
          break;
        }
      }

      if (imagesAlreadyProcessed) {
        settings.logger("debug", `Images already processed: ${filePath}`);
        finish();
        return;
      }

      // Process all images and then resolve the html.
      for (let i = 0; i < imageDimensions.length; i++) {
        const dimension = imageDimensions[i];
        const standardDimension = standardImageDimensions[i];
        const outputFileWithDim = `${outputFile}-${standardDimension}`;

        await compressImage(
          settings,
          options.quality,
          options.forceSize,
          options.extensions,
          filePath,
          outputFileWithDim,
          dimension,
          aspectRatio
        );
      }

      finish();
    });

export const compressImage = async (
  settings: Settings,
  quality: number | undefined,
  forceSize: boolean | undefined,
  extensions: string[],
  inputPath: string,
  outputFileWithoutExt: string,
  dimension: number,
  aspectRatio: number
) => {
  inputPath = resolvePath(inputPath);

  quality ??= 65;
  const width = dimension;
  const height = Math.round(dimension / aspectRatio);

  const args = [
    inputPath,
    "-strip",
    "-interlace",
    "Plane",
    "-sampling-factor",
    "4:2:0",
    "-quality",
    quality.toString(),
  ];

  if (forceSize) {
    args.push("-resize", `${width}x${height}^`);
    args.push("-gravity", "Center");
    args.push("-extent", `${width}x${height}`);
  } else {
    args.push("-resize", `${width}x${height}>`);
  }

  await Promise.all(
    extensions.map(async (ext) => {
      const outputPath = `${outputFileWithoutExt}.${ext}`;
      try {
        await promisify(execFile)("magick", [...args, outputPath]);
        settings.logger(
          "info",
          `Processed image: ${inputPath} -> ${outputPath}`
        );
      } catch (err) {
        settings.logger(
          "error",
          `Error processing image: ${inputPath}\n${err}`
        );
        throw err;
      }
    })
  );
};
