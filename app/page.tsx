import NaviboriMap from "@/components/navibori-map";
import {DEMO_COMMERCE} from "@/lib/commerce/demo";
import {getPublicCommerce} from "@/lib/commerce/public-data";
import type {CommerceProfile} from "@/lib/commerce/types";

export default async function Home() {
  let liveBusinesses:CommerceProfile[]=[];

  try{
    liveBusinesses=await getPublicCommerce();
  }catch{
    liveBusinesses=[];
  }

  const usingLive=liveBusinesses.length>0;
  const businesses=usingLive ? liveBusinesses : DEMO_COMMERCE;

  return (
    <main className="navibori-full-map-page">
      <NaviboriMap
        businesses={businesses}
        source={usingLive ? "live" : "demo"}
        buildRevision={(process.env.RENDER_GIT_COMMIT || "local").slice(0,7)}
      />
    </main>
  );
}
