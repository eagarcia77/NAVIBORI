import type {FillExtrusionLayerSpecification} from "maplibre-gl";

/** Two client-side visualization styles for the same real geographic polygons.
 * Heights without measured values are illustrations, not measured buildings.
 */
export type NovaSceneAppearance="natural"|"digital";

export const ESTIMATED_HEIGHT_SCALE=0.66;
export const ESTIMATED_HEIGHT_MIN=3.4;
export const ESTIMATED_HEIGHT_MAX=7.2;

export function visualBuildingHeight(height:number,estimated:boolean,style:NovaSceneAppearance){
  const safe=Number.isFinite(height)?Math.max(3,Math.min(300,height)):9;
  if(!estimated||style==="digital")return safe;
  return Math.max(ESTIMATED_HEIGHT_MIN,
    Math.min(ESTIMATED_HEIGHT_MAX,safe*ESTIMATED_HEIGHT_SCALE));
}

/** MapLibre expressions share the exact same adjustment parameters as the
 * tested JS helper. No raw Overture building geometry is modified.
 */
const reportedHeight=["max",3,["coalesce",
  ["to-number",["get","height"],null],9]];

export function novaSceneHeightExpression(appearance:NovaSceneAppearance){
  if(appearance==="digital")return reportedHeight;
  return ["case",
    ["boolean",["get","estimated"],true],
    ["max",ESTIMATED_HEIGHT_MIN,
      ["min",ESTIMATED_HEIGHT_MAX,
        ["*",ESTIMATED_HEIGHT_SCALE,reportedHeight]]],
    reportedHeight];
}

export function novaSceneBuildingPaint(appearance:NovaSceneAppearance){
  const color=appearance==="natural"
    ? ["case",
        ["boolean",["get","estimated"],true],
        ["interpolate",["linear"],["coalesce",["to-number",["get","height"],null],9],
          3,"#ddd5c9",7,"#c4b9ab",10,"#b0a697",15,"#9ca9a8",40,"#718e96"],
        ["interpolate",["linear"],["coalesce",["to-number",["get","height"],null],9],
          3,"#c1d1cb",8,"#91ada8",15,"#638f99",40,"#467480"]
      ]
    : ["case",
        ["boolean",["get","estimated"],true],
        ["interpolate",["linear"],["coalesce",["to-number",["get","height"],null],9],
          5,"#bad9e6",7.5,"#99c3d6",10,"#75adc7",14,"#5a95b5",35,"#3f7c9e"],
        ["interpolate",["linear"],["coalesce",["to-number",["get","height"],null],9],
          5,"#a9d4db",8,"#77b7ca",14,"#4298b7",35,"#277495"]
      ];
  const height=novaSceneHeightExpression(appearance);
  const paint={
    "fill-extrusion-color":color,
    "fill-extrusion-height":["interpolate",["linear"],["zoom"],
      14.5,0,15.5,height],
    "fill-extrusion-base":["coalesce",["to-number",["get","base"]],0],
    "fill-extrusion-opacity":appearance==="natural"?0.92:0.94,
    "fill-extrusion-vertical-gradient":true
  };
  return paint as FillExtrusionLayerSpecification["paint"] & typeof paint;
}

/** Just before a turn, slightly flatten the 3D camera to expose the junction.
 * Never changes route calculations, user coordinates, heading or GPS data.
 */
export function approachTurnPitch(basePitch:number,distanceMeters:number|null){
  const base=Math.max(43,Math.min(60,Number.isFinite(basePitch)?basePitch:53));
  if(distanceMeters===null||!Number.isFinite(distanceMeters))return base;
  if(distanceMeters>=180)return base;
  if(distanceMeters<=40)return Math.min(base,46);
  const ratio=(distanceMeters-40)/140;
  const near=Math.min(base,46);
  return near+(base-near)*ratio;
}


/** Thin roof caps at high street zoom provide a separate roof tint without
 * modifying measured Overture geometry or using heavyweight 3D assets.
 * Added only above z17.2 to keep mobile overview rendering efficient.
 */
export function novaSceneRoofPaint(appearance:NovaSceneAppearance){
  const height=novaSceneHeightExpression(appearance);
  const color=appearance==="natural"
    ? ["case",["boolean",["get","estimated"],true],"#e9e0d1","#bdd7cf"]
    : ["case",["boolean",["get","estimated"],true],"#b8e2f0","#83c8e4"];
  return {
    "fill-extrusion-color":color,
    "fill-extrusion-base":["max",0,["-",height,0.22]],
    "fill-extrusion-height":["+",height,0.025],
    "fill-extrusion-opacity":appearance==="natural"?0.93:0.91,
    "fill-extrusion-vertical-gradient":false
  } as unknown as NonNullable<FillExtrusionLayerSpecification["paint"]>;
}
