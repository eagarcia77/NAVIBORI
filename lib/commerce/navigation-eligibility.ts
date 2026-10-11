import {validRouteCoordinate} from "./directions";
import type {CommerceProfile} from "./types";

export type CommerceMapSource="live"|"demo";

export function canNavigateCommerce(
  business:CommerceProfile|null|undefined,
  source:CommerceMapSource
){
  if(!business?.mapLocation) return false;
  if(!validRouteCoordinate(business.mapLocation)) return false;

  if(source==="demo"){
    return business.demo===true;
  }

  return (
    business.demo===false &&
    business.verifiedLocation===true &&
    business.mapLocation.verified===true
  );
}
