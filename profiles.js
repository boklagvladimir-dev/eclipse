function buildProfiles(){
 const result={};
 for(const item of languageItems){
  const loc=new Intl.Locale(item.code),region=loc.region||loc.maximize().region,geo=REGION_DATA[region];
  if(geo)result[item.code]={...geo,locale:item.code,languages:languageChain(item.code,true),region};
 }
 return result;
}
const REGION_PROFILES=buildProfiles();
