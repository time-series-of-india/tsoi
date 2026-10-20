import {CLIMATE_CITIES} from './climate-cities.mjs';
const KEY='tsoi-climate-flight-progress-v1';
export function cleanProgress(input,metric='rainfall'){
 const result={version:1,cities:{}};
 for(const id of Object.keys(CLIMATE_CITIES)){
  const row=input?.cities?.[id];
  result.cities[id]={completed:row?.completed===true,best:Number.isSafeInteger(row?.best)&&row.best>=0?row.best:0};
  if(metric==='temperature'){result.cities[id].best=Math.min(12,result.cities[id].best);result.cities[id].perfect=row?.perfect===true}
 }
 return result;
}
export function recordFlight(progress,city,run,metric='rainfall'){
 const {passed,eligible}=run,next=cleanProgress(progress,metric);
 if(!Object.hasOwn(next.cities,city)||!eligible||!Number.isSafeInteger(passed)||passed<0)return next;
 // Continuous totals must not be mistaken for a twelve-hoop route score.
 if(metric==='temperature'&&run.mode==='endless')return next;
 const row=next.cities[city];
 row.best=Math.max(row.best,metric==='temperature'?Math.min(12,passed):passed);
 if(metric==='temperature'&&run.hoopTrial){
  if(run.status==='completed'){row.completed=true;if(passed===12&&run.skipped===0)row.perfect=true}
 }else if(passed>=12)row.completed=true;
 return next;
}
export function temperatureProgressLabel(row){
 if(row.perfect)return 'Perfect route · 12/12';
 if(row.completed)return `Route completed · Best ${row.best}/12`;
 return row.best?`Best ${row.best}/12`:'';
}
export function createProgressStore(storage,metric='rainfall'){
 const key=metric==='temperature'?'tsoi-temperature-flight-progress-v1':KEY;
 let available=Boolean(storage),value;
 try{value=JSON.parse(storage?.getItem(key)||'null')}catch{available=false}
 value=cleanProgress(value,metric);
 return {get value(){return cleanProgress(value,metric)},get persistent(){return available},get completedCount(){return Object.values(value.cities).filter(c=>c.completed).length},record(city,run){
  const next=recordFlight(value,city,run,metric);
  if(JSON.stringify(next)===JSON.stringify(value))return this.value;
  value=next;
  try{storage?.setItem(key,JSON.stringify(value))}catch{available=false}
  return this.value;
 }};
}
export function localProgressStore(metric='rainfall'){let storage;try{storage=window.localStorage}catch{}return createProgressStore(storage,metric)}

export function nextUnfinishedCity(current,progress){
 const ids=Object.keys(CLIMATE_CITIES),start=Math.max(0,ids.indexOf(current));
 for(let offset=1;offset<=ids.length;offset++){const id=ids[(start+offset)%ids.length];if(!progress.cities[id]?.completed)return id}
 return null;
}
