import {resolveFlightShareUrl} from './flight-share-config.mjs';
import {createFlightHints} from './flight-hints.mjs';
import {createHiddenFlock,drawHiddenFlock} from './hidden-flock.mjs';
import {mountAmbientAudio} from './ambient-audio.mjs';
import {watchFlightArtwork,renderLoadingProgress} from './loading-progress.mjs';
import {resizeCanvas} from './canvas-viewport.mjs';
import {localOpeningStore,openingSelection} from './opening-state.mjs';
import {createFlightMotion} from './flight-motion.mjs';
import {loadBirdArt} from './asset-loader.mjs';
import {loadScenery} from './scenery-loader.mjs';
import {localProgressStore} from './flight-progress.mjs';
import {localFlightSettings} from './flight-settings.mjs';
import {flightChoiceUrl,mountFlightChoices} from './flight-choices.mjs';
import {drawWaterline,drawSplash,drawGroundline,drawGroundImpact,seaScreenY} from './painted-ink.mjs';
import {createFlightControls} from './flight-controls.mjs';
import {createTemperatureHoopMode} from './temperature-hoop-mode.mjs';
import {usesTemperatureHoops} from './temperature-hoop-course.mjs';
import {localHoopSettings} from './temperature-hoop-settings.mjs';
import {createTemperatureTargetMode} from './temperature-target-mode.mjs';
import {createRainfallMode,gaugeSpeed} from './rainfall-mode.mjs';
import {climateCity} from './climate-cities.mjs';
import {cityRoute} from './city-routes.mjs';
const sharedHref=resolveFlightShareUrl(location.href);
if(sharedHref!==location.href)history.replaceState(null,'',sharedHref);
const metric=new URL(location.href).searchParams.get('metric')==='temperature'?'temperature':'rainfall';
document.body.classList.toggle('temperature-mode',metric==='temperature');
const settingsStore=localFlightSettings(location.href);
const flightDebug=['dev','tune'].some(key=>new URL(location.href).searchParams.get(key)==='1');
document.body.classList.toggle('flight-debug',flightDebug);
const openingStore=localOpeningStore(),selection=openingSelection(location.href,openingStore.value);
const openingUrl=new URL(location.href);
const showIntroduction=openingUrl.searchParams.get('intro')==='1';
if(openingUrl.searchParams.has('intro')){openingUrl.searchParams.delete('intro');if(showIntroduction)openingUrl.searchParams.delete('start');history.replaceState(null,'',openingUrl)}
document.body.classList.toggle('first-flight',!openingStore.value.attempted&&!flightDebug);
const city=climateCity(selection.city),route=cityRoute(city.id);
const targetTrial=metric==='temperature',hoopTrial=targetTrial&&usesTemperatureHoops(city.id);
const hoopStore=localHoopSettings(location.href);
document.body.classList.toggle('temperature-target-trial',targetTrial);
let rainfallData=null;
if(document.body.classList.contains('rainfall-mode')){
 try{const response=await fetch('./'+city.data);if(!response.ok)throw Error('Climate data unavailable');rainfallData={...await response.json(),city}}
 catch(error){document.querySelector('#loading').textContent='Unable to load climate data. Please reload the page to try again.';throw error}
}
import {getBirdProfile,defaultBirdForCity,BIRD_LABELS,birdWidth,advanceBirdAnimation,sampleBirdPose} from './birds.mjs';
import {studyWeather,atmosphereFromWeather} from './weather-state.mjs';

(()=>{'use strict';const birdProfile=getBirdProfile(selection.bird);const $=s=>document.querySelector(s),c=$('#scene'),g=c.getContext('2d');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const progressStore=localProgressStore(metric);
const hints=createFlightHints({metric,seen:openingStore.value.hints[metric],onSeen:cue=>openingStore.hint(metric,cue)});
const hint=document.createElement('div');hint.className='flight-first-hint';hint.setAttribute('role','status');hint.hidden=true;$('#stage').append(hint);
const audio=mountAmbientAudio();audio.update({city:city.id,bird:birdProfile.id});
const motion=createFlightMotion(birdProfile.id,settingsStore.motion),glideAnimation={...birdProfile,continuousWings:false};
let frameId=0,needsPaint=true;
function requestFrame(){needsPaint=true;if(!frameId&&!document.hidden)frameId=requestAnimationFrame(frame)}
let flightChoices;let poses=[],poseLayer,poseContext,ready=false,W=393,H=852,time=0,last=0,paused=false,held=false,y=.46,vy=0,angle=0,flapTime=-1,poseA=2,poseB=2,mix=0;let wingTime=-1;const cycleLength=.68;
c.setAttribute('aria-label',birdProfile.name+(rainfallData?' in the '+metric+' flight. Tap repeatedly or press Space to flap.':' flying above a quiet Mumbai coastline. Tap or hold to flap; release to glide.'));
let paperScenery,travel=0,scenerySpeed=reduced?0:1;
let monsoon=true,weatherTime=0,rainIntensity=1;
let weatherInput=studyWeather(monsoon,rainIntensity);
let atmosphere=atmosphereFromWeather(weatherInput.weather,weatherInput.presentation);
let renderedRainDensity=atmosphere.rainDensity;
// All future source adapters enter here; gameplay clocks and flight stay separate.
function applyWeatherInput(input){
 const wasStorm=atmosphere.lightning;
 weatherInput=input;
 atmosphere=atmosphereFromWeather(input.weather,input.presentation);
 if(atmosphere.lightning&&!wasStorm){lightning.wait=1.5+Math.random();lightning.age=-1;}
 if(!ready){renderedRainDensity=atmosphere.rainDensity;cloudCover=atmosphere.cloudCover}syncRain();if(paused)cloudCover=atmosphere.cloudCover;
}
let cloudCover=.42,sceneShade=0;
function updateClouds(dt){
 const target=atmosphere.cloudCover;
 cloudCover+=(target-cloudCover)*(1-Math.exp(-dt*.8));
 renderedRainDensity+=(atmosphere.rainDensity-renderedRainDensity)*(1-Math.exp(-dt*1.1));
 syncRain();
}
let rainDrops=[],rainSeed=72139;
function rainRandom(){
 rainSeed^=rainSeed<<13;rainSeed^=rainSeed>>>17;rainSeed^=rainSeed<<5;
 return (rainSeed>>>0)/4294967296;
}
function newRainDrop(fillScreen=false){
 const depth=rainRandom();
 const speed=150+depth*190+rainRandom()*45;
 const slope=.14+rainRandom()*.13;
 const drop={x:0,y:0,vx:-speed*slope,vy:speed,
  length:5+depth*8+rainRandom()*5,width:.4+depth*.45,
  opacity:.09+depth*.125+rainRandom()*.06};
 if(fillScreen){drop.x=rainRandom()*(W+60)-30;drop.y=rainRandom()*(H+60)-30}
 else{
  // Feed both incoming edges in proportion to the flow through each edge.
  const fromRight=rainRandom()<(-drop.vx*(H+60))/(speed*(W+60)-drop.vx*(H+60));
  if(fromRight){drop.x=W+30;drop.y=rainRandom()*(H+60)-30}
  else{drop.x=rainRandom()*(W+60)-30;drop.y=-30}
 }
 return drop;
}
function syncRain(){
 const count=reduced?0:Math.min(rainfallData?260:Infinity,Math.round(W*H/(17*852)*renderedRainDensity));
 rainDrops.length=Math.min(rainDrops.length,count);
 while(rainDrops.length<count)rainDrops.push(newRainDrop(true));
}
function updateRain(dt){
 if(renderedRainDensity<.001||reduced)return;
 for(let i=0;i<rainDrops.length;i++){
  const drop=rainDrops[i];drop.x+=drop.vx*dt;drop.y+=drop.vy*dt;
  if(drop.y>H+30||drop.x< -30)rainDrops[i]=newRainDrop();
 }
}
// Temporary study cadence; revisit alongside gameplay and season length.
let lightningPreview=false,lightningPreviewWait=1;
const lightning={wait:6+Math.random()*6,age:-1,duration:.65,x:.7,points:[]};
function updateLightning(dt){
 if(reduced||!atmosphere.lightning){lightning.age=-1;return}
 if(lightning.age>=0){lightning.age+=dt;if(lightning.age>=lightning.duration)lightning.age=-1;return}
 if(cloudCover<.80)return;
 if(lightningPreview){
  lightningPreviewWait-=dt;if(lightningPreviewWait>0)return;
  lightningPreviewWait=3-lightning.duration;
 }else{
  lightning.wait-=dt;if(lightning.wait>0)return;
  lightning.wait=6+Math.random()*6-lightning.duration;
 }
 lightning.age=0;audio.thunder();
 lightning.x=.52+Math.random()*.36;lightning.points=[];
 for(let i=0;i<7;i++)lightning.points.push({x:(Math.random()-.5)*.025,y:.10+i*.024});
}
function drawLightning(){
 if(reduced||!atmosphere.lightning||lightning.age<0)return;
 const paper=rainfall?.theme==='paper';
 const t=lightning.age/lightning.duration;
 const pulse=t<.22?smoothStep(0,.22,t):1-smoothStep(.22,1,t);
 g.save();
 const light=g.createLinearGradient(0,0,0,H*.72);
 light.addColorStop(0,`rgba(215,224,238,${pulse*(paper?.13:.065)})`);light.addColorStop(1,'rgba(215,224,238,0)');
 g.fillStyle=light;g.fillRect(0,0,W,H*.72);
 g.strokeStyle=`rgba(215,227,243,${pulse*(paper?.8:.42)})`;g.lineWidth=paper?1.2:.9;g.lineJoin='round';
 g.beginPath();lightning.points.forEach((p,i)=>{const x=W*(lightning.x+p.x),y=H*p.y;if(i)g.lineTo(x,y);else g.moveTo(x,y)});g.stroke();
 g.restore();
}
// The input strip changes canvas height, not the bird's size when a phone turns.
function flightViewport(profile=birdProfile){return {width:W,height:H,birdWidth:birdWidth(profile,innerWidth,innerHeight)*(rainfallData?.8:1),shortSide:Math.min(innerWidth,innerHeight)}}
function currentBirdWidth(){return birdWidth(birdProfile,innerWidth,innerHeight)*(rainfallData?.8:1)}
function resize(){const r=c.getBoundingClientRect();W=r.width;H=r.height;const d=Math.min(devicePixelRatio||1,rainfallData?1.5:2);if(!resizeCanvas(c,g,W,H,d))return;rainDrops=[];syncRain();requestFrame()}
// Align the eight painted poses at the beak for a steady head through each wingbeat.
function register(art){poses=art.poses;poseLayer=document.createElement('canvas');poseLayer.width=512;poseLayer.height=512;poseContext=poseLayer.getContext('2d');}
function startFlap(userInput=false){if(!ready||paused||document.querySelector('.flight-setup[open],.flight-tuning[open],.flight-achievement[open],.flight-retry[open]'))return;if(rainfall&&!rainfall.activate())return;if(rainfall){if(userInput)hints.flap();flapTime=0;vy=motion.flap(vy,rainfall.tuning);return}}
let rainfall=null;
const getShareOptions=()=>({flightMode:settingsStore.mode,flight:rainfall?.tuning??settingsStore.resolve(flightViewport()),hoopMode:hoopStore.mode,hoops:rainfall?.hoopSettings??hoopStore.value});
function closeFlightPanel(){const panel=$('#rain-controls-body');if(panel&&!panel.hidden)$('#rain-controls-toggle').click()}

const flightControls=rainfallData?createFlightControls($('#app'),{flap(){if(ready&&rainfall.activate())startFlap(true)},retry(){closeFlightPanel();rainfall.setHoopSettings?.(hoopStore.value);rainfall.setTuning(settingsStore.resolve(flightViewport()),{exact:settingsStore.mode!=='custom'});startFlap()},continueFlight(){closeFlightPanel();rainfall.continueFlight();startFlap()},choose(panel){flightChoices?.open({panel})},flyCity(next){openingStore.choose(next.id,birdProfile.id);location.assign(flightChoiceUrl(settingsStore.url(location.href),next.id,birdProfile.id))},data:rainfallData,city,bird:birdProfile,progressStore,metric,targetTrial,hoopTrial,getShareOptions}):null;
const hiddenFlock=metric==='temperature'?createHiddenFlock():null;
let descentTime=0;
function update(dt){
 if(rainfall&&!rainfall.running)return;
 time+=dt;
 weatherTime+=dt;
 travel+=dt*scenerySpeed*(rainfall?.travelSpeed??1);
 if(flapTime>=0){flapTime+=dt;if(flapTime>=cycleLength)flapTime=-1}
 const flight=motion.step(y,vy,dt,rainfall.tuning);y=flight.y;vy=flight.vy;
 if(y>1.05){y=1.05;vy=0}
 if(metric==='temperature'){const floor=.96-currentBirdWidth()*.14/H;if(y>floor){y=floor;vy=Math.min(0,vy)}}
 const snapshot=rainfall.snapshot,obstacleIn=snapshot?.next?snapshot.next.time-snapshot.elapsed:snapshot?.nextAt-snapshot?.elapsed;
 const obstacleSpeed=hoopTrial?rainfall.hoopSettings.speed*currentBirdWidth():gaugeSpeed(W,H)*rainfall.tuning.speed;
 const obstacleVisible=W*.28+obstacleIn*obstacleSpeed<W-24;
 const instruction=hints.step(dt,{y,vy,floor:metric==='temperature'?.96:1,obstacleIn,obstacleVisible});if(hint.textContent!==instruction)hint.textContent=instruction;hint.hidden=!instruction;
 if(rainfall){rainfall.step(dt,W,H,y,currentBirdWidth());if(rainfall.impactY!==null){y=rainfall.impactY;vy=0;held=false;}}
 if(hiddenFlock?.step(dt,{y,running:rainfall.running}))audio.flockCalls();
 // A powered stroke finishes before the wings settle into the glide pose.
 wingTime=advanceBirdAnimation(motion.model==='glide'?glideAnimation:birdProfile,wingTime,motion.model==='glide'?(motion.powered?0:-1):flapTime,dt);
 const pose=sampleBirdPose(birdProfile,wingTime);poseA=pose.a;poseB=pose.b;mix=pose.mix;
 // Coast level at the apex, then let falling speed gradually bring the nose down.
 descentTime=vy>0?descentTime+dt:0;
 const diveProgress=Math.max(0,Math.min(1,(descentTime-.60)/2.35));
 const diveEase=diveProgress*diveProgress*(3-2*diveProgress);
 const target=motion.model==='glide'?Math.max(-.48,Math.min(.36,Math.atan2(vy*H,Math.max(145,Math.min(W,580)*.44)))):vy>0
  ? Math.min(1.12,Math.pow(vy/.070,1.7)*1.12)*diveEase
  : (flapTime>=0?Math.max(-.48,Math.atan2(vy*H,Math.max(145,Math.min(W,580)*.44))):0);
 angle+=(target-angle)*(1-Math.exp(-dt*(vy>0?1.55:8)));
 
}
function renderBird(width){
 const q=poseContext;q.clearRect(0,0,512,512);q.globalCompositeOperation='lighter';
 function put(i,a){if(a<.001)return;const p=poses[i],scale=250/p.length;q.globalAlpha=a;q.drawImage(p.image,256-p.beakX*scale+250*.55,256-p.beakY*scale,p.image.width*scale,p.image.height*scale)}
 // Blend on transparent canvas with additive premultiplied alpha; the aligned body stays opaque.
 put(poseA,1-mix);put(poseB,mix);q.globalAlpha=1;q.globalCompositeOperation='source-atop';q.fillStyle=`rgba(49,60,74,${sceneShade*.32})`;q.fillRect(0,0,512,512);q.globalCompositeOperation='source-over';
 const s=width/250;g.drawImage(poseLayer,-256*s,-256*s,512*s,512*s);
}
function weatherAmount(){return Math.max(0,Math.min(1,(cloudCover-.16)/.72))}
function smoothStep(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function draw(){if(!ready||document.hidden||document.body.classList.contains('opening-active'))return;g.clearRect(0,0,W,H);
 paperScenery.draw(g,W,H,{travel,cameraY:rainfall.cameraY,section:rainfall.paperSection,shade:weatherAmount(),rainDrops,reduced,rainDensity:renderedRainDensity});
audio.update({section:paperScenery.soundSection||0,rain:renderedRainDensity});
drawLightning();
if(rainfall){(city.surface==='ground'?drawGroundline:drawWaterline)(g,W,H,rainfall.cameraY,travel*32,rainfall.theme==='paper');rainfall.draw(g,W,H);}
const width=currentBirdWidth();if(hiddenFlock&&!document.querySelector('dialog[open]'))drawHiddenFlock(g,{state:hiddenFlock.snapshot,poses,bird:birdProfile,width,W,H,y,cameraY:rainfall.cameraY,time,reduced});g.save();if(rainfall){g.beginPath();g.rect(0,0,W,Math.min(H,seaScreenY(H,rainfall.cameraY)));g.clip();}g.translate(W*.28,H*(y-(rainfall?rainfall.cameraY:0)));g.rotate(angle);if(!document.querySelector('dialog[open]'))renderBird(width);g.restore();rainfall?.drawForeground?.(g,W,H);if(rainfall)(city.surface==='ground'?drawGroundImpact:drawSplash)(g,W*.28,seaScreenY(H,rainfall.cameraY),rainfall.splashAge,reduced);g.globalAlpha=1}
function frame(now){
 frameId=0;const elapsed=Math.min(.1,(now-last)/1000||0);last=now;
 const visible=ready&&!paused&&!document.hidden&&!document.body.classList.contains('opening-active');
 const moving=visible&&(rainfall.running||(rainfall.splashAge>=0&&rainfall.splashAge<=.6));
 if(visible&&(moving||needsPaint)){
  if(moving){let remaining=elapsed;while(remaining>0){const dt=Math.min(1/120,remaining);rainfall.advanceEffects(dt);if(rainfall.running){update(dt);updateRain(dt);updateClouds(dt);updateLightning(dt)}remaining-=dt}}
  needsPaint=false;draw();
 }
 if(moving&&!frameId)frameId=requestAnimationFrame(frame);
}
function down(e){e.preventDefault();c.focus({preventScroll:true});startFlap(true);held=!paused;if(e.currentTarget.setPointerCapture)e.currentTarget.setPointerCapture(e.pointerId)}
c.addEventListener('pointerdown',down);
window.addEventListener('pointerup',()=>held=false);window.addEventListener('pointercancel',()=>held=false);window.addEventListener('blur',()=>held=false);
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if((e.code==='Space'||e.code==='ArrowUp')&&!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();if(!e.repeat){startFlap(true);held=true}}if(e.code==='Escape'&&ready)rainfall.suspend()});
window.addEventListener('keyup',e=>{if(['Space','ArrowUp','Enter'].includes(e.code))held=false});
document.addEventListener('visibilitychange',()=>{if($('#app').closest('[hidden]')){audio.update({hidden:true});return}if(document.hidden){if(ready)rainfall.suspend();cancelAnimationFrame(frameId);frameId=0}else{last=performance.now();requestFrame()}});
new MutationObserver(requestFrame).observe(document.body,{attributes:true,attributeFilter:['class']});
new MutationObserver(requestFrame).observe($('#app'),{subtree:true,attributes:true,attributeFilter:['open']});
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(c);resize();
scenerySpeed=reduced?0:2;
rainfall=(hoopTrial?createTemperatureHoopMode:targetTrial?createTemperatureTargetMode:createRainfallMode)(rainfallData,startY=>{hints.start();hint.hidden=true;hiddenFlock?.reset();motion.reset(settingsStore.motion);descentTime=0;y=startY;vy=0;held=false;angle=0;flapTime=-1;wingTime=-1;time=0;paused=false;last=performance.now();c.focus({preventScroll:true})},(rain,cover,instant=false,review='seasonal',frequency='occasional')=>{
 const level=review==='seasonal'?(rain>650?3:rain>200?2:rain>5?1:0):Number(review);
 monsoon=level>0;rainIntensity=level;
 const input=review==='seasonal'?{weather:{cloudCover:cover},presentation:{rainDensity:[0,1,2.4,4.6][level],lightning:level===3}}:studyWeather(level>0,level);
 input.presentation.lightning=input.presentation.lightning&&frequency!=='off';
 lightningPreview=frequency==='preview';lightningPreviewWait=1;
 if(instant){if(!ready)cloudCover=input.weather.cloudCover;lightning.wait=1.5+Math.random();lightning.age=-1;}
 applyWeatherInput(input)},state=>{if(!document.body.classList.contains('opening-active'))audio.update({city:city.id,bird:birdProfile.id,phase:state.status==='running'?'flight':state.status});const ui=document.querySelector('.rainfall-ui');if(state.status==='running'&&ui.dataset.status!=='running')last=performance.now();requestFrame();ui.dataset.status=state.status;if(['crashed','completed'].includes(state.status)){state.firstAttempt=!openingStore.value.attempted;openingStore.attempt();document.body.classList.remove('first-flight')}if(state.status!=='running')hint.hidden=true;flightControls.update(state);if(state.status==='completed'){held=false;vy=0;angle=0;motion.reset()}},settingsStore.resolve(flightViewport()),hoopStore?.value);flightChoices=mountFlightChoices(city,birdProfile,{getShareOptions,audio,metric,targetTrial,hoopStore,onHoopChange:values=>rainfall.setHoopSettings?.(values),pause:()=>{const running=rainfall.running;rainfall.suspend();return running},resume:()=>{rainfall.activate();c.focus({preventScroll:true})},start:(settings,departure)=>{closeFlightPanel();rainfall.setHoopSettings?.(hoopStore.value);rainfall.startCity(settings,{exact:settingsStore.mode!=='custom',openingHint:false,cameraY:departure?.learned?departure.cameraY:0});if(departure){travel=departure.travel;if(departure.learned){y=departure.y;vy=departure.vy;wingTime=departure.wing;angle=departure.angle;motion.restore(departure.motion);const pose=sampleBirdPose(birdProfile,wingTime);poseA=pose.a;poseB=pose.b;mix=pose.mix;cloudCover=.16;renderedRainDensity=0;syncRain();draw();return}}startFlap()},progressStore,data:rainfallData,settingsStore,viewport:flightViewport,rememberedBird:selection.rememberedBird,onChoose:(city,bird)=>openingStore.choose(city,bird),openingStore,canResume:()=>document.querySelector('.rainfall-ui').dataset.status==='paused'});
// Show the chooser first, then prepare the whole selected route before flight.
document.querySelector('#rain-progress-dot')?.setAttribute('fill',BIRD_LABELS[birdProfile.id].color);
flightChoices.showLoading();
async function prepareFlight(){
 const stopProgress=watchFlightArtwork(city.id,birdProfile.id,progress=>renderLoadingProgress($('#loading .boot-progress'),{...progress,label:'Preparing '+city.name+'…'}));
 try{
  const [bird,scenery]=await Promise.all([loadBirdArt(birdProfile.id),loadScenery(city.id)]);
  paperScenery=scenery;
  register(bird);ready=true;flightControls.ready();$('#loading').hidden=true;requestFrame();flightChoices.ready();if($('#app').closest('[hidden]'))leaveSiteGame();
 }catch(error){$('#loading').textContent='Unable to load artwork. Please reload the page to try again.';flightChoices.failed();console.error(error)}finally{stopProgress()}
}
let siteDeparted=false;
function leaveSiteGame(){siteDeparted=true;flightChoices.leave();rainfall.suspend();paused=true;hint.hidden=true;audio.update({hidden:true,phase:'paused'});cancelAnimationFrame(frameId);frameId=0}
 document.addEventListener('weather-wings:leave',leaveSiteGame);
 document.addEventListener('weather-wings:enter',()=>{paused=false;audio.update({hidden:document.hidden});if(siteDeparted&&!document.querySelector('#app dialog[open]'))flightChoices.open();siteDeparted=false;resize();requestFrame()});
 prepareFlight();requestFrame();
})();
