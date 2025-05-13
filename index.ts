import { LRUCache } from "lru-cache";
import { importExternalCss } from "./css/import-external.js";
import { importCssOnce } from "./css/import-once.js";
import { importCss } from "./css/import.js";
import { getCssPrefixer } from "./css/util/prefixer.js";
import { importGoogleFont } from "./font/import-google.js";
import { importImg } from "./img/import.js";
import { importExternalJsOnce } from "./js/import-external-once.js";
import { importExternalJs } from "./js/import-external.js";
import { importJsOnce } from "./js/import-once.js";
import { importJs } from "./js/import.js";
import { makePageShell } from "./page-shell/page-shell.js";
import { createPwaManifest } from "./pwa/create-manifest.js";
import { importPwaServiceWorker } from "./pwa/import-service-worker.js";
import { linkResource } from "./res/link.js";
import { importSassOnce } from "./sass/import-once.js";
import { importSass } from "./sass/import.js";
import { Settings } from "./settings.js";
import { svgAsDataString } from "./svg/as-data-string.js";
import { importSvg } from "./svg/import.js";

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
      import: importImg(settings),
    },
    svg: {
      import: importSvg(settings),
      asDataString: svgAsDataString(settings),
    },
    res: {
      link: linkResource(settings),
    },
    shell: {
      make: makePageShell(settings),
    },
    pwa: {
      createManifest: createPwaManifest(settings),
      importPwaServiceWorker: importPwaServiceWorker(settings),
    },
  });

  return obj;
};
