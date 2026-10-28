import {describe,expect,it} from "vitest";
import {carNavigationStatus,validateCarNavigationPayload,type CarNavigationPayload} from "./car-navigation-contract";
const payload:CarNavigationPayload={
 destination:{id:"merchant-1",name:"Comercio",latitude:18.05,longitude:-66.5},
 maneuver:{instruction:"Gira a la derecha",distanceMeters:120},
 remainingMeters:2300,etaSeconds:420,routeCoordinates:[[-66.5,18.05],[-66.49,18.06]],isDemo:false
};
describe("CarPlay / Android Auto route contract",()=>{
 it("accepts a valid real route",()=>expect(carNavigationStatus(payload)).toBe("navigation"));
 it("discloses demo routes",()=>expect(carNavigationStatus({...payload,isDemo:true})).toBe("demo"));
 it("rejects missing route geometry",()=>expect(()=>validateCarNavigationPayload({...payload,routeCoordinates:[]})).toThrow());
 it("rejects invalid GPS coordinates",()=>expect(()=>validateCarNavigationPayload({...payload,destination:{...payload.destination,latitude:99}})).toThrow());
 it("rejects negative remaining distance",()=>expect(()=>validateCarNavigationPayload({...payload,remainingMeters:-1})).toThrow());
});
