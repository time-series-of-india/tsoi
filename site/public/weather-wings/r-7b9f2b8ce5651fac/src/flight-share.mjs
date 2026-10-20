import {CLIMATE_CITIES,DEFAULT_CITY} from './climate-cities.mjs';
import {getBirdProfile} from './birds.mjs';
import {encodeFlightShare,decodeFlightShare} from './flight-share-config.mjs';
import {HOOP_DEFAULTS,normalizeHoops} from './temperature-hoop-settings.mjs';

export function flightShareUrl(href,options){
 const url=new URL(href);if(!['http:','https:'].includes(url.protocol))throw Error('Sharing requires a web address.');
 url.username='';url.password='';url.search='';url.hash='';
 const token=encodeFlightShare(options);
 if(decodeFlightShare(token).flightMode==='custom')url.searchParams.set('s',token);
 return url.href;
}
export function flightShareModel({href,city,bird,metric='rainfall',state=null,flightMode='default',flight,hoops,hoopMode}){
 const place=CLIMATE_CITIES[city]??CLIMATE_CITIES[DEFAULT_CITY],profile=getBirdProfile(bird),temperature=metric==='temperature';
 const mode=temperature?'Between Degrees':'The Shape of Rain';
 const custom=temperature?(hoopMode?hoopMode==='custom':Object.entries(normalizeHoops(hoops)).some(([key,value])=>value!==HOOP_DEFAULTS[key])):flightMode==='custom';
 const count=Number.isSafeInteger(state?.passed)&&state.passed>=0?state.passed:0;
 const skips=Number.isSafeInteger(state?.skipped)&&state.skipped>=0?state.skipped:0;
 const endless=state?.mode==='endless';
 const score=state?(temperature?`${count}${endless?'':' / 12'} hoops cleared · ${skips} skipped`:`${count}${endless?'':' / 12'} months cleared`):'';
 const detail=state?(endless?'Continuous flight':state.status==='completed'?'January–December flown':`Reached ${state.month??'January'}`):'Fly through India’s seasons.';
 const settings=custom?'Custom flight settings':'';
 const url=flightShareUrl(href,{city:place.id,metric,bird:profile.id,flightMode,flight,hoops,hoopMode});
 const text=['Weather Wings · '+mode,place.name+' · '+profile.name,score,detail,settings,url].filter(Boolean).join('\n');
 return {title:'Weather Wings',mode,city:place,bird:profile,score,detail,settings,url,text,state:state?{...state}:null};
}
// Keep cancellation separate from failures so dismissing a share sheet has no side effect.
export async function nativeFlightShare(navigator,payload){
 if(typeof navigator.share!=='function')return 'unavailable';
 try{await navigator.share(payload);return 'shared'}catch(error){return error?.name==='AbortError'?'cancelled':'failed'}
}
export async function shareOrCopy(navigator,payload,text,copy){
 const outcome=await nativeFlightShare(navigator,payload);
 if(outcome==='shared'||outcome==='cancelled')return outcome;
 return await copy(text)?'copied':'failed';
}
