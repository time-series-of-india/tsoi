// All cities use the same Celsius scale. Difficulty never changes the data band.
export const TEMPERATURE_SCALE=Object.freeze({min:0,max:45,top:.20,bottom:.82});
export const TEMPERATURE_LEAD_IN=4;
export const TEMPERATURE_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function validateTemperatures(data){
 if(!['low','high'].every(k=>Array.isArray(data[k])&&data[k].length===12&&data[k].every(Number.isFinite))||data.low.some((v,i)=>v>data.high[i]||v<0||data.high[i]>45))throw Error('Temperature normals are unavailable or outside the shared scale.');
 return data;
}
export function temperatureY(c){const s=TEMPERATURE_SCALE;return s.bottom-(c-s.min)/(s.max-s.min)*(s.bottom-s.top)}
export function temperatureAtY(y){const s=TEMPERATURE_SCALE;return s.min+(s.bottom-y)/(s.bottom-s.top)*(s.max-s.min)}
// Monthly values sit at month centres; the curves between them are visual interpolation.
export function temperatureBand(data,progress){
 const p=clamp(progress-.5,0,11),i=Math.floor(p),j=Math.min(11,i+1),t=p-i,f=t*t*(3-2*t);
 const low=data.low[i]+(data.low[j]-data.low[i])*f,high=data.high[i]+(data.high[j]-data.high[i])*f;
 return {low,high,upper:temperatureY(high),lower:temperatureY(low)};
}
export function temperatureRules(tuning={}){
 return {interval:clamp(6*(tuning.spacing||1)/(tuning.speed||1),3.5,14),allowance:clamp(5*(tuning.opening||1),2,7.5),grace:.3,recovery:.7};
}
export function createTemperatureCourse(data,tuning={}){
 validateTemperatures(data);const rules=temperatureRules(tuning);
 let elapsed=0,remaining=rules.allowance,outsideFor=0,insideTime=0,flightTime=0,status='running',lastSample=-1,trace=[];
 const progress=()=>elapsed>=TEMPERATURE_LEAD_IN+12*rules.interval?12:clamp((elapsed-TEMPERATURE_LEAD_IN)/rules.interval,0,12);
 const snapshot=(includeTrace=false)=>({status,elapsed,progress:progress(),passed:status==='completed'?12:Math.floor(progress()),month:Math.min(11,Math.floor(progress())),remaining,capacity:rules.allowance,outside:outsideFor>0,insideFraction:flightTime?insideTime/flightTime:1,trace:includeTrace?trace.map(p=>({...p})):undefined});
 return {rules,get progress(){return progress()},get band(){return temperatureBand(data,progress())},snapshot,
  step(dt,y){
   if(status!=='running'||!Number.isFinite(dt)||dt<=0)return;
   const before=elapsed;elapsed=Math.min(TEMPERATURE_LEAD_IN+12*rules.interval,elapsed+dt);
   const active=Math.max(0,elapsed-Math.max(before,TEMPERATURE_LEAD_IN)),band=this.band;
   const inside=y>=band.upper&&y<=band.lower;
   if(active){
    flightTime+=active;
    if(inside){insideTime+=active;remaining=Math.min(rules.allowance,remaining+active*rules.recovery);outsideFor=0}
    else{const previous=outsideFor;outsideFor+=active;remaining=Math.max(0,remaining-(Math.max(0,outsideFor-rules.grace)-Math.max(0,previous-rules.grace)))}
    if(elapsed-lastSample>=.12||progress()===12){trace.push({progress:progress(),temperature:temperatureAtY(y)});lastSample=elapsed}
   }
   if(remaining<=1e-9)status='crashed';else if(progress()>=12)status='completed';
  }
 };
}
