/** Translate common routing-engine maneuver prefixes while preserving street names. */
const rules=[
 [/^Turn (slightly )?left onto /i,["Gira ligeramente a la izquierda en ","Gira a la izquierda en "]],
 [/^Turn (slightly )?right onto /i,["Gira ligeramente a la derecha en ","Gira a la derecha en "]],
 [/^Turn left onto /i,["Gira a la izquierda en "]],
 [/^Turn right onto /i,["Gira a la derecha en "]],
 [/^Continue (straight )?onto /i,["Continúa recto por ","Continúa por "]],
 [/^Continue straight/i,["Continúa recto"]],
 [/^Make a U-turn/i,["Haz un cambio de sentido"]],
 [/^You have arrived at your destination/i,["Has llegado a tu destino"]]
];
export function localizeManeuver(instruction:string,language:"es"|"en"){
 if(language!=="es"||typeof instruction!=="string")return instruction;
 for(const [pattern,variants] of rules){
   const match=instruction.match(pattern);
   if(match){
     const replacement=variants.length===2?(match[1]?variants[0]:variants[1]):variants[0];
     return instruction.replace(pattern,replacement);
   }
 }
 return instruction;
}
