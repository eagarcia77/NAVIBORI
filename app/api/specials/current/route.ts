import {NextResponse} from "next/server";
import {getPublicCommerce} from "@/lib/commerce/public-data";
import {publishedSpecials} from "@/lib/commerce/specials-feed";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const id=new URL(request.url).searchParams.get("id");
  try{
    const specials=publishedSpecials(await getPublicCommerce(),id);
    return NextResponse.json({special:specials[0]??null},{headers:{"Cache-Control":"no-store, max-age=0"}});
  }catch{
    return NextResponse.json({special:null},{headers:{"Cache-Control":"no-store, max-age=0"}});
  }
}
