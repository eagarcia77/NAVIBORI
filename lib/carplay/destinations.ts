import {isPuertoRicoCoordinate} from "@/lib/commerce/in-map-routing";
import {canHandoffCommerceDirections} from "@/lib/commerce/navigation-eligibility";
import type {CommerceProfile} from "@/lib/commerce/types";

/** The native vehicle display must never use mock, pending or unverified coordinates. */
export interface CarPlayDestination {
  id:string;
  name:string;
  category:string;
  address:string;
  latitude:number;
  longitude:number;
}
export function toCarPlayDestinations(businesses:CommerceProfile[]):CarPlayDestination[]{
  return businesses
    .filter(business=>canHandoffCommerceDirections(business,"live"))
    .filter(business=>isPuertoRicoCoordinate(business.mapLocation!))
    .map(business=>({
      id:business.id,
      name:business.name,
      category:business.category,
      address:business.mapLocation!.address || business.locationLabel,
      latitude:business.mapLocation!.latitude,
      longitude:business.mapLocation!.longitude
    }));
}
