import {DEFAULT_CITY} from './climate-cities.mjs';
import {normalizeFlightSettings} from './flight-settings.mjs';
import {HOOP_DEFAULTS,normalizeHoops} from './temperature-hoop-settings.mjs';

// These IDs, field order and integer units are the v1 wire format. Keep them
// stable when menus or sliders change. v2 adds rainfall movement and faster hoops.
const CITIES=Object.freeze(['bengaluru','mumbai','delhi','kolkata','chennai']);
const BIRDS=Object.freeze(['common-myna','wire-tailed-swallow','alexandrine-parakeet','indian-roller','white-throated-kingfisher','purple-rumped-sunbird']);
const V1_FIELDS=Object.freeze({
 rainfall:[['speed',500,4000,50],['spacing',500,4000,25],['opening',400,1500,50]],
 temperature:[['spacing',4000,24000,500],['speed',500,4000,100],['flap',700,1300,50],['gravity',700,1300,50]],
});
const FIELDS=Object.freeze({
 rainfall:[...V1_FIELDS.rainfall,['flap',600,1500,50],['gravity',600,1600,50]],
 temperature:V1_FIELDS.temperature.map(f=>f[0]==='speed'?['speed',500,24000,100]:f),
});

export function encodeFlightShare({city,bird,metric,flightMode='default',flight,hoops,hoopMode}){
 const cityIndex=CITIES.indexOf(CITIES.includes(city)?city:DEFAULT_CITY),birdIndex=BIRDS.indexOf(bird);
 const temperature=metric==='temperature',mode=temperature?'temperature':'rainfall';
 const values=temperature?normalizeHoops(hoops):normalizeFlightSettings(flight);
 const custom=temperature?(hoopMode?hoopMode==='custom':Object.entries(values).some(([key,value])=>value!==HOOP_DEFAULTS[key])):flightMode==='custom';
 const extended=temperature?values.speed>4:values.flap!==1||values.gravity!==1;
 const fields=(extended?FIELDS:V1_FIELDS)[mode],version=extended?'v2':'v1';
 const head=`${version}.${cityIndex}${temperature?'t':'r'}${birdIndex<0?1:birdIndex}${custom?'c':'d'}`;
 return head+(custom?'.'+fields.map(([key])=>Math.round(values[key]*1000).toString(36)).join('.'):'');
}

export function decodeFlightShare(token){
 if(typeof token!=='string'||token.length>48)return null;
 const match=/^v([12])\.([0-4])([rt])([0-5])([dc])((?:\.[0-9a-z]{1,3})*)$/.exec(token);
 if(!match)return null;
 const [,version,cityIndex,mode,birdIndex,kind,tail]=match,metric=mode==='t'?'temperature':'rainfall';
 const config={city:CITIES[cityIndex],metric,bird:BIRDS[birdIndex],flightMode:kind==='c'?'custom':'default'};
 if(kind==='d')return tail?null:{...config,...(metric==='temperature'?{hoops:{...HOOP_DEFAULTS}}:{})};
 const parts=tail.slice(1).split('.'),fields=(version==='1'?V1_FIELDS:FIELDS)[metric];
 if(parts.length!==fields.length)return null;
 const values={};
 for(let i=0;i<fields.length;i++){
  const [key,min,max,step]=fields[i],value=parseInt(parts[i],36);
  if(value<min||value>max||value%step!==0||value.toString(36)!==parts[i])return null;
  values[key]=value/1000;
 }
 return {...config,[metric==='temperature'?'hoops':'flight']:metric==='temperature'?values:normalizeFlightSettings(values)};
}

// Expand once before the game reads its normal URL settings. Existing city,
// mode and settings controls can then keep using the legacy URL helpers.
export function resolveFlightShareUrl(href){
 const url=new URL(href);
 if(!url.searchParams.has('s'))return url.href;
 const config=decodeFlightShare(url.searchParams.get('s'));
 url.searchParams.delete('s');
 if(!config)return url.href;
 url.search='';url.hash='';
 for(const key of ['city','metric','bird'])url.searchParams.set(key,config[key]);
 url.searchParams.set('difficulty',config.metric==='rainfall'&&config.flightMode==='custom'?'custom':'default');
 if(config.flight)url.searchParams.set('flight',FIELDS.rainfall.map(([key])=>config.flight[key]).join(','));
 // Preserve custom values, but resolve Default for the recipient's viewport.
 if(config.metric==='temperature'&&config.flightMode==='custom')url.searchParams.set('hoops',FIELDS.temperature.map(([key])=>config.hoops[key]).join(','));
 else url.searchParams.set('hoopPreset','default');
 return url.href;
}
