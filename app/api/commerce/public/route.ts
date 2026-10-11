import {NextResponse} from "next/server";
import {getPublicCommerce} from "@/lib/commerce/public-data";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const businesses=await getPublicCommerce();

    return NextResponse.json(
      {
        businesses,
        fetchedAt:new Date().toISOString()
      },
      {
        headers:{
          "Cache-Control":"no-store, max-age=0",
          "X-Robots-Tag":"noindex"
        }
      }
    );
  }catch{
    return NextResponse.json(
      {
        error:"Public commerce refresh unavailable."
      },
      {
        status:503,
        headers:{
          "Cache-Control":"no-store, max-age=0",
          "X-Robots-Tag":"noindex"
        }
      }
    );
  }
}
