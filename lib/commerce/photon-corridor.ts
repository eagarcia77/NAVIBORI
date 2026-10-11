export type PhotonGradientExpression=Array<
  string|number|Array<string>
>;

export function clampRouteProgress(value:number|null|undefined){
  if(typeof value!=="number" || !Number.isFinite(value)) return 0;
  return Math.max(0,Math.min(1,value));
}

export function buildPhotonRouteGradient(
  progressRatio:number|null|undefined,
  activeColor:string,
  traveledColor="#7b8794"
):PhotonGradientExpression{
  const progress=clampRouteProgress(progressRatio);

  if(progress<=0.01){
    return [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      activeColor,
      1,
      activeColor
    ];
  }

  if(progress>=0.99){
    return [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      traveledColor,
      0.985,
      traveledColor,
      1,
      "#ffffff"
    ];
  }

  const before=Math.max(0.001,progress-0.018);
  const after=Math.min(0.999,progress+0.018);

  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0,
    traveledColor,
    before,
    traveledColor,
    progress,
    "#ffffff",
    after,
    activeColor,
    1,
    activeColor
  ];
}
