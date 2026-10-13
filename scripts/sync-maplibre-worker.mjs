import {copyFileSync,existsSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";

// MapLibre GL JS 6 launches a dedicated ESM worker. Turbopack/Next.js
// cannot reliably infer its URL after transforming the main JS bundle.
// Copy the matching worker and its sibling import to NAVIBORI's own origin.
const source=resolve("node_modules/maplibre-gl/dist");
const destination=resolve("public/maplibre");
mkdirSync(destination,{recursive:true});
for(const file of ["maplibre-gl-worker.mjs","maplibre-gl-shared.mjs"]){
  const src=resolve(source,file);
  if(!existsSync(src)){
    throw new Error("Missing MapLibre v6 worker dependency: "+src);
  }
  copyFileSync(src,resolve(destination,file));
}
console.info("NovaScene: MapLibre ESM Web Worker and shared module installed at /maplibre/");
