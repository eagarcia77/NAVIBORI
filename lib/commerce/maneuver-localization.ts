/** Translate common routing-engine maneuver prefixes while preserving street names. */
const rules:Array<[RegExp,string[]]>=[
 [/^Turn (slightly )?left onto /i,["Gira ligeramente a la izquierda en ","Gira a la izquierda en "]],
 [/^Turn (slightly )?right onto /i,["Gira ligeramente a la derecha en ","Gira a la derecha en "]],
 [/^Turn left onto /i,["Gira a la izquierda en "]],
 [/^Turn right onto /i,["Gira a la derecha en "]],
 [/^Continue (straight )?onto /i,["Continúa recto por ","Continúa por "]],
 [/^Continue straight/i,["Continúa recto"]],
 [/^At the roundabout, take the (first|second|third|fourth|fifth) exit(?: onto )?/i,["En la rotonda, toma la salida indicada hacia "]],
 [/^Enter the roundabout/i,["Entra en la rotonda"]],
 [/^Take the exit(?: toward| towards) /i,["Toma la salida hacia "]],
 [/^Merge slightly left onto /i,["Incorpórate ligeramente a la izquierda en "]],
 [/^Merge slightly right onto /i,["Incorpórate ligeramente a la derecha en "]],
 [/^Merge left onto /i,["Incorpórate a la izquierda en "]],
 [/^Merge right onto /i,["Incorpórate a la derecha en "]],
 [/^Merge onto /i,["Incorpórate a "]],
 [/^Keep left(?: to stay on )?/i,["Mantente a la izquierda por "]],
 [/^Keep right(?: to stay on )?/i,["Mantente a la derecha por "]],
 [/^Make a U-turn/i,["Haz un cambio de sentido"]],
 [/^You have arrived at your destination/i,["Has llegado a tu destino"]]
];
export function localizeManeuver(instruction:string,language:"es"|"en"){
 if(language!=="es"||typeof instruction!=="string")return instruction;
 for(const [pattern,variants] of rules){
   const match=instruction.match(pattern);
   if(match){
     if(pattern.source.startsWith("^At the roundabout")){
       const order:Record<string,string>={first:"primera",second:"segunda",third:"tercera",fourth:"cuarta",fifth:"quinta"};
       return instruction.replace(pattern,"En la rotonda, toma la "+(order[match[1].toLowerCase()]||"siguiente")+" salida hacia ");
     }
     const replacement=variants.length===2?(match[1]?variants[0]:variants[1]):variants[0];
     return instruction.replace(pattern,replacement);
   }
 }
 return instruction;
}
