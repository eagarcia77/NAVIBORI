import {NextResponse} from "next/server";
import {getPublicCommerce} from "@/lib/commerce/public-data";
import {toCarPlayDestinations} from "@/lib/carplay/destinations";

export const dynamic="force-dynamic";

/** Read-only public feed: only active, live, fully verified destinations.
 * Never include administrative metadata, promotions or mock merchants.
 */
export async function GET(){
  try{
    const businesses=await getPublicCommerce();
    const destinations=toCarPlayDestinations(businesses);
    return NextResponse.json({destinations},{
      headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex"}
    });
  }catch{
    return NextResponse.json({error:"No se pudieron consultar los destinos NAVIBORI."},{
      status:503,headers:{"Cache-Control":"no-store"}
    });
  }
}
