import {FLAP_IMPULSE,GRAVITY,stepRainfallFlight} from './rainfall-mode.mjs';

export const FLIGHT_MODELS=Object.freeze({glide:'Glide',flappy:'Flappy'});
export const normalizeFlightModel=value=>Object.hasOwn(FLIGHT_MODELS,value)?value:'glide';
// Qualitative flight accounts inform the character; these are game coefficients.
// See FLIGHT_MODEL.md for evidence, inferences and the units used here.
export const FLIGHT_PROFILES=Object.freeze(Object.fromEntries(Object.entries({
 'wire-tailed-swallow':{stroke:.16,thrust:2.35,lift:.15,drag:2.15,climb:.32,feel:'Smooth lift and a gentle descending glide.'},
 'alexandrine-parakeet':{stroke:.20,thrust:2.05,lift:.12,drag:2.25,climb:.32,feel:'Longer strokes carry a steady climb.'},
 'indian-roller':{stroke:.19,thrust:2.05,lift:.12,drag:2.2,climb:.31,feel:'Broad, sustained strokes with a buoyant coast.'},
 'white-throated-kingfisher':{stroke:.13,thrust:2.8,lift:.09,drag:2.3,climb:.34,feel:'Brisk bursts and a more direct descent.'},
 'purple-rumped-sunbird':{stroke:.105,thrust:2.9,lift:.10,drag:2.65,climb:.30,feel:'Quick, small corrections and a short coast.'},
 'common-myna':{stroke:.17,thrust:2.3,lift:.14,drag:2.3,climb:.32,feel:'Steady bursts alternating with short glides.'},
}).map(([id,profile])=>[id,Object.freeze(profile)])));

export function createFlightMotion(bird,model='glide'){
 const profile=FLIGHT_PROFILES[bird]||FLIGHT_PROFILES['wire-tailed-swallow'];
 let selected=normalizeFlightModel(model),power=0;
 return {
  get model(){return selected},get powered(){return selected==='glide'&&power>0},
  reset(model=selected){selected=normalizeFlightModel(model);power=0},
  snapshot(){return {model:selected,power}},
  restore(state){selected=normalizeFlightModel(state.model);power=Math.max(0,Math.min(profile.stroke,state.power||0))},
  flap(vy,tuning={}){
   if(selected==='flappy')return FLAP_IMPULSE*(tuning.flap??1);
   // Refresh a finite stroke; rapid inputs cannot accumulate stored lift.
   power=profile.stroke;return vy;
  },
  step(y,vy,dt,tuning={}){
   if(selected==='flappy')return stepRainfallFlight(y,vy,dt,tuning.gravity??1);
   let remaining=Math.max(0,dt);
   while(remaining>1e-10){
    const powered=power>1e-10,h=Math.min(remaining,powered?power:remaining);
    // Gravity is shared. Lift and velocity-dependent drag give a sinking coast.
    const force=GRAVITY*(tuning.gravity??1)-profile.lift-(powered?profile.thrust*(tuning.flap??1):0);
    const terminal=force/profile.drag,decay=Math.exp(-profile.drag*h);
    const next=terminal+(vy-terminal)*decay,cap=-profile.climb;
    if(next<cap){
     // Integrate to the climb cap, then continue at that speed.
     const hit=vy<=cap?0:Math.max(0,Math.min(h,-Math.log((cap-terminal)/(vy-terminal))/profile.drag));
     y+=terminal*hit+(vy-terminal)*(1-Math.exp(-profile.drag*hit))/profile.drag+cap*(h-hit);vy=cap;
    }else{y+=terminal*h+(vy-terminal)*(1-decay)/profile.drag;vy=next}
    power=Math.max(0,power-h);remaining-=h;
   }
   return {y,vy};
  },
 };
}
