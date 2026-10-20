import {defaultBirdForCity} from './birds.mjs';
import {backgroundBirds} from './ambient-mix.mjs';
import {MIX_CITIES,defaultSoundSettings} from './sound-settings.mjs';
const CITY_SOUNDS={mumbai:'Sea waves, birds and a light breeze.',chennai:'Sea waves, birds and a light breeze.',bengaluru:'More park birds, with a light breeze.',delhi:'City birds and a light breeze.',kolkata:'River ambience, birds and a light breeze.'};
const LEVELS={selected:'Your bird',background:'Other birds',air:'Breeze',sea:'Sea waves',river:'River',rain:'Rain',thunder:'Thunder'};
export function citySoundLayers(city){return Object.keys(LEVELS).filter(id=>id!=='sea'||['mumbai','chennai'].includes(city)).filter(id=>id!=='river'||city==='kolkata')}
export function resetCitySound(settings,city){const next=structuredClone(settings);next.cities[city]={...defaultSoundSettings().cities[city]};return next}
export function mountSoundMixer(container,audio){
 let editingCity=audio.status().city||'mumbai',custom=false,previewTimer,stopTimer,opened=false;
 const row=(key,label,max=200)=>`<label class="simple-mix-row" data-row="${key}"><span>${label}</span><output></output><input type="range" min="0" max="${max}" step="5" aria-label="${label}" data-level="${key}"></label>`;
 container.classList.add('sound-mixer','simple-mixer');container.innerHTML=`<p>Choose a city’s natural ambience. Changes are saved as you adjust.</p><label class="mix-city-label">City <select class="mix-city" aria-label="Sound city">${Object.entries(MIX_CITIES).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><p class="mix-city-description"></p>${row('master','Overall volume',100)}<div class="simple-presets" role="group" aria-label="Sound preset"><button type="button" class="text-button" data-preset="default">Default</button><button type="button" class="text-button" data-preset="custom">Custom</button></div><div class="simple-mix-levels">${Object.entries(LEVELS).map(([id,label])=>row(id,label)).join('')}<p class="mix-weather-note">Rain and thunder follow the weather during flight. 100% keeps the city’s default level.</p></div><button type="button" class="text-button mix-enable">Enable preview</button><p class="mix-status" role="status"></p>`;
 const $=s=>container.querySelector(s),city=$('.mix-city');
 function render(){const settings=audio.getSettings(),state=audio.status();city.value=editingCity;$('.mix-enable').hidden=state.enabled&&state.unlocked;$('.mix-city-description').textContent=CITY_SOUNDS[editingCity];for(const el of container.querySelectorAll('[data-row]')){const key=el.dataset.row,value=key==='master'?settings.master:settings.cities[editingCity][key];el.hidden=key!=='master'&&!citySoundLayers(editingCity).includes(key);el.querySelector('input').value=value;el.querySelector('output').textContent=value+'%'}$('.simple-mix-levels').hidden=false;for(const b of container.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String((b.dataset.preset==='custom')===custom));$('.mix-status').textContent=state.failed?'A recording could not load. Use Retry sound to try again.':state.enabled&&state.unlocked?`Previewing ${LEVELS[state.solo]||MIX_CITIES[editingCity]}.`:'Sound is off.'}
 function selectCity(id){clearTimeout(previewTimer);clearTimeout(stopTimer);editingCity=id;custom=citySoundLayers(id).some(key=>audio.getSettings().cities[id][key]!==100);audio.previewMix?.(id);render()}
 city.onchange=()=>selectCity(city.value);
 for(const input of container.querySelectorAll('[data-level]'))input.oninput=()=>{const settings=audio.getSettings(),key=input.dataset.level;if(key==='master')settings.master=Number(input.value);else{custom=true;settings.cities[editingCity][key]=Number(input.value)}audio.setSettings(settings);previewLayer(key);render()};
 for(const b of container.querySelectorAll('[data-preset]'))b.onclick=()=>{custom=b.dataset.preset==='custom';if(!custom)audio.setSettings(resetCitySound(audio.getSettings(),editingCity));clearTimeout(previewTimer);clearTimeout(stopTimer);audio.previewMix(editingCity);render()};
 function previewLayer(key){
  clearTimeout(previewTimer);clearTimeout(stopTimer);
  const state=audio.status();if(!opened||!state.enabled||!state.unlocked)return;
  previewTimer=setTimeout(()=>{
   if(!opened||!audio.status().enabled||!audio.status().unlocked)return;
   const bird=editingCity===audio.status().city?audio.currentBird():defaultBirdForCity(editingCity);
   const sound=key==='selected'?bird:key==='background'?backgroundBirds(editingCity).find(id=>id!==bird):key;
   if(key==='master'){audio.previewMix(editingCity);return}
   audio.audition(sound,key==='background'?'background':'selected');
   stopTimer=setTimeout(()=>{if(opened)audio.stopAudition()},3500);
  },120);
 }
 $('.mix-enable').onclick=async()=>{await audio.setEnabled(true);if(opened)selectCity(editingCity)};
 const unsubscribe=audio.subscribe(render);return {refresh(city=audio.status().city){opened=true;selectCity(city)},close(){opened=false;clearTimeout(previewTimer);clearTimeout(stopTimer);audio.stopPreviewMix?.();audio.stopAudition()},dispose:unsubscribe};
}
