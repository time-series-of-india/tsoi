import {resizeCanvas} from './canvas-viewport.mjs';
import {loadBirdArt} from './asset-loader.mjs';
import {loadOpeningScenery} from './scenery-loader.mjs';
import {sampleBirdPose,birdWidth} from './birds.mjs';
import {openingFrame,openingWingTime,OPENING_SECONDS} from './opening-timeline.mjs';

// The chooser keeps the existing painted arrival; Play begins a real flight.
export function mountOpeningScene({container,onReady,onPreviewReady=()=>{},onReveal=()=>{},audio}){
 const canvas=container.querySelector('.opening-canvas'),g=canvas.getContext('2d');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const layer=document.createElement('canvas');layer.width=512;layer.height=512;const q=layer.getContext('2d');
 let art,scenery,selected='',cityName='',active=false,loaded=false,routeReady=false,resizePending=false,ticket=0,frame=0,last=0;
 let clock=0,travel=0,y=.46,wing=-1,W=1,H=1,introducing=false,menuOffset=0;
 function paintTimeline(){
  const frame=openingFrame(introducing?clock:OPENING_SECONDS,W,H);
  for(const key of ['wordmark','title','play','controls']){const value=String(frame[key]);if(container.style.getPropertyValue('--arrival-'+key)!==value)container.style.setProperty('--arrival-'+key,value)}
  container.classList.toggle('arrival-playing',introducing);return frame;
 }
 function placeMenuBird(){
  menuOffset=0;if(W>=600||H<=W)return;
  const launch=container.querySelector('.home-launch')?.getBoundingClientRect(),choices=container.querySelector('.home-selections')?.getBoundingClientRect(),box=canvas.getBoundingClientRect();
  if(launch&&choices)menuOffset=Math.max(.46,Math.min(.85,((launch.bottom+choices.top)/2-box.top)/H))-.46;
 }
 function finishReveal(){introducing=false;clock=Math.max(clock,OPENING_SECONDS);paintTimeline();placeMenuBird();draw();onReveal()}
 function resize(){
  const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
  resizePending=loaded&&!scenery.canDraw(box.width,box.height,travel+openingFrame(introducing?clock:OPENING_SECONDS).cameraTravel);if(resizePending)return;
  W=box.width;H=box.height;placeMenuBird();resizeCanvas(canvas,g,W,H,Math.min(devicePixelRatio||1,1.5));draw();
 }
 function draw(){
  if(!loaded||!W||!H)return;
  const arrival=paintTimeline();
  if(active)audio?.update({phase:introducing?'opening':'menu',opening:clock,rain:0,section:scenery.soundSection||0});
  if(!scenery.canDraw(W,H,travel+arrival.cameraTravel))return;
  scenery.draw(g,W,H,{travel:travel+arrival.cameraTravel,cameraY:introducing?arrival.cameraY:0,section:0,shade:0,rainDrops:[],reduced:reduced.matches,rainDensity:0});
  const pose=sampleBirdPose(art.profile,wing);q.clearRect(0,0,512,512);q.globalCompositeOperation='lighter';
  for(const [i,a] of [[pose.a,1-pose.mix],[pose.b,pose.mix]]){if(a<.001)continue;const p=art.poses[i],scale=250/p.length;q.globalAlpha=a;q.drawImage(p.image,256-p.beakX*scale+250*.55,256-p.beakY*scale,p.image.width*scale,p.image.height*scale)}
  q.globalAlpha=1;q.globalCompositeOperation='source-over';
  const scale=birdWidth(art.profile,innerWidth,innerHeight)*.8/250;
  g.save();g.globalAlpha=arrival.birdOpacity;g.translate(W*(introducing?arrival.birdX:.28),H*((introducing?arrival.birdY:y)+menuOffset));g.rotate(introducing?arrival.birdAngle:0);g.drawImage(layer,-256*scale,-256*scale,512*scale,512*scale);g.restore();
  if(arrival.darkness>0){g.fillStyle=`rgba(13,23,34,${arrival.darkness})`;g.fillRect(0,0,W,H)}
 }
 function animate(now){
  if(!active)return;if(resizePending)resize();const dt=Math.min(.05,(now-last)/1000||0);last=now;
  const nextTravel=travel+(reduced.matches?0:dt*.42),nextCamera=openingFrame(introducing?clock+dt:OPENING_SECONDS).cameraTravel;
  if(loaded&&!document.hidden&&scenery.canDraw(W,H,nextTravel+nextCamera)){
   clock+=dt;travel=nextTravel;if(introducing&&(clock>=OPENING_SECONDS||reduced.matches))finishReveal();
   const target=.46+(reduced.matches||introducing?0:Math.sin((clock-OPENING_SECONDS)*.7)*.007);y+=(target-y)*(1-Math.exp(-dt*3));
   wing=reduced.matches?-1:introducing?openingWingTime(clock,art.profile):clock%4<art.profile.wingSeconds?clock%4:-1;draw();
  }
  frame=requestAnimationFrame(animate);
 }
 canvas.tabIndex=0;
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();finishReveal()});
 canvas.addEventListener('click',e=>{if(e.detail===0)finishReveal()});
 canvas.addEventListener('keydown',e=>{if(['Space','ArrowUp','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();if(!e.repeat)finishReveal()}});
 new ResizeObserver(resize).observe(canvas);
 return {
  async select(city,bird){
   const key=city.id+':'+bird;if(key===selected&&loaded&&routeReady){resize();draw();onPreviewReady(true);onReady(true);return}
   audio?.update({city:city.id,bird,phase:'loading',rain:0});selected=key;cityName=city.name;loaded=false;routeReady=false;onPreviewReady(false);onReady(false);const request=++ticket;
   try{
    const box=canvas.getBoundingClientRect();const [nextArt,opening]=await Promise.all([loadBirdArt(bird),loadOpeningScenery(city.id,{width:Math.max(1,box.width),height:Math.max(1,box.height)})]);if(request!==ticket)return;
    art=nextArt;scenery=opening.scene;loaded=true;travel=0;y=.46;wing=-1;
    scenery.draw(g,Math.max(1,box.width),Math.max(1,box.height),{travel:0,cameraY:0,section:0,shade:0,rainDrops:[],reduced:reduced.matches,rainDensity:0});resize();draw();onPreviewReady(true);
    await opening.complete;if(request!==ticket)return;routeReady=true;resize();onReady(true);
   }catch{if(request===ticket){selected='';onReady(false,true)}}
  },
  show({gradual=false}={}){active=true;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',cityName+' scenery with '+(art?.profile.name||'a gliding bird'));clock=0;introducing=gradual&&!reduced.matches;paintTimeline();last=performance.now();cancelAnimationFrame(frame);resize();frame=requestAnimationFrame(animate);if(!introducing)onReveal()},
  hide(){active=false;cancelAnimationFrame(frame)},reveal:finishReveal,suspend(){return false},resume(){},get learning(){return false},
  get departure(){return {travel:travel+openingFrame(OPENING_SECONDS).cameraTravel,y:y+menuOffset,vy:0,wing,angle:0,cameraY:0,learned:false}}
 };
}
