import { existsSync, mkdirSync, readFileSync } from "fs";
import imageSize from "image-size";
import { join, parse, resolve as resolvePath } from "path";
import { Settings } from "../settings";
import mime from "mime";
import { SubClass } from "gm";

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
  (settings: Settings, imageMagick: SubClass) =>
  (filePath: string, options: ImportImageOptions) =>
    new Promise<string>(async (resolve) => {
      settings.logger("debug", `Importing JPG: ${filePath}`);

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
        (el) => el * (options.widthRatio!)
      );
      const inputFilePath = resolvePath(filePath);
      const inputFileDir = parse(inputFilePath).name;
      const fileName = parse(inputFilePath).name;
      const outputFilename = `${fileName}-${options.widthRatio}`;
      const webroot = resolvePath(settings.webroot);
      const outputDir = join(webroot, "res", inputFileDir);

      // Create output directory, if needed.
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
        settings.logger("info", `Created directory: ${outputDir}`);
      }

      // Called when all images have been processed.
      const finish = () => {
        const createURL = (size: number, extension: string) =>
          encodeURI(
            `/res/${inputFileDir}/${outputFilename}-${size.toFixed()}.${extension}?cache-age=604800`
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

      for (const standardDimension of standardImageDimensions) {
        const outputPath = `${outputDir}/${outputFilename}-${standardDimension}`;
        if (
          !existsSync(outputPath + ".jpg") &&
          !existsSync(outputPath + ".webp")
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
        const outputPath = `${outputDir}/${outputFilename}-${standardDimension}`;

        await compressImage(
          settings,
          imageMagick,
          filePath,
          outputPath,
          dimension,
          aspectRatio,
          options
        );
      }

      finish();
    });

export const compressImage = (
  settings: Settings,
  imageMagick: SubClass,
  path: string,
  outputFileWithoutExt: string,
  dimension: number,
  aspectRatio: number,
  options: ImportImageOptions
) =>
  new Promise<void>((resolvePromise) => {
    const imageState = imageMagick(path);

    if (options.forceSize) {
      imageState
        .resize(dimension, dimension / aspectRatio, "^")
        .gravity("Center")
        .extent(dimension, dimension / aspectRatio);
    } else {
      imageState.resize(dimension, dimension / aspectRatio, ">");
    }

    imageState
      .quality(options.quality ?? 65)
      .strip()
      .interlace("Plane")
      .samplingFactor(4, 2);

    let finishedImages = 0;

    const imageWriteCallback = (path: string) => (err: Error | null) => {
      if (err !== null) {
        console.error("error while converting image:", err);
        throw err;
      }

      settings.logger("info", `Processed image: ${path}`);

      finishedImages++;
      if (finishedImages == (options.extensions ?? defaultExtensions).length) {
        resolvePromise();
      }
    };

    for (const ext of options.extensions ?? defaultExtensions) {
      imageState.write(
        outputFileWithoutExt + "." + ext,
        imageWriteCallback(outputFileWithoutExt + "." + ext)
      );
    }
  });
