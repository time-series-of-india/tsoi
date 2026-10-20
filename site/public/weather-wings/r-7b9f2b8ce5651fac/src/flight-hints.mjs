// Instructions follow the real flight and are remembered independently by mode.
export function createFlightHints({seen={},onSeen=()=>{},metric='rainfall'}={}){
 const shown={flap:seen.flap===true,opening:seen.opening===true};
 let cue='',age=0,taps=0;
 const mark=key=>{if(!shown[key]){shown[key]=true;onSeen(key)}};
 return {
  start(){cue='';age=0;taps=0},
  flap(){taps++;mark('flap');if(cue==='flap'){cue='';age=0}},
  step(dt,{y,vy,floor=1,obstacleIn=Infinity,obstacleVisible=true,running=true}={}){
   if(!running)return '';
   age+=dt;
   if(cue==='opening'&&(age>=3.5||obstacleIn<-.5))cue='';
   if(!shown.flap&&!taps&&vy>0&&floor-y<=vy*1.25){mark('flap');cue='flap';age=0}
   if(!cue&&!shown.opening&&obstacleVisible&&obstacleIn>=0&&obstacleIn<=3.5){mark('opening');cue='opening';age=0}
   return cue==='flap'?'Tap or press Space to fly.':cue==='opening'?(metric==='temperature'?'Fly through the hoop.':'Fly through the opening.') :'';
  }
 };
}
