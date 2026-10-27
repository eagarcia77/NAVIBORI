import {NextResponse} from "next/server";
import {currentVerifiedPromotions} from "@/lib/commerce/verified-promotions";
import {getPublicCommerce} from "@/lib/commerce/public-data";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const businesses=await getPublicCommerce();

    const specials=businesses.flatMap((business)=>
      currentVerifiedPromotions(business).map((promotion)=>({
        id:promotion.id,
        title:promotion.title,
        description:promotion.description,
        startsAt:promotion.startsAt ?? null,
        businessName:business.name,
        url:"/comercios/"+encodeURIComponent(business.slug)
      }))
    );

    specials.sort((a,b)=>{
      const aTime=a.startsAt ? Date.parse(a.startsAt) : 0;
      const bTime=b.startsAt ? Date.parse(b.startsAt) : 0;
      return bTime-aTime;
    });

    return NextResponse.json(
      {special:specials[0] ?? null},
      {headers:{"Cache-Control":"no-store, max-age=0"}}
    );
  }catch{
    return NextResponse.json(
      {special:null},
      {headers:{"Cache-Control":"no-store, max-age=0"}}
    );
  }
}
