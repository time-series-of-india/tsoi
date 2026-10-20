import {SOUND_BIRDS} from './ambient-mix.mjs';
// Start the approved city defaults afresh after the temporary mixer trial.
export const SOUND_SETTINGS_KEY='weather-wings-mix-v2';
export const MIX_LAYERS={air:'Wind / air',sea:'Sea / surf',river:'River / water',rain:'Rain',thunder:'Thunder',selected:'Selected bird',background:'Background birds'};
export const MIX_CITIES={mumbai:'Mumbai',chennai:'Chennai',bengaluru:'Bengaluru / Cubbon Park',delhi:'Delhi',kolkata:'Kolkata'};
const levels=()=>Object.fromEntries(Object.keys(MIX_LAYERS).map(id=>[id,100]));
export function defaultSoundSettings(){return {version:1,master:80,layers:{...levels(),selected:140},birds:Object.fromEntries(SOUND_BIRDS.map(id=>[id,100])),cities:Object.fromEntries(Object.keys(MIX_CITIES).map(id=>[id,levels()])),timing:{selectedMin:28,selectedMax:53,backgroundMin:10,backgroundMax:26,thunderMin:1.8,thunderMax:3,thunderGap:18},scenes:{opening:100,menu:100,lesson:100,flight:100,paused:22,result:45},weather:{surroundingsReduction:50,backgroundBirdReduction:88,selectedBirdReduction:70},opening:{fadeStart:1.5,fadeDuration:6,birdCallAt:4.8,birdCall:true}}}
const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const number=(x,fallback,min,max)=>typeof x==='number'&&Number.isFinite(x)?Math.round(Math.max(min,Math.min(max,x))*100)/100:fallback;
export function normalizeSoundSettings(input){
 const x=object(input),d=defaultSoundSettings();
 d.master=number(x.master,d.master,0,100);
 for(const group of ['layers','birds','scenes','weather'])for(const key of Object.keys(d[group]))d[group][key]=number(object(x[group])[key],d[group][key],0,group==='scenes'||group==='weather'?100:200);
 for(const city of Object.keys(d.cities))for(const key of Object.keys(d.layers))d.cities[city][key]=number(object(object(x.cities)[city])[key],100,0,200);
 for(const key of Object.keys(d.timing)){const limit=key.startsWith('thunder')?{min:.1,max:60}:{min:2,max:180};d.timing[key]=number(object(x.timing)[key],d.timing[key],limit.min,limit.max)}
 for(const type of ['selected','background','thunder'])d.timing[type+'Max']=Math.max(d.timing[type+'Min'],d.timing[type+'Max']);
 const o=object(x.opening);d.opening.fadeStart=number(o.fadeStart,1.5,0,9);d.opening.fadeDuration=number(o.fadeDuration,6,.2,10);d.opening.birdCallAt=number(o.birdCallAt,4.8,4,9.5);d.opening.birdCall=typeof o.birdCall==='boolean'?o.birdCall:true;return d;
}
export function parseSoundSettings(text){const x=JSON.parse(text);if(!x||x.version!==1||!x.layers||!x.birds||!x.cities)throw Error('Paste a complete Weather Wings sound settings export (version 1).');return normalizeSoundSettings(x)}
export const exportSoundSettings=settings=>JSON.stringify(normalizeSoundSettings(settings),null,2);
export function soundMultiplier(settings,city,layer,bird){return (settings.layers[layer]??100)/100*(settings.cities[city]?.[layer]??100)/100*(bird?(settings.birds[bird]??100)/100:1)}
