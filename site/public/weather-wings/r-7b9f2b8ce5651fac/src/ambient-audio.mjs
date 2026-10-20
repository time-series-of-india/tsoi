import {defaultBirdForCity} from './birds.mjs';
import {ambientMix,backgroundBirds,SOUND_BEDS,SOUND_BIRDS,SOUND_ASSETS} from './ambient-mix.mjs';
import {SOUND_SETTINGS_KEY,defaultSoundSettings,normalizeSoundSettings,soundMultiplier} from './sound-settings.mjs';
const KEY='weather-wings-sound-v1';
// Audio owns no gameplay timers. Its low-frequency scheduler stops when hidden.
export function createAmbientAudio({contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),fetcher=fetch,storage,random=Math.random,onChange=()=>{}}={}){
 let enabled=false,settings=defaultSoundSettings(),saved=Boolean(storage);
 try{enabled=storage?.getItem(KEY)==='on';const value=storage?.getItem(SOUND_SETTINGS_KEY);if(value)settings=normalizeSoundSettings(JSON.parse(value))}catch{saved=false}
 let context,master,timer=null,disposed=false,unlocked=false,failed=false,generation=0,activation=0,solo=null,previewCity=null;
 let state={city:'mumbai',bird:'wire-tailed-swallow',phase:'loading',rain:0,section:0,opening:0,hidden:false};
 const buffers=new Map(),pending=new Map(),beds=new Map(),voices=new Set(),failures=new Map(),listeners=new Set();
 let nextBird=0,nextBackground=0,openingCalled=false,nextThunder=0;
 const interval=type=>settings.timing[type+'Min']+random()*(settings.timing[type+'Max']-settings.timing[type+'Min']);
 const heard=()=>previewCity?{...state,city:previewCity,bird:previewCity===state.city?state.bird:defaultBirdForCity(previewCity),phase:'flight',rain:0,section:0}:state;
 const multiplier=(layer,bird)=>soundMultiplier(settings,heard().city,layer,bird);
 function status(){return {enabled,unlocked,failed,active:enabled&&unlocked&&!state.hidden,loaded:buffers.size,voices:voices.size,city:state.city,phase:state.phase,previewCity,solo,saved}}
 function notify(){onChange(status());for(const fn of listeners)fn(status())}
 function subscribe(fn){listeners.add(fn);fn(status());return ()=>listeners.delete(fn)}
 async function load(id){
  if(buffers.has(id))return buffers.get(id);if(pending.has(id))return pending.get(id);
  if((failures.get(id)||0)>Date.now())return null;
  const job=(async()=>{try{const r=await fetcher(new URL('../'+SOUND_ASSETS[id],import.meta.url));if(!r.ok)throw Error('Audio '+r.status);const b=await context.decodeAudioData(await r.arrayBuffer());buffers.set(id,b);return b}catch{failures.set(id,Date.now()+30000);if(enabled&&!disposed){failed=true;notify()}return null}finally{pending.delete(id)}})();pending.set(id,job);return job;
 }
 function remove(voice){if(!voices.delete(voice))return;voice.source.disconnect();voice.gain.disconnect();voice.pan?.disconnect()}
 function stopVoice(voice){try{voice.source.stop()}catch{}remove(voice)}
 function clearCalls(){for(const v of [...voices])if(!v.bed)stopVoice(v)}
 function source(buffer,volume,pan=0){
  const node=context.createBufferSource(),gain=context.createGain(),panner=context.createStereoPanner?.();node.buffer=buffer;gain.gain.value=volume;node.connect(gain);if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(master)}else gain.connect(master);
  const voice={source:node,gain,pan:panner,bed:false};voices.add(voice);node.onended=()=>{remove(voice);voice.finished?.()};return voice;
 }
 async function call(id,volume,pan=0,delay=0,preview=false,role='selected'){
  const bird=SOUND_BIRDS.includes(id)?id:null;
  if(!enabled||!unlocked||state.hidden||volume*multiplier(role,bird)<=0||settings.master===0||(!preview&&['loading','paused','crashed','completed','splash'].includes(heard().phase)))return;
  const stamp=generation,b=await load(id);if(!b||disposed||stamp!==generation||!enabled||!unlocked||state.hidden)return;
  const v=source(b,volume*multiplier(role,bird),pan);Object.assign(v,{volume,role,bird});v.source.start(context.currentTime+delay);return v;
 }
 // Overlap loop boundaries so neither codec padding nor cut points make a click.
 function scheduleBed(id,entry){
  const b=buffers.get(id);if(!b)return;const now=context.currentTime;
  if(entry.next>now+.35)return;
  const start=Math.max(now,entry.next||now),fade=Math.min(1.5,b.duration/4),v=source(b,0);v.bed=true;
  v.gain.disconnect();v.gain.connect(entry.gain);v.pan?.disconnect();
  v.gain.gain.setValueAtTime(0,start);v.gain.gain.linearRampToValueAtTime(1,start+fade);v.gain.gain.setValueAtTime(1,start+b.duration-fade);v.gain.gain.linearRampToValueAtTime(0,start+b.duration);
  v.source.start(start);v.source.stop(start+b.duration);entry.next=start+b.duration-fade;
 }
 function tick(){
  if(!enabled||!unlocked||state.hidden||disposed)return;
  const now=context.currentTime,playing=heard(),mix=ambientMix(playing,settings);
  master.gain.setTargetAtTime(settings.master/100,now,.12);
  for(const v of voices)if(!v.bed&&v.role)v.gain.gain.setTargetAtTime(v.volume*multiplier(v.role,v.bird),now,.08);
  for(const id of SOUND_BEDS){
   const level=(solo?(solo===id?.3:0):mix[id])*multiplier(id);let entry=beds.get(id);
   if(level>.001&&settings.master>0&&!buffers.has(id))load(id);
   if(!entry&&buffers.has(id)){const gain=context.createGain();gain.gain.value=0;gain.connect(master);entry={gain,next:0};beds.set(id,entry)}
   if(entry){entry.gain.gain.setTargetAtTime(level,now,solo?.1:.8);if(level>.001&&settings.master>0)scheduleBed(id,entry)}
  }
  if(solo)return;
  if(playing.phase==='opening'){
   if(settings.opening.birdCall&&state.opening>=settings.opening.birdCallAt&&state.opening<Math.min(10,settings.opening.birdCallAt+3.2)&&!openingCalled){openingCalled=true;call(state.bird,.22,-.12);nextBird=now+interval('selected')}
  }else if(mix.selected>.001&&now>=nextBird){call(playing.bird,.22*mix.selected,-.12);nextBird=now+interval('selected')}
  if(mix.birds>.001&&now>=nextBackground){const choices=backgroundBirds(playing.city).filter(id=>id!==playing.bird);call(choices[Math.floor(random()*choices.length)],.085*Math.min(1.2,mix.birds),(random()-.5)*1.3,0,false,'background');nextBackground=now+interval('background')/Math.max(.5,mix.birds)}
 }
 function startTimer(){if(timer===null)timer=setInterval(tick,250);tick()}
 function stopTimer(){if(timer!==null)clearInterval(timer);timer=null}
 async function unlock(){
  if(!enabled||disposed)return false;
  const attempt=++activation;
  try{context??=contextFactory();if(!master){master=context.createGain();master.gain.value=0;master.connect(context.destination)}
   await context.resume();if(attempt!==activation||!enabled||disposed||state.hidden)return false;
   unlocked=context.state==='running';failed=!unlocked;
   if(unlocked){master.gain.setTargetAtTime(settings.master/100,context.currentTime,.3);nextBird=context.currentTime+Math.min(20,settings.timing.selectedMin);nextBackground=context.currentTime+Math.min(7,settings.timing.backgroundMin);startTimer()}
  }catch{if(attempt!==activation)return false;unlocked=false;failed=true}notify();return unlocked;
 }
 async function setEnabled(value){enabled=Boolean(value);generation++;try{storage?.setItem(KEY,enabled?'on':'off')}catch{}
  if(enabled){failed=false;failures.clear();notify();return unlock()}
  const attempt=++activation;solo=null;
  stopTimer();clearCalls();for(const v of [...voices])stopVoice(v);for(const b of beds.values()){b.next=0;b.gain.gain.value=0}if(master)master.gain.value=0;if(context)await context.suspend().catch(()=>{});if(attempt===activation){unlocked=false;notify()}return false;
 }
 function setSettings(value,{persist=true}={}){
  const next=normalizeSoundSettings(value),timingChanged=JSON.stringify(settings.timing)!==JSON.stringify(next.timing);settings=next;
  if(persist){try{if(!storage)throw Error('Storage unavailable');storage.setItem(SOUND_SETTINGS_KEY,JSON.stringify(settings));saved=true}catch{saved=false}}
  if(timingChanged&&context){nextBird=context.currentTime+interval('selected');nextBackground=context.currentTime+interval('background');nextThunder=0}
  tick();notify();return normalizeSoundSettings(settings);
 }
 function update(patch){
  const previous=state;state={...state,...patch};
  if(previous.city!==state.city||previous.bird!==state.bird||previous.phase!==state.phase){generation++;clearCalls();solo=null;nextBird=(context?.currentTime||0)+Math.min(25,settings.timing.selectedMin);nextBackground=(context?.currentTime||0)+Math.min(5,settings.timing.backgroundMin);if(state.phase==='opening')openingCalled=false;notify()}
  if(state.hidden!==previous.hidden){generation++;clearCalls();solo=null;if(state.hidden){activation++;stopTimer();if(master)master.gain.value=0;context?.suspend().catch(()=>{});unlocked=false;for(const v of [...voices])stopVoice(v);for(const b of beds.values())b.next=0;notify()}else if(enabled)unlock()}
 }
 function previewBird(bird){generation++;update({bird});solo=null;if(context)nextBird=context.currentTime+interval('selected');clearCalls();return call(bird,.22,-.12,0,true)}
 function flockCalls(){if(solo||state.phase!=='flight'||previewCity)return;call(state.bird,.12,.45,0,false,'selected');call(state.bird,.09,-.18,1.1,false,'selected')}
 function thunder(){if(solo||!context||context.currentTime<nextThunder||state.phase!=='flight')return;nextThunder=context.currentTime+settings.timing.thunderGap;return call('thunder',.25,random()*.5-.25,interval('thunder'),false,'thunder')}
 function stopAudition(){generation++;solo=null;clearCalls();tick();notify()}
 async function audition(id,role='selected'){
  if(![...SOUND_BEDS,...SOUND_BIRDS,'thunder'].includes(id))return;
  if(!enabled||!unlocked)await setEnabled(true);if(!unlocked)return;
  generation++;clearCalls();solo=id;tick();notify();if(SOUND_BEDS.includes(id))return;
  const stamp=generation,voice=await call(id,id==='thunder'?.25:role==='background'?.085:.22,0,0,true,id==='thunder'?'thunder':role);
  if(stamp!==generation)return;
  if(voice)voice.finished=()=>{if(generation===stamp){solo=null;tick();notify()}};else{solo=null;tick();notify()}
 }
 function previewMix(city){previewCity=city;generation++;solo=null;clearCalls();nextBird=(context?.currentTime||0)+.3;nextBackground=(context?.currentTime||0)+2;tick();notify()}
 function stopPreviewMix(){previewCity=null;generation++;clearCalls();nextBird=(context?.currentTime||0)+interval('selected');tick();notify()}
 function dispose(){disposed=true;generation++;stopTimer();for(const v of [...voices])stopVoice(v);context?.close().catch(()=>{});listeners.clear()}
 return {previewMix,stopPreviewMix,update,unlock,setEnabled,setSettings,getSettings:()=>normalizeSoundSettings(settings),currentBird:()=>state.bird,previewBird,flockCalls,thunder,audition,stopAudition,dispose,status,tick,subscribe};
}
export function mountAmbientAudio(){
 const buttons=new Set();let storage;try{storage=window.localStorage}catch{}
 const engine=createAmbientAudio({storage,onChange:render});
 function render(){const s=engine.status();for(const b of buttons){b.textContent=s.failed?'Retry sound':s.enabled&&s.unlocked?'Sound on':'Enable sound';b.setAttribute('aria-pressed',String(s.enabled&&s.unlocked));b.title=s.failed?'Retry natural sounds':s.enabled&&s.unlocked?'Mute natural sounds':'Enable natural sounds'}}
 function button(parent,className=''){const b=document.createElement('button');b.type='button';b.className='text-button sound-toggle '+className;b.onclick=()=>{const s=engine.status();engine.setEnabled(s.failed||!(s.enabled&&s.unlocked))};parent.append(b);buttons.add(b);render();return b}
 const gesture=e=>{if(e.target.closest?.('.sound-toggle'))return;const s=engine.status();if(s.enabled&&!s.unlocked)engine.unlock()};document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
 document.addEventListener('visibilitychange',()=>engine.update({hidden:document.hidden}));window.addEventListener('pagehide',()=>engine.update({hidden:true}));window.addEventListener('pageshow',()=>engine.update({hidden:document.hidden}));
 window.addEventListener('storage',event=>{if(event.key!==SOUND_SETTINGS_KEY)return;try{engine.setSettings(event.newValue?JSON.parse(event.newValue):defaultSoundSettings(),{persist:false})}catch{}});
 return {...engine,button};
}
