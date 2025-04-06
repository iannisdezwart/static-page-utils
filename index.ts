import gm from "gm";
import { LRUCache } from "lru-cache";
import { importExternalCss } from "./css/import-external";
import { importGoogleFont } from "./font/import-google";
import { importImg } from "./img/import";
import { Settings } from "./settings";
import { importSvg } from "./svg/import";
import { svgAsDataString } from "./svg/as-data-string";
import { linkResource } from "./res/link";
import { getCssPrefixer } from "./css/util/prefixer";
import { importCss } from "./css/import";
import { importCssOnce } from "./css/import-once";
import { importSass } from "./sass/import";
import { importSassOnce } from "./sass/import-once";
import { importJs } from "./js/import";
import { importJsOnce } from "./js/import-once";
import { importExternalJs } from "./js/import-external";
import { importExternalJsOnce } from "./js/import-external-once";
import { makePageShell } from "./page-shell/page-shell";
import { createPwaManifest } from "./pwa/create-manifest";
import { importPwaServiceWorker } from "./pwa/import-service-worker";

export type StaticPageUtils = {
  font: {
    importGoogle: ReturnType<typeof importGoogleFont>;
  };
  css: {
    import: ReturnType<typeof importCss>;
    importOnce: ReturnType<typeof importCssOnce>;
    importExternal: ReturnType<typeof importExternalCss>;
  };
  sass: {
    import: ReturnType<typeof importSass>;
    importOnce: ReturnType<typeof importSassOnce>;
  };
  js: {
    import: typeof importJs;
    importOnce: ReturnType<typeof importJsOnce>;
    importExternal: ReturnType<typeof importExternalJs>;
    importExternalOnce: ReturnType<typeof importExternalJsOnce>;
  };
  img: {
    import: ReturnType<typeof importImg>;
  };
  svg: {
    import: ReturnType<typeof importSvg>;
    asDataString: ReturnType<typeof svgAsDataString>;
  };
  res: {
    link: ReturnType<typeof linkResource>;
  };
  shell: {
    make: ReturnType<typeof makePageShell>;
  };
  pwa: {
    createManifest: ReturnType<typeof createPwaManifest>;
    importPwaServiceWorker: ReturnType<typeof importPwaServiceWorker>;
  };
};

export const staticPageUtils = (settings: Settings) => {
  const memCache = new LRUCache<string, string>({
    maxSize: 100 * 1024 * 1024, // 100 MB
    sizeCalculation: (value) => value.length,
  });
  const imageMagick = gm.subClass({ imageMagick: true });
  const cssPrefixer = getCssPrefixer(settings);

  let obj: StaticPageUtils = {} as unknown as StaticPageUtils;
  Object.assign<StaticPageUtils, StaticPageUtils>(obj, {
    font: {
      importGoogle: importGoogleFont(settings, obj),
    },
    css: {
      import: importCss(cssPrefixer),
      importOnce: importCssOnce(settings, obj),
      importExternal: importExternalCss(settings, memCache),
    },
    sass: {
      import: importSass(settings, cssPrefixer),
      importOnce: importSassOnce(settings, obj),
    },
    js: {
      import: importJs,
      importOnce: importJsOnce(settings),
      importExternal: importExternalJs(settings, memCache),
      importExternalOnce: importExternalJsOnce(settings, obj),
    },
    img: {
      import: importImg(settings, imageMagick),
    },
    svg: {
      import: importSvg(settings),
      asDataString: svgAsDataString(settings),
    },
    res: {
      link: linkResource(settings),
    },
    shell: {
      make: makePageShell(settings, imageMagick),
    },
    pwa: {
      createManifest: createPwaManifest(settings, imageMagick),
      importPwaServiceWorker: importPwaServiceWorker(settings),
    },
  });

  return obj;
};
