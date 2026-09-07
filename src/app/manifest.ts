import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name:"سبورتي | Saboraty", short_name:"Saboraty", description:"سبورتي | Saboraty — إدارة السنتر والمدرس مع مسار مستقل لمنصة الكورسات الأونلاين", start_url:"/", display:"standalone", background_color:"#f6f5fb", theme_color:"#6547d9", lang:"ar", dir:"rtl", icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}] };
}
