import {FLIGHT_MODELS,FLIGHT_PROFILES,normalizeFlightModel} from './flight-motion.mjs';
import {presetFlightSettings,isFlightPreset,FLIGHT_DIFFICULTIES} from './flight-difficulty.mjs';
import {normalizeTuning,TUNING_FIELDS} from './flight-tuning.mjs';
export const FLIGHT_SETTINGS=Object.freeze([
 {key:'speed',label:'Flight speed',low:'Slower',high:'Faster'},
 {key:'spacing',label:'Space between gauges',low:'Closer',high:'Further apart'},
 {key:'opening',label:'Opening size',low:'Narrower',high:'Wider'},
 {key:'flap',label:'Flap strength',low:'Gentler',high:'Stronger'},
 {key:'gravity',label:'Gravity',low:'Lighter',high:'Heavier'},
].map(field=>({...TUNING_FIELDS.find(tuning=>tuning.key===field.key),...field})));
const KEY='tsoi-flight-settings-v1';
const presetMode=value=>['default','easy','medium','hard'].includes(value)?'default':null;
export function normalizeFlightSettings(input){const all=normalizeTuning(input);return Object.fromEntries(FLIGHT_SETTINGS.map(({key})=>[key,all[key]]))}
export function flightSettingsUrl(href,input){const url=new URL(href),settings=normalizeFlightSettings(input?.values||input);if(isFlightPreset(input?.mode)){url.searchParams.set('difficulty',input.mode);url.searchParams.delete('flight')}else{url.searchParams.delete('difficulty');url.searchParams.set('flight',FLIGHT_SETTINGS.map(({key})=>settings[key]).join(','))}if(input?.motion!==undefined)url.searchParams.set('motion',normalizeFlightModel(input.motion));for(const key of ['tune','tune-portrait','tune-landscape'])url.searchParams.delete(key);return url.href}
export function createFlightSettings(href,storage){
 let saved;try{saved=JSON.parse(storage?.getItem(KEY)||'null')}catch{}
 const params=new URL(href).searchParams,encoded=params.get('flight');
 const allowFlappy=['dev','tune'].some(key=>params.get(key)==='1');
 let motion=allowFlappy?normalizeFlightModel(params.get('motion')??saved?.motion):'glide';
 let mode=presetMode(params.get('difficulty'))??(encoded!==null?'custom':presetMode(saved?.mode)??(saved?'custom':'default'));
 let value=normalizeFlightSettings(encoded===null?(saved?.values||saved):Object.fromEntries(FLIGHT_SETTINGS.map(({key},i)=>[key,encoded.split(',')[i]])));
 return {get motion(){return motion},get mode(){return mode},get value(){return {...value}},resolve(viewport){return isFlightPreset(mode)?presetFlightSettings(mode,viewport):this.value},url(href){return flightSettingsUrl(href,{mode,motion,values:value})},save(input){if(input?.motion!==undefined)motion=allowFlappy?normalizeFlightModel(input.motion):'glide';mode=presetMode(input?.mode)??'custom';value=normalizeFlightSettings(input?.values||input);try{storage?.setItem(KEY,JSON.stringify({mode,motion,values:value}))}catch{}return this.value}};
}
export function localFlightSettings(href){let storage;try{storage=window.localStorage}catch{}return createFlightSettings(href,storage)}
export function mountFlightSettings(container,store,viewport,bird='wire-tailed-swallow'){
 const debug=['dev','tune'].some(key=>new URL(location.href).searchParams.get(key)==='1');
 const field=f=>`<label class="menu-setting"><span>${f.label}</span><input aria-label="${f.label}" data-setting="${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}"><span class="setting-ends"><span>${f.low}</span><span>${f.high}</span></span></label>`;
 container.innerHTML=`<fieldset class="difficulty-options"><legend>Preset</legend>${Object.entries(FLIGHT_DIFFICULTIES).map(([id,preset])=>`<label><input type="radio" name="difficulty" value="${id}"><span>${preset.label}</span></label>`).join('')}<label><input type="radio" name="difficulty" value="custom"><span>Custom</span></label></fieldset><p class="flight-default-note">Moving a slider selects Custom.</p><div class="menu-settings"><p class="motion-summary" hidden></p><fieldset class="motion-options" ${debug?'':'hidden'}><legend>Flight style</legend>${Object.entries(FLIGHT_MODELS).map(([id,label])=>`<label><input type="radio" name="motion" value="${id}"><span>${label}</span></label>`).join('')}</fieldset><p class="motion-hint" aria-live="polite"></p>${FLIGHT_SETTINGS.filter(f=>!['flap','gravity'].includes(f.key)).map(field).join('')}<details class="advanced-flight"><summary>Advanced flight controls</summary>${FLIGHT_SETTINGS.filter(f=>['flap','gravity'].includes(f.key)).map(field).join('')}</details><button type="button" class="settings-defaults">Restore defaults</button></div><p class="calibration-readout" hidden></p>`;
 let mode='default',motion=store.motion,selectedBird=bird;
 const diagnostics=new URL(location.href).searchParams.get('calibration')==='1';
 function setValues(input){const values=normalizeFlightSettings(input);for(const field of FLIGHT_SETTINGS)container.querySelector(`[data-setting="${field.key}"]`).value=values[field.key]}
 function render(){
  for(const radio of container.querySelectorAll('[name="motion"]'))radio.checked=radio.value===motion;
  container.querySelector('.motion-summary').textContent=FLIGHT_MODELS[motion];
  container.querySelector('.motion-hint').textContent=motion==='glide'?'Tap to flap; stop tapping to glide down. '+(FLIGHT_PROFILES[selectedBird]?.feel||''):'Original flight: each tap gives a fixed lift, followed by a faster fall.';
  for(const radio of container.querySelectorAll('[name="difficulty"]'))radio.checked=radio.value===mode;
  container.querySelector('.menu-settings').hidden=false;container.querySelector('.flight-default-note').hidden=mode==='custom';
  const v=viewport(),settings=isFlightPreset(mode)?presetFlightSettings(mode,v):values();
  if(isFlightPreset(mode))setValues(settings);
  const readout=container.querySelector('.calibration-readout');readout.hidden=!diagnostics;
  if(diagnostics)readout.textContent=`Playfield ${Math.round(v.width)} × ${Math.round(v.height)} · bird ${v.birdWidth.toFixed(1)} · ${mode} ${settings.speed.toFixed(3)} / ${settings.spacing.toFixed(3)} / ${settings.opening.toFixed(3)}. Applies on next flight.`;
 }
 function values(){return normalizeFlightSettings(Object.fromEntries(FLIGHT_SETTINGS.map(f=>[f.key,container.querySelector(`[data-setting="${f.key}"]`).value])))}
 function set(){mode=store.mode;motion=store.motion;setValues(store.resolve(viewport()));render()}
 for(const radio of container.querySelectorAll('[name="motion"]'))radio.onchange=()=>{motion=radio.value;render()};
 for(const radio of container.querySelectorAll('[name="difficulty"]'))radio.onchange=()=>{if(radio.value==='custom'&&isFlightPreset(mode))setValues(presetFlightSettings(mode,viewport()));mode=radio.value;render()};
 for(const input of container.querySelectorAll('input[type="range"]'))input.oninput=()=>{mode='custom';render()};
 container.querySelector('.settings-defaults').onclick=()=>{mode='default';render()};
 const refresh=()=>{if(container.getClientRects().length)render()};window.addEventListener('resize',refresh);const scene=document.querySelector('#scene');if(scene)new ResizeObserver(refresh).observe(scene);set();
 return {set,setMetric(metric){const temperature=metric==='temperature';for(const [key,label,low,high] of [['spacing',temperature?'Month spacing':'Space between gauges','Closer','Further apart'],['opening',temperature?'Recovery allowance':'Opening size',temperature?'Less time':'Narrower',temperature?'More time':'Wider']]){const input=container.querySelector(`[data-setting="${key}"]`),row=input.closest('label');row.querySelector('span').textContent=label;input.setAttribute('aria-label',label);const ends=row.querySelector('.setting-ends');ends.children[0].textContent=low;ends.children[1].textContent=high}},selectBird(id){selectedBird=id;render()},get value(){return {mode,motion,values:isFlightPreset(mode)?presetFlightSettings(mode,viewport()):values()}}};
}
