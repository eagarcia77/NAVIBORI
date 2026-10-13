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
          3,"#ebe4d9",7,"#d9cfc3",10,"#c7c2ba",15,"#b4c1c7",40,"#92a8af"],
        ["interpolate",["linear"],["coalesce",["to-number",["get","height"],null],9],
          3,"#d5dedb",8,"#a9c1be",15,"#7da8b4",40,"#5d8c9d"]
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
