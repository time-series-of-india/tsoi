import {validateTemperatures,temperatureY,temperatureAtY} from './temperature-course.mjs';
export const TARGET_LEAD=4,TARGET_PAIR_GAP=1.8,TARGET_MONTH_GAP=6.8,TARGET_MONTH_SPAN=TARGET_PAIR_GAP+TARGET_MONTH_GAP,TARGET_WINDOW=.32;
export const TARGET_FINISH=TARGET_LEAD+11*TARGET_MONTH_SPAN+TARGET_PAIR_GAP+TARGET_WINDOW+1;
export function targetRadius(height){return Math.max(18,Math.min(34,height*.045))}
export function createTemperatureTargetCourse(data){
 validateTemperatures(data);
 const targets=Array.from({length:24},(_,i)=>{const month=Math.floor(i/2),kind=i%2?'Maximum':'Minimum',temperature=data[i%2?'high':'low'][month];return {i,month,kind,temperature,y:temperatureY(temperature),time:TARGET_LEAD+month*TARGET_MONTH_SPAN+(i%2)*TARGET_PAIR_GAP,chartProgress:(TARGET_LEAD+month*TARGET_MONTH_SPAN+(i%2)*TARGET_PAIR_GAP)/TARGET_FINISH*12,result:'pending',resolvedAt:null}});
 const finish=TARGET_FINISH;
 let elapsed=0,score=0,status='running',lastSample=-1,trace=[];
 const progress=()=>Math.max(0,Math.min(12,(elapsed-TARGET_LEAD)/TARGET_MONTH_SPAN));
 const snapshot=(full=false)=>({elapsed,status,score,total:24,passed:status==='completed'?12:Math.floor(targets.filter(t=>t.result!=='pending').length/2),month:Math.min(11,Math.floor(progress())),progress:progress(),next:targets.find(t=>t.result==='pending'),freeFlight:targets.some(t=>t.kind==='Maximum'&&t.result!=='pending'&&elapsed>=t.time+TARGET_WINDOW&&elapsed<t.time+TARGET_MONTH_GAP-1.2),targets:full?targets.map(t=>({...t})):undefined,trace:full?trace.map(p=>({...p})):undefined});
 return {snapshot,get targets(){return targets.map(t=>({...t}))},
  step(dt,y,height=700,previousY=y){
   if(status!=='running'||!Number.isFinite(dt)||dt<=0)return;
   if(!trace.length)trace.push({progress:0,temperature:temperatureAtY(previousY)});
   const before=elapsed;elapsed=Math.min(finish,elapsed+dt);
   for(const target of targets){
    if(target.result!=='pending')continue;
    // Interpolate the bird at the nearest encounter time so a slow frame cannot skip a target.
    const encounter=Math.max(before,Math.min(elapsed,target.time));
    const t=(encounter-before)/(elapsed-before||1),birdY=previousY+(y-previousY)*t;
    const dx=(encounter-target.time)/TARGET_WINDOW,dy=(birdY-target.y)*height/targetRadius(height);
    if(dx*dx+dy*dy<=1){target.result='collected';target.resolvedAt=encounter;score++}
    else if(elapsed>target.time+TARGET_WINDOW){target.result='missed';target.resolvedAt=elapsed}
   }
   if(elapsed-lastSample>=.12||elapsed===finish){trace.push({progress:elapsed/finish*12,temperature:temperatureAtY(y)});lastSample=elapsed}
   if(elapsed>=finish)status='completed';
  }
 };
}
