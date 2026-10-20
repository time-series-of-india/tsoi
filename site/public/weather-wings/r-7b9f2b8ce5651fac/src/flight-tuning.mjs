// Shared calibration bounds. Legacy orientation URL helpers remain below.
export const TUNING_FIELDS=Object.freeze([
 {key:'speed',label:'Gauge speed',min:.5,max:4,step:.05},
 {key:'spacing',label:'Obstacle spacing',min:.5,max:4,step:.025},
 {key:'opening',label:'Opening size',min:.4,max:1.5,step:.05},
 {key:'flap',label:'Flap strength',min:.6,max:1.5,step:.05},
 {key:'gravity',label:'Gravity',min:.6,max:1.6,step:.05},
]);
export const DEFAULT_TUNING=Object.freeze(Object.fromEntries(TUNING_FIELDS.map(({key})=>[key,1])));
export function normalizeTuning(input={}, {exact=false}={}){return Object.fromEntries(TUNING_FIELDS.map(({key,min,max,step})=>{const raw=input?.[key],n=Number(raw);return [key,raw==null||raw===''||!Number.isFinite(n)?1:exact?Math.max(min,Math.min(max,n)):Number((Math.round(Math.max(min,Math.min(max,n))/step)*step).toFixed(3))]}))}
// Larger views need a gentler sweep so moving readings remain trackable.
export function gaugeSpeed(width,height){return Math.max(105,Math.min(Math.min(width,height)>600?120:200,width*.28))}
export function tuningMetrics(width,height,input=DEFAULT_TUNING){const t=normalizeTuning(input),base=gaugeSpeed(width,height);return {speed:base*t.speed,distance:base*4.5*t.spacing,interval:4.5*t.spacing/t.speed,opening:height*.17*t.opening}}
export function readTuning(href){const url=new URL(href),enabled=url.searchParams.get('tune')==='1';return {enabled,...Object.fromEntries(['portrait','landscape'].map(mode=>{const values=enabled?(url.searchParams.get('tune-'+mode)||'').split(','):[];return [mode,normalizeTuning(Object.fromEntries(TUNING_FIELDS.map(({key},i)=>[key,values[i]])))]}))}}
export function tuningUrl(href,profiles){const url=new URL(href);url.searchParams.set('tune','1');url.searchParams.delete('start');for(const mode of ['portrait','landscape']){const t=normalizeTuning(profiles[mode]);url.searchParams.set('tune-'+mode,TUNING_FIELDS.map(({key})=>t[key]).join(','))}return url.href}
