import {sampleBirdPose} from './birds.mjs';
export const FLOCK_HEIGHT=-.45,FLOCK_DWELL=3;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
// World height, rather than camera position, makes discovery independent of screen size.
export function createHiddenFlock(){
 let phase='hidden',dwell=0,age=0,lowestY=0,used=false;
 const reset=()=>{phase='hidden';dwell=0;age=0;lowestY=0;used=false};
 return {reset,get snapshot(){return {phase,age,dwell,used}},step(dt,{y,running=true}={}){
  if(!running||!Number.isFinite(dt)||dt<=0||!Number.isFinite(y))return false;
  if(phase==='hidden'&&!used){dwell=y<FLOCK_HEIGHT?dwell+dt:0;if(dwell>=FLOCK_DWELL){phase='joining';age=0;used=true;lowestY=y;return true}return false}
  if(phase==='hidden')return false;
  age+=dt;lowestY=Math.min(lowestY,y);
  if(phase!=='leaving'&&(y>lowestY+.2||age>=9)){phase='leaving';age=0}
  else if(phase==='joining'&&age>=3)phase='company';
  else if(phase==='leaving'&&age>=3){phase='hidden';age=0}
  return false;
 }};
}
export function drawHiddenFlock(g,{state,poses,bird,width,W,H,y,cameraY,time,reduced=false}){
 if(state.phase==='hidden'||!poses.length)return;
 const joining=state.phase==='joining'?smooth(state.age/3):1,leaving=state.phase==='leaving'?smooth(state.age/3):0;
 const opacity=joining*(1-leaving),originX=W*.28,originY=(y-cameraY)*H;
 // Smaller companions sit farther back; every one stays clear of the player's silhouette.
 for(const [i,dx,dy,size] of [[0,1.6,-.7,.72],[1,3.1,.35,.60],[2,-1.5,.95,.56]]){
  const cycle=(time+i*.63)%3.8,pose=sampleBirdPose(bird,!reduced&&cycle<bird.wingSeconds*2?cycle:-1),p=poses[pose.mix>.5?pose.b:pose.a];
  const scale=width*size/p.length,spread=reduced?0:(1-joining)*2.8+leaving*4;
  const x=originX+width*(dx+spread*(i===2?-1:1)),bob=reduced?0:Math.sin(time*1.4+i*2)*width*.06;
  const cy=originY+width*(dy-spread*.65)+bob;
  g.save();g.globalAlpha=opacity*(.76-i*.06);g.translate(x,cy);g.rotate(reduced?0:-leaving*.18);g.drawImage(p.image,(-p.beakX+p.length*.55)*scale,-p.beakY*scale,p.image.width*scale,p.image.height*scale);g.restore();
 }
}
