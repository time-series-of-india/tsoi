import {DEFAULT_TUNING,normalizeTuning,gaugeSpeed} from './flight-tuning.mjs';
export {gaugeSpeed} from './flight-tuning.mjs';
import {rainfallChartSvg,chartProgress,progressX} from './rainfall-chart.mjs';
import {getVisualTheme} from './visual-themes.mjs';
import {PAPER_SECTIONS} from './paper-scenery.mjs';
import {cityRoute} from './city-routes.mjs';
// Measured fill keeps a common baseline and scale; glass headroom shapes flight.
export const GATE_INTERVAL=4.5,LEAD_IN=6,RAIN_SCALE=.0016;
export const FLAP_IMPULSE=-.25,GRAVITY=.55;
export function stepRainfallFlight(y,vy,dt,gravity=1){const velocity=Math.min(.30,vy+GRAVITY*gravity*dt);return {y:y+velocity*dt,vy:velocity}};
export const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function columnTop(rain){return 1-rain*RAIN_SCALE}
export const GAUGE_HEADROOM=.012;
export function gaugeShape(_index,rain,opening=1){const water=columnTop(rain),lower=water-GAUGE_HEADROOM;return {water,lower,upper:lower-.17*opening}}
export function intersectsGauge(bird,gauge){return bird.x+bird.rx>gauge.x&&bird.x-bird.rx<gauge.x+gauge.width&&(bird.y-bird.ry<gauge.upper||bird.y+bird.ry>gauge.lower)}
export function followCamera(camera,y,dt){
 const screenY=y-camera;
 const target=screenY<.28?y-.28:screenY>.65?y-.65:camera;
 return camera+(Math.min(0,target)-camera)*(1-Math.exp(-dt*8));
}
export function intersectsColumn(bird,column){return bird.x+bird.rx>column.x&&bird.x-bird.rx<column.x+column.width&&bird.y+bird.ry>column.water&&bird.y-bird.ry<column.base}
export function createRainfallMode(data,resetBird,setWeather,onState=()=>{},initialTuning=DEFAULT_TUNING){
 let tuning=normalizeTuning(initialTuning);
 const interval=()=>GATE_INTERVAL*tuning.spacing/tuning.speed;
 const shapeFor=(index,rain)=>gaugeShape(index,rain,tuning.opening);
 const route=cityRoute(data.city?.id);
 const theme=getVisualTheme('paper');
 let paperSection=0,weatherReview='seasonal',lightningRate='occasional';
 function emitWeather(rain,cover,instant=false){setWeather(rain,cover,instant,weatherReview,lightningRate)}
 let cameraY=0,openingHint=false;
 let elapsed=0,status='ready',passed=0,month=-1,practice=false,mode='city',eligible=true,milestoneAge=0,milestone='';
 let crashReason=null,impactY=null,splashAge=-1,lastState='';
 const panel=document.createElement('div');panel.className='rainfall-ui controls-collapsed';
 panel.innerHTML='<button id="rain-controls-toggle" type="button" aria-expanded="false" aria-controls="rain-controls-body">Controls</button><button class="flight-pause-toggle" type="button" hidden>Pause</button><div class="rainfall-readout" aria-live="polite"></div><div class="rainfall-progress"></div><div class="rainfall-chart" aria-label="Annual rainfall chart"></div><div class="rainfall-cue" role="status"></div><div id="rain-controls-body" hidden><div class="rainfall-actions"><button id="rain-start">Start flight</button><button id="rain-pause">Pause</button><label><input id="rain-practice" type="checkbox"> Practice</label><label>Review month <select id="rain-month"><option value="">Choose…</option><option value="0">Jan</option><option value="1">Feb</option><option value="2">Mar</option><option value="3">Apr</option><option value="4">May</option><option value="5">Jun</option><option value="6">Jul</option><option value="7">Aug</option><option value="8">Sep</option><option value="9">Oct</option><option value="10">Nov</option><option value="11">Dec</option></select></label><label id="paper-coast-control">Paper coast <select id="paper-coast"></select></label><label>Weather <select id="weather-review"><option value="seasonal">Follow month</option><option value="0">Clear</option><option value="1">Light rain</option><option value="2">Medium rain</option><option value="3">Heavy rain</option></select></label><label>Lightning <select id="weather-lightning"><option value="occasional">Occasional</option><option value="preview">Frequent preview</option><option value="off">Off</option></select></label></div><div class="theme-note" role="status"></div><div class="rainfall-help" role="status"></div><div class="rainfall-source">Colaba · 1991–2020 normals · illustrative weather · <a href="https://doi.org/10.25921/800j-vn07" target="_blank" rel="noopener">India / WMO / NCEI</a></div></div>';
 if(route)panel.innerHTML=panel.innerHTML.replace('Paper coast <select',data.city.name+' route <select');
 document.querySelector('#stage').append(panel);
 panel.querySelector('.rainfall-source').innerHTML=`${data.station} · ${data.baseline} normals · illustrative weather · <a href="https://doi.org/10.25921/800j-vn07" target="_blank" rel="noopener">India / WMO / NCEI</a>`;
 const controlsToggle=panel.querySelector('#rain-controls-toggle'),controlsBody=panel.querySelector('#rain-controls-body');
 controlsToggle.onclick=()=>{controlsBody.hidden=!controlsBody.hidden;controlsToggle.textContent=controlsBody.hidden?'Controls':'Close controls';controlsToggle.setAttribute('aria-expanded',String(!controlsBody.hidden));panel.classList.toggle('controls-collapsed',controlsBody.hidden)};
 const reviewWeather=()=>emitWeather(data.rain[Math.max(0,month)],data.cloud[Math.max(0,month)]/8,false);
 panel.querySelector('#weather-review').onchange=e=>{weatherReview=e.target.value;reviewWeather()};
 panel.querySelector('#weather-lightning').onchange=e=>{lightningRate=e.target.value;reviewWeather()};
 const themeNote=panel.querySelector('.theme-note');
 const coastSelect=panel.querySelector('#paper-coast');
 coastSelect.innerHTML=(route?route.sections:PAPER_SECTIONS).map((section,i)=>`<option value="${i}">${section.name}</option>`).join('');
 coastSelect.onchange=e=>{paperSection=Number(e.target.value);};
 themeNote.textContent=route?route.note+' · illustrated route repeats · distances compressed':'';themeNote.hidden=!route;
 const readout=panel.querySelector('.rainfall-readout'),help=panel.querySelector('.rainfall-help');
 const progress=panel.querySelector('.rainfall-progress'),cue=panel.querySelector('.rainfall-cue');
 panel.querySelector('.rainfall-chart').innerHTML=rainfallChartSvg(data.rain,data.station,data.baseline);
 const dot=panel.querySelector('#rain-progress-dot');
 const start=panel.querySelector('#rain-start'),pause=panel.querySelector('#rain-pause'),quickPause=panel.querySelector('.flight-pause-toggle');
 function sync(){
  const m=Math.max(0,month);
  const label=`${MONTHS[m]} · ${data.rain[m].toFixed(1)} mm`;
  if(readout.textContent!==label)readout.textContent=label;
  const result=mode==='city'?`${passed} of 12 months cleared`:`${Math.floor(passed/12)} ${Math.floor(passed/12)!==1?'circuits':'circuit'} complete · ${passed%12} of 12 months · ${passed} total`;
  const runLabel=!eligible?(practice?' · practice':' · custom run'):'';
  if(progress.textContent!==result+runLabel)progress.textContent=result+runLabel;
  dot.setAttribute('cx',progressX(status==='completed'?11:chartProgress(elapsed,LEAD_IN,interval())).toFixed(2));
  const instruction=status==='ready'?'Tap anywhere or press Space to fly':status==='paused'?'Paused · tap to resume':status==='running'&&openingHint&&passed===0?'Fly through the opening.':milestoneAge>0?milestone:'';
  if(cue.textContent!==instruction)cue.textContent=instruction;
  cue.hidden=!cue.textContent;
  start.textContent=status==='ready'?'Start flight':'Restart';
  pause.disabled=!['running','paused'].includes(status);pause.textContent=status==='paused'?'Resume':'Pause';
  quickPause.hidden=pause.disabled;quickPause.textContent=pause.textContent;quickPause.setAttribute('aria-label',pause.textContent+' flight');
  const stateKey=[status,m,passed,crashReason,mode,eligible].join(':');
  if(stateKey!==lastState){lastState=stateKey;onState({status,month:MONTHS[m],passed,crashReason,mode,eligible});}
 }
 function reset(){eligible=!practice&&tuning.flap===1&&tuning.gravity===1;milestoneAge=0;milestone='';crashReason=null;impactY=null;splashAge=-1;elapsed=0;passed=0;month=-1;status='running';cameraY=0;resetBird((shapeFor(0,data.rain[0]).upper+shapeFor(0,data.rain[0]).lower)/2);help.textContent='Tap repeatedly / press Space to flap · each tap gives a short lift';weather(true);sync();}
 function weather(instant=false){const index=Math.max(0,Math.floor((elapsed-LEAD_IN)/interval()));const m=(mode==='city'?Math.min(11,index):index)%12;if(m!==month){month=m;emitWeather(data.rain[m],data.cloud[m]/8,instant);sync()}}
 panel.querySelector('#rain-month').onchange=e=>{if(e.target.value==='')return;const m=Number(e.target.value);reset();elapsed=LEAD_IN+m*interval();passed=m;practice=true;eligible=false;panel.querySelector('#rain-practice').checked=true;month=m;emitWeather(data.rain[m],data.cloud[m]/8,true);const shape=shapeFor(m,data.rain[m]),startY=(shape.lower+shape.upper)/2;cameraY=Math.min(0,startY-.48);resetBird(startY);help.textContent='Month review: practice enabled. Tap repeatedly to fly.';sync()};
 start.onclick=reset;pause.onclick=()=>{if(status==='running')status='paused';else if(status==='paused')status='running';sync()};
 quickPause.onclick=()=>pause.onclick();
 panel.querySelector('#rain-practice').onchange=e=>{practice=e.target.checked;if(practice)eligible=false;sync();help.textContent=practice?'Practice: collisions are disabled.':'Collisions enabled.'};
 help.textContent='Fly between twelve pairs of glass gauges. Blue water and ruler marks show rainfall; empty glass shapes the challenge. Tap repeatedly. Camera tracks without zoom. Clear all twelve months to complete the city, then choose whether to keep flying through the same monthly averages.';

 function gates(W,H){
  const speed=gaugeSpeed(W,H)*tuning.speed,width=.8*Math.max(58,Math.min(80,W*.14));
  const first=Math.max(0,Math.floor((elapsed-LEAD_IN)/interval())-2);
  const count=Math.max(0,Math.min(Math.ceil(W/(speed*interval()))+6,mode==='city'?12-first:Infinity));
  return Array.from({length:count},(_,n)=>{const i=first+n,m=i%12,rain=data.rain[m],shape=shapeFor(m,rain);return {i,m,rain,monthLabel:MONTHS[m],viewportWidth:W,x:W*.28+(LEAD_IN+i*interval()-elapsed)*speed,width,water:shape.water*H,lower:shape.lower*H,upper:shape.upper*H,base:H}});
 }
 function step(dt,W,H,y,birdSize){if(status!=='running')return;const before=passed;milestoneAge=Math.max(0,milestoneAge-dt);elapsed+=dt;cameraY=followCamera(cameraY,y,dt);weather();const body={x:W*.28,y:y*H,rx:birdSize*.23,ry:birdSize*.14};
  for(const gate of gates(W,H)){if(!practice&&intersectsGauge(body,gate)){status='crashed';month=gate.m;crashReason='glass';help.textContent='Glass hit. Restart to try again, or enable Practice for a full route review.';sync();return}if(gate.x+gate.width<body.x-body.rx)passed=Math.max(passed,gate.i+1)}
  if(!practice&&(body.y+body.ry>=H)){status='splash';crashReason=data.city?.surface==='ground'?'ground':'sea';impactY=1-body.ry/H;splashAge=0;help.textContent=crashReason==='ground'?'Ground touched. Flight ended.':'Water touched. Flight ended.'}
  if(status==='running'&&mode==='city'&&passed>=12){status='completed';month=11;}
  else if(status==='running'&&mode==='endless'&&Math.floor(passed/12)>Math.floor(before/12)){milestone=`Circuit ${Math.floor(passed/12)} complete · keep flying`;milestoneAge=3.5;}
  sync();
 }
 function draw(g,W,H){
  g.save();g.translate(0,-cameraY*H);
  const viewTop=cameraY*H;
  for(const a of gates(W,H)){if(a.x>W+100||a.x+a.width<0)continue;
   theme.drawGauge(g,a,H,viewTop,'paper',data.cloud[Math.max(0,month)]/8>.65,RAIN_SCALE);
  }g.restore();
 }
 cameraY=0;resetBird((shapeFor(0,data.rain[0]).upper+shapeFor(0,data.rain[0]).lower)/2);weather();sync();return {step,draw,get snapshot(){return {elapsed,nextAt:LEAD_IN+passed*interval()}},get completed(){return status==='completed'},continueFlight(){if(status!=='completed')return false;mode='endless';status='running';milestoneAge=0;sync();return true},startCity(settings,options){openingHint=options?.openingHint===true;if(settings)tuning=normalizeTuning(settings,options);mode='city';reset();if(Number.isFinite(options?.cameraY))cameraY=Math.min(0,options.cameraY)},get tuning(){return {...tuning}},setTuning(value,options){tuning=normalizeTuning(value,options);reset()},get theme(){return theme.id},get paperSection(){return paperSection},get cameraY(){return cameraY},get running(){return status==='running'},get impactY(){return impactY},get splashAge(){return splashAge},advanceEffects(dt){if(splashAge<0)return;splashAge+=dt;if(status==='splash'&&splashAge>=.42){status='crashed';sync()}},activate(){if(status==='ready')reset();else if(status==='paused'){status='running';sync()}return status==='running'},suspend(){if(status==='running'){status='paused';sync()}},reset};
}
