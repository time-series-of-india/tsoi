import {normalizeTuning,DEFAULT_TUNING} from './flight-tuning.mjs';
import {followCamera} from './rainfall-mode.mjs';
import {temperatureChartSvg} from './temperature-chart.mjs';
import {TEMPERATURE_MONTHS} from './temperature-course.mjs';
import {createTemperatureTargetCourse} from './temperature-target-course.mjs';
// Round pigment dots with a soft wash and subtle stable texture.
export function paintDot(g,x,y,r,color,seed){
 g.save();const alpha=g.globalAlpha;
 for(const [scale,opacity] of [[1.04,.10],[1,.98]]){g.beginPath();for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,edge=1+.008*Math.sin(a*3+seed)+.005*Math.cos(a*5-seed);const px=x+Math.cos(a)*r*scale*edge,py=y+Math.sin(a)*r*scale*edge;(i?g.lineTo:g.moveTo).call(g,px,py)}g.closePath();g.fillStyle=color;g.globalAlpha=alpha*opacity;g.fill()}
 g.globalAlpha=alpha*.08;g.fillStyle='#f4f1eb';for(let i=0;i<8;i++){const a=i*2.4+seed,d=r*(.2+(i%3)*.2);g.beginPath();g.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,.35+(i%2)*.25,0,Math.PI*2);g.fill()}g.restore();
}
// Monthly target pairs share one cadence across cities and retain the existing bird motion.
export function createTemperatureTargetMode(data,resetBird,setWeather,onState=()=>{},initialTuning=DEFAULT_TUNING){
 let cameraY=0;
 let tuning=normalizeTuning(initialTuning),course=createTemperatureTargetCourse(data),status='ready',lastMonth=-1,lastState='',lastHud='',previousY=course.targets[0].y-.13;
 const panel=document.createElement('div');panel.className='rainfall-ui temperature-ui target-ui controls-collapsed';
 panel.innerHTML='<button class="flight-pause-toggle" type="button" hidden>Pause</button><div class="rainfall-readout" aria-live="polite"></div><div class="rainfall-progress"></div><div class="rainfall-chart" aria-label="Temperature minimap"></div><div class="target-next"></div><div class="rainfall-cue" role="status"></div><div id="rain-controls-body" hidden></div>';
 document.querySelector('#stage').append(panel);
 const readout=panel.querySelector('.rainfall-readout'),progress=panel.querySelector('.rainfall-progress'),next=panel.querySelector('.target-next'),cue=panel.querySelector('.rainfall-cue'),pause=panel.querySelector('.flight-pause-toggle');
 panel.querySelector('.rainfall-chart').innerHTML=temperatureChartSvg(data,{minimap:true});
 const mapDot=panel.querySelector('#temperature-progress-dot');
 function sync(){
  const s=course.snapshot(),upcoming=s.next,m=upcoming?.month??11,key=[status,m,s.score,s.passed,upcoming?.i,s.freeFlight].join(':');
  mapDot.setAttribute('cx',(22+20*(Math.min(11,s.progress)+.5)).toFixed(2));
  if(m!==lastMonth){lastMonth=m;setWeather(0,data.cloud[m]/8,true,'0','off')}
  if(key!==lastHud){lastHud=key;readout.textContent=TEMPERATURE_MONTHS[m]+' · '+(data.city?.name??data.station);progress.textContent=`${s.score} / 24 targets collected · ${s.passed} of 12 months flown`;next.textContent=upcoming&&!s.freeFlight?`Next: ${upcoming.kind.toLowerCase()} ${upcoming.temperature.toFixed(1)}°C`:'';
   cue.textContent=status==='paused'?'Paused · tap to resume':!s.freeFlight&&s.passed<1?'Glide to the minimum. Tap to climb to the maximum.':'';cue.hidden=!cue.textContent;pause.hidden=!['running','paused'].includes(status);pause.textContent=status==='paused'?'Resume':'Pause';pause.setAttribute('aria-label',pause.textContent+' flight');
  }
  if(key!==lastState){lastState=key;onState({...s,...(status==='completed'?course.snapshot(true):{}),status,month:TEMPERATURE_MONTHS[m],mode:'city',metric:'temperature',targetTrial:true,eligible:false,crashReason:null})}
 }
 function reset(){cameraY=0;course=createTemperatureTargetCourse(data);status='running';lastMonth=-1;lastState='';previousY=course.targets[0].y-.13;resetBird(previousY);sync()}
 pause.onclick=()=>{if(status==='running')status='paused';else if(status==='paused')status='running';sync()};
 function draw(g,W,H){
  const s=course.snapshot(),speed=Math.max(45,Math.min(115,W*.72/4.16)),radius=H<400?6.5:8;
  g.save();g.translate(0,-cameraY*H);g.textAlign='center';g.textBaseline='middle';
  for(const t of course.targets){const x=W*.28+(t.time-s.elapsed)*speed,cy=t.y*H;if(x<-90||x>W+90)continue;
   const color=t.kind==='Minimum'?'#416c87':'#aa6845',age=t.resolvedAt===null?0:s.elapsed-t.resolvedAt;
   if(t.result==='missed'){g.globalAlpha=Math.max(0,.35-age);if(!g.globalAlpha)continue}
   else if(t.result==='collected'){
    if(age>.75)continue;g.globalAlpha=1-age/.75;paintDot(g,x,cy,radius*(1+age*.25),color,t.i);g.font='14px Georgia';g.fillStyle=color;g.fillText('+1',x,cy-18-age*18);continue;
   }else g.globalAlpha=1;
   paintDot(g,x,cy,radius,color,t.i);
   g.font=`${H<400?11:13}px Georgia`;g.fillStyle=color;g.fillText(`${t.kind} ${t.temperature.toFixed(1)}°C`,x,cy-radius-14);
  }
  g.globalAlpha=.8;g.fillStyle='#344d62';g.font=`${H<400?11:13}px Georgia`;
  const targets=course.targets;
  for(let m=0;m<12;m++){const low=targets[m*2],high=targets[m*2+1],x=W*.28+((low.time+high.time)/2-s.elapsed)*speed;if(x<-40||x>W+40)continue;g.fillText(TEMPERATURE_MONTHS[m],x,Math.max(low.y,high.y)*H+radius+25)}
  g.restore();
 }
 resetBird(previousY);sync();
 return {draw,step(dt,W,H,y){if(status!=='running')return;cameraY=followCamera(cameraY,y,dt);course.step(dt,y,H,previousY);previousY=y;status=course.snapshot().status;sync()},get tuning(){return {...tuning}},get running(){return status==='running'},get completed(){return status==='completed'},get cameraY(){return cameraY},get paperSection(){return 0},get theme(){return 'paper'},get impactY(){return null},get splashAge(){return -1},advanceEffects(){},get snapshot(){return course.snapshot(true)},
  startCity(settings,options){if(settings)tuning=normalizeTuning(settings,options);reset()},setTuning(settings,options){tuning=normalizeTuning(settings,options);reset()},reset,
  activate(){if(status==='ready')reset();else if(status==='paused'){status='running';sync()}return status==='running'},suspend(){if(status==='running'){status='paused';sync()}},continueFlight(){if(status!=='completed')return false;reset();return true}
 };
}
