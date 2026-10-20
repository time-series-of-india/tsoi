import {gaugeSpeed,TUNING_FIELDS} from './flight-tuning.mjs';
import {isPortraitPhone} from './flight-difficulty.mjs';
export const HOOP_FIELDS=Object.freeze([
 {key:'spacing',label:'Distance between hoops',min:4,max:24,step:.5,value:7,unit:'bird lengths',hint:'Measured from one hoop to the next.'},
 {key:'speed',label:'Bird speed',min:.5,max:24,step:.1,value:2.5,unit:'bird lengths/s',hint:'Faster flight gives you less time at the same spacing.'},
 {key:'flap',label:'Flap strength',min:.7,max:1.3,step:.05,value:1,unit:'×',hint:'Lift from each wingbeat.'},
 {key:'gravity',label:'Gravity',min:.7,max:1.3,step:.05,value:1,unit:'×',hint:'How strongly the bird falls.'},
]);
export const HOOP_DEFAULTS=Object.freeze(Object.fromEntries(HOOP_FIELDS.map(f=>[f.key,f.value])));
export const HOOP_PORTRAIT_DEFAULTS=Object.freeze({spacing:6.5,speed:3.3,flap:1,gravity:1});
export function defaultHoopSettings(viewport){return {...(isPortraitPhone(viewport)?HOOP_PORTRAIT_DEFAULTS:HOOP_DEFAULTS)}}
// Match rainfall travel in pixels per second, rounded down to a slider step.
export function hoopSpeedMaximum({width,height,birdWidth}){
 const field=HOOP_FIELDS.find(f=>f.key==='speed'),rainMax=TUNING_FIELDS.find(f=>f.key==='speed').max;
 return Number(Math.max(field.min,Math.min(field.max,Math.floor((gaugeSpeed(width,height)*rainMax/birdWidth+1e-9)/field.step)*field.step)).toFixed(1));
}
export function normalizeHoops(input={}){return Object.fromEntries(HOOP_FIELDS.map(f=>{const raw=input?.[f.key],n=Number(raw);return [f.key,raw==null||raw===''||!Number.isFinite(n)?f.value:Number((Math.round(Math.max(f.min,Math.min(f.max,n))/f.step)*f.step).toFixed(2))]}))}
export function hoopSettingsUrl(href,input,mode='custom'){const url=new URL(href),s=normalizeHoops(input);url.searchParams.delete('collect');if(mode==='default'){url.searchParams.delete('hoops');url.searchParams.set('hoopPreset','default')}else{url.searchParams.delete('hoopPreset');url.searchParams.set('hoops',HOOP_FIELDS.map(f=>s[f.key]).join(','))}return url.href}
export function hoopSettingsText(href,input){const s=normalizeHoops(input),url=new URL(hoopSettingsUrl(href,s));url.searchParams.delete('start');return ['Weather Wings · Between Degrees',...HOOP_FIELDS.map(f=>`${f.label}: ${s[f.key]} ${f.unit}`),'',url.href].join('\n')}
export function createHoopSettings(href,storage,viewport=()=>({})){
 let saved;try{saved=JSON.parse(storage?.getItem('tsoi-temperature-hoops-v2')||'null')}catch{}
 const params=new URL(href).searchParams,encoded=params.get('hoops');
 const legacyDefault=saved&&!saved.mode&&HOOP_FIELDS.every(f=>saved[f.key]===HOOP_DEFAULTS[f.key]);
 let mode=encoded!==null?'custom':params.get('hoopPreset')==='default'||!saved||saved.mode==='default'||legacyDefault?'default':'custom';
 let value=normalizeHoops(encoded===null?(saved?.values??saved):Object.fromEntries(HOOP_FIELDS.map((f,i)=>[f.key,encoded.split(',')[i]])));
 return {get mode(){return mode},get value(){return mode==='default'?defaultHoopSettings(viewport()):{...value}},save(input,nextMode='custom'){mode=nextMode==='default'?'default':'custom';value=normalizeHoops(input);try{storage?.setItem('tsoi-temperature-hoops-v2',JSON.stringify({mode,values:value}))}catch{}return this.value}};
}
export function localHoopSettings(href){let storage;try{storage=window.localStorage}catch{}return createHoopSettings(href,storage,()=>({width:innerWidth,height:innerHeight}))}
