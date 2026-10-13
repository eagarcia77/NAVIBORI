/**
 * NovaScene 2.4: compute a short, accurate highlighted corridor ahead of the
 * current navigation progress. Visual only: original directions and GPS fixes
 * remain the authoritative sources of route progress.
 */
export type LonLat=[number,number];
const EARTH_RADIUS=6371008.8;
const RAD=Math.PI/180;

export function geoSegmentMeters(a:LonLat,b:LonLat){
  const dLat=(b[1]-a[1])*RAD;
  const dLon=(b[0]-a[0])*RAD;
  const sinLat=Math.sin(dLat/2);
  const sinLon=Math.sin(dLon/2);
  const h=sinLat*sinLat+
    Math.cos(a[1]*RAD)*Math.cos(b[1]*RAD)*sinLon*sinLon;
  return 2*EARTH_RADIUS*Math.asin(Math.min(1,Math.sqrt(Math.max(0,h))));
}

/** Interpolates both ends of a section, never cutting across road bends. */
export function nextRouteCorridor(
  geometry:number[][],
  progressRatio:number,
  maxAheadMeters=145
):LonLat[]{
  if(geometry.length<2 || !Number.isFinite(progressRatio))return [];
  const coords=geometry.filter(c=>c.length>=2 && Number.isFinite(c[0]) &&
    Number.isFinite(c[1]) && Math.abs(c[0])<=180 && Math.abs(c[1])<=90
  ).map(c=>[c[0],c[1]] as LonLat);
  if(coords.length<2)return [];
  const lengths=coords.slice(1).map((item,i)=>geoSegmentMeters(coords[i],item));
  const total=lengths.reduce((sum,len)=>sum+len,0);
  if(total<=0.1)return [];
  const start=Math.min(total,Math.max(0,progressRatio)*total);
  const finish=Math.min(total,start+Math.max(0,Math.min(300,maxAheadMeters)));
  if(finish-start<0.5)return [];
  const points:LonLat[]=[];
  let traveled=0;
  for(let i=0;i<lengths.length;i++){
    const segmentLength=lengths[i];
    const end=traveled+segmentLength;
    if(segmentLength<0.05){
      traveled=end;
      continue;
    }
    if(end>=start && traveled<=finish){
      const firstFraction=Math.max(0,Math.min(1,(start-traveled)/segmentLength));
      const lastFraction=Math.max(0,Math.min(1,(finish-traveled)/segmentLength));
      const at=(fraction:number):LonLat=>[
        coords[i][0]+(coords[i+1][0]-coords[i][0])*fraction,
        coords[i][1]+(coords[i+1][1]-coords[i][1])*fraction
      ];
      if(points.length===0)points.push(at(firstFraction));
      const last=at(lastFraction);
      const previous=points[points.length-1];
      if(geoSegmentMeters(previous,last)>0.01)points.push(last);
    }
    traveled=end;
    if(traveled>=finish)break;
  }
  return points.length>=2?points:[];
}

/** Only boost the camera slightly around a maneuver; respects mode zoom. */
export function nearTurnZoom(base:number,distanceMeters:number|null){
  if(!Number.isFinite(base))return 17;
  const safe=Math.max(8,Math.min(19,base));
  if(distanceMeters===null||!Number.isFinite(distanceMeters)||
    distanceMeters>=180)return safe;
  const fraction=distanceMeters<=35?1:(180-distanceMeters)/145;
  return Math.min(19,safe+0.3*Math.max(0,Math.min(1,fraction)));
}
