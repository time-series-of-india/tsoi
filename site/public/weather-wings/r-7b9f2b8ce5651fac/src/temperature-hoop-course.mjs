import {validateTemperatures,temperatureY} from './temperature-course.mjs';
import {HOOP_DEFAULTS,normalizeHoops} from './temperature-hoop-settings.mjs';
export const HOOP_LEAD_DISTANCE=20,HOOP_BODY_HALF_LENGTH=.23,HOOP_RIM_WIDTH=2.4;
export const HOOP_LEAD=HOOP_LEAD_DISTANCE/HOOP_DEFAULTS.speed,HOOP_INTERVAL=HOOP_DEFAULTS.spacing/HOOP_DEFAULTS.speed,HOOP_FINISH=(HOOP_LEAD_DISTANCE+11*HOOP_DEFAULTS.spacing+2)/HOOP_DEFAULTS.speed;
export const usesTemperatureHoops=city=>['mumbai','delhi','bengaluru','kolkata','chennai'].includes(city);
// Return the first contact with a rim band within a clipped frame segment.
function rimContact(y0,y1,low,high){
 if(y0>=low&&y0<=high)return 0;
 if(y1===y0)return null;
 const a=(low-y0)/(y1-y0),b=(high-y0)/(y1-y0),enter=Math.max(0,Math.min(a,b)),exit=Math.min(1,Math.max(a,b));
 return enter<=exit?enter:null;
}
export function createTemperatureHoopCourse(data,input,{endless=false}={}){
 validateTemperatures(data);const settings=normalizeHoops(input),finish=(HOOP_LEAD_DISTANCE+11*settings.spacing+2)/settings.speed;
 const makeHoop=i=>{const month=i%12,low=data.low[month];return {i,month,low,high:data.high[month],upper:temperatureY(data.high[month]),lower:temperatureY(low),distance:HOOP_LEAD_DISTANCE+i*settings.spacing,time:(HOOP_LEAD_DISTANCE+i*settings.spacing)/settings.speed,result:'pending'}};
 let hoops=Array.from({length:12},(_,i)=>makeHoop(i)),nextIndex=12;
 function extend(to){while(hoops.at(-1).time<to+12*settings.spacing/settings.speed){hoops.push(makeHoop(nextIndex++))}}
 let elapsed=0,passed=0,skipped=0,status='running',failedHoop=null;
 const snapshot=(full=false)=>({elapsed,mode:endless?'endless':'city',distance:elapsed*settings.speed,status,passed,skipped,score:passed,total:12,progress:Math.max(0,Math.min(11,(elapsed*settings.speed-HOOP_LEAD_DISTANCE)/settings.spacing-(endless?Math.floor((passed+skipped)/12)*12:0))),month:failedHoop?.month??(endless?(passed+skipped)%12:Math.min(11,passed+skipped)),next:hoops.find(h=>h.result==='pending'),failedHoop:failedHoop?{...failedHoop}:null,hoops:full?hoops.map(h=>({...h})):undefined,targets:full?hoops.filter(h=>!endless||Math.floor(h.i/12)===Math.floor((passed+skipped)/12)).flatMap(h=>[{month:h.month,kind:'Minimum',temperature:h.low,result:h.result==='cleared'?'collected':h.result},{month:h.month,kind:'Maximum',temperature:h.high,result:h.result==='cleared'?'collected':h.result}]):undefined});
 return {settings,finish,snapshot,continueFlight(){if(status!=='completed')return false;endless=true;status='running';extend(elapsed);return true},get hoops(){return hoops.map(h=>({...h}))},step(dt,y,height=700,birdSize=42,previousY=y){
  if(status!=='running'||!Number.isFinite(dt)||dt<=0)return;
  const before=elapsed,end=endless?before+dt:Math.min(finish,before+dt),bodyRadius=birdSize*.14/height,rim=HOOP_RIM_WIDTH/height,halfTime=HOOP_BODY_HALF_LENGTH/settings.speed;
  if(endless)extend(end);
  for(const hoop of hoops){
   if(hoop.result!=='pending')continue;
   const entry=hoop.time-halfTime,exit=hoop.time+halfTime,from=Math.max(before,entry),to=Math.min(end,exit);
   if(from>to)continue;
   const y0=previousY+(y-previousY)*(from-before)/dt,y1=previousY+(y-previousY)*(to-before)/dt;
   // Both rims remain solid until the trailing body edge clears the hoop plane.
   const contacts=[rimContact(y0,y1,hoop.upper-bodyRadius-rim,hoop.upper+bodyRadius),rimContact(y0,y1,hoop.lower-bodyRadius,hoop.lower+bodyRadius+rim)].filter(t=>t!==null);
   if(contacts.length){hoop.result='missed';failedHoop=hoop;elapsed=from+Math.min(...contacts)*(to-from);status='crashed';return}
   if(end>=exit){if(y1>hoop.upper&&y1<hoop.lower){hoop.result='cleared';passed++}else{hoop.result='skipped';skipped++}}
  }
  elapsed=end;if(!endless&&elapsed>=finish)status='completed';if(endless)hoops=hoops.filter(h=>h.i>=Math.max(0,passed+skipped-12));
 }};
}
