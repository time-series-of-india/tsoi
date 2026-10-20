import {readingFont} from './reading-type.mjs';
import {normalizeTuning,DEFAULT_TUNING} from './flight-tuning.mjs';
import {followCamera} from './rainfall-mode.mjs';
import {temperatureChartSvg} from './temperature-chart.mjs';
import {TEMPERATURE_MONTHS} from './temperature-course.mjs';
import {createTemperatureHoopCourse,HOOP_RIM_WIDTH} from './temperature-hoop-course.mjs';
import {normalizeHoops} from './temperature-hoop-settings.mjs';
export function createTemperatureHoopMode(data,resetBird,setWeather,onState=()=>{},initialTuning=DEFAULT_TUNING,initialHoops){
 let flightMode='city';
 let settings=normalizeHoops(initialHoops),tuning=normalizeTuning(initialTuning),course=createTemperatureHoopCourse(data,settings),status='ready',cameraY=0,lastMonth=-1,lastState='',lastHud='',birdSize=42;
 const startY=()=>{const h=course.hoops[0];return (h.upper+h.lower)/2};let previousY=startY();
 const panel=document.createElement('div');panel.className='rainfall-ui temperature-ui target-ui hoop-ui controls-collapsed';
 panel.innerHTML='<button class="flight-pause-toggle" type="button" hidden>Pause</button><div class="rainfall-readout" aria-live="polite"></div><div class="rainfall-progress"></div><div class="rainfall-chart" aria-label="Temperature minimap"></div><div class="target-next"></div><div class="rainfall-cue" role="status"></div><div id="rain-controls-body" hidden></div>';
 document.querySelector('#stage').append(panel);
 const readout=panel.querySelector('.rainfall-readout'),progress=panel.querySelector('.rainfall-progress'),next=panel.querySelector('.target-next'),cue=panel.querySelector('.rainfall-cue'),pause=panel.querySelector('.flight-pause-toggle');
 panel.querySelector('.rainfall-chart').innerHTML=temperatureChartSvg(data,{minimap:true});const mapDot=panel.querySelector('#temperature-progress-dot');
 function sync(){
  const s=course.snapshot(),celebrating=course.hoops.findLast(h=>h.result!=='pending'&&s.elapsed-h.time<.9&&(s.mode!=='endless'||h.i>=Math.floor((s.passed+s.skipped)/12)*12)),m=celebrating?.month??s.month,h=s.failedHoop??s.next,approaching=!celebrating&&h&&h.time-s.elapsed<3.5,key=[status,m,s.mode,s.passed,s.skipped,approaching].join(':');
  mapDot.setAttribute('cx',(32+20*s.progress).toFixed(2));
  if(m!==lastMonth){lastMonth=m;setWeather(data.rain[m],data.cloud[m]/8,true,'seasonal','occasional')}
  if(key!==lastHud){lastHud=key;readout.textContent=TEMPERATURE_MONTHS[m]+' · '+(data.city?.name??data.station);progress.textContent=s.mode==='endless'?`Year ${Math.floor((s.passed+s.skipped)/12)+1} · ${s.passed} cleared · ${s.skipped} skipped`:`${s.passed} / 12 hoops · ${s.skipped} skipped`;next.textContent=h&&approaching?`${h.low.toFixed(1)}–${h.high.toFixed(1)}°C · ${(h.high-h.low).toFixed(1)}° opening`:'';
   cue.textContent=status==='paused'?'Paused · tap to resume':'';cue.hidden=!cue.textContent;
   pause.hidden=!['running','paused'].includes(status);pause.textContent=status==='paused'?'Resume':'Pause';pause.setAttribute('aria-label',pause.textContent+' flight');
  }
  if(key!==lastState){lastState=key;onState({...s,...(['crashed','completed'].includes(status)?course.snapshot(true):{}),status,month:TEMPERATURE_MONTHS[m],metric:'temperature',targetTrial:true,hoopTrial:true,eligible:true,crashReason:status==='crashed'?'hoop':null})}
 }
 function reset(){course=createTemperatureHoopCourse(data,settings,{endless:flightMode==='endless'});status='running';cameraY=0;lastMonth=-1;lastState='';previousY=startY();resetBird(previousY);sync()}
 pause.onclick=()=>{if(status==='running')status='paused';else if(status==='paused')status='running';sync()};
 function drawHoops(g,W,H,front=false){
  const s=course.snapshot(),speed=settings.speed*birdSize;
  g.save();g.translate(0,-cameraY*H);g.textAlign='center';g.textBaseline='middle';
  for(const h of course.hoops){
   const x=W*.28+(h.time-s.elapsed)*speed,top=h.upper*H,bottom=h.lower*H,cy=(top+bottom)/2,ry=(bottom-top)/2,rx=Math.max(5,Math.min(18,ry*.16));
   if(x< -100||x>W+100)continue;
   const age=s.elapsed-h.time;g.globalAlpha=h.result==='cleared'?Math.max(0,1-age/1.6):h.result==='skipped'?Math.max(0,.45-age/2):1;if(!g.globalAlpha)continue;
   const pigment=g.createLinearGradient(0,top,0,bottom);pigment.addColorStop(0,'#aa6845');pigment.addColorStop(1,'#416c87');g.strokeStyle=pigment;
   // Quiet pigment variation follows a smooth oval; the rim sits outside the data opening.
   for(const [extra,width,alpha] of [[2.1,4,.10],[1.2,HOOP_RIM_WIDTH,.70],[1.1,.8,.30]]){
    g.save();g.globalAlpha*=alpha;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();
    const start=front?-Math.PI/2:Math.PI/2;
    for(let i=0;i<=48;i++){const a=start+i*Math.PI/48,wave=.23*Math.sin(a*5+h.month*1.7)*Math.sin(a*2)**2,px=x+(rx+extra+wave)*Math.cos(a),py=cy+(ry+extra+wave)*Math.sin(a);if(i)g.lineTo(px,py);else g.moveTo(px,py)}
    g.stroke();g.restore();
   }
   if(front)continue;
   g.font=`${H<400?10:11}px Georgia`;g.fillStyle='#aa6845';g.fillText('max',x,top-38);
   g.font=readingFont(H);g.fillText(`${h.high.toFixed(1)}°C`,x,top-21);
   g.font=`${H<400?10:11}px Georgia`;g.fillStyle='#416c87';g.fillText('min',x,bottom+15);
   g.font=readingFont(H);g.fillText(`${h.low.toFixed(1)}°C`,x,bottom+32);
   g.font=`${H<400?11:13}px Georgia`;g.fillStyle='#344d62';g.fillText(TEMPERATURE_MONTHS[h.month],x,bottom+52);
   if(h.result==='cleared'){g.fillStyle='#344d46';g.font='bold 22px Georgia';g.fillText('+1',x+rx+50,top-12-Math.max(0,age)*12)}else if(h.result==='skipped'){g.fillStyle='#56656d';g.font='12px Georgia';g.fillText('Skipped',x,top-61)}

  }
  g.restore();
 }
 resetBird(previousY);sync();
 return {draw(g,W,H){drawHoops(g,W,H)},drawForeground(g,W,H){drawHoops(g,W,H,true)},step(dt,W,H,y,size=42){birdSize=size;if(status!=='running')return;cameraY=followCamera(cameraY,y,dt);course.step(dt,y,H,birdSize,previousY);previousY=y;status=course.snapshot().status;sync()},get tuning(){return {...tuning,flap:settings.flap,gravity:settings.gravity}},get travelSpeed(){return settings.speed/1.6},get running(){return status==='running'},get completed(){return status==='completed'},get cameraY(){return cameraY},get paperSection(){return 0},get theme(){return 'paper'},get impactY(){return null},get splashAge(){return -1},advanceEffects(){},get snapshot(){return course.snapshot(true)},
  setHoopSettings(input){settings=normalizeHoops(input)},get hoopSettings(){return {...settings}},
  startCity(settings,options){flightMode='city';if(settings)tuning=normalizeTuning(settings,options);reset();if(Number.isFinite(options?.cameraY))cameraY=options.cameraY},setTuning(settings,options){tuning=normalizeTuning(settings,options);reset()},reset,
  activate(){if(status==='ready')reset();else if(status==='paused'){status='running';sync()}return status==='running'},suspend(){if(status==='running'){status='paused';sync()}},continueFlight(){if(!course.continueFlight())return false;flightMode='endless';status='running';sync();return true}
 };
}
