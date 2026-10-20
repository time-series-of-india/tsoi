import {HOOP_FIELDS,defaultHoopSettings,normalizeHoops,hoopSettingsUrl,hoopSpeedMaximum} from './temperature-hoop-settings.mjs';
export function mountHoopControls(app,{store,pause,resume,apply,viewport}){
 const dialog=document.createElement('dialog');dialog.className='collection-controls flight-source-panel';dialog.setAttribute('aria-labelledby','collection-controls-title');
 const field=f=>`<label class="collection-field"><span>${f.label}</span><output data-value="${f.key}"></output><input type="range" aria-label="${f.label}" data-control="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}"><small>${f.hint}</small></label>`;
 dialog.innerHTML=`<h2 id="collection-controls-title">Flight controls</h2><p>Adjust the next flight. Applying restarts from January.</p><div class="simple-presets" role="group" aria-label="Flight preset"><button type="button" class="text-button" data-preset="default">Default</button><button type="button" class="text-button" data-preset="custom">Custom</button></div>${HOOP_FIELDS.filter(f=>!['flap','gravity'].includes(f.key)).map(field).join('')}<details class="advanced-flight"><summary>Advanced flight controls</summary>${HOOP_FIELDS.filter(f=>['flap','gravity'].includes(f.key)).map(field).join('')}</details><div class="collection-actions"><button type="button" class="text-button" data-action="defaults">Restore defaults</button></div><p class="collection-status" role="status"></p><div class="collection-actions"><button type="button" class="ink-button" data-action="apply">Apply & restart</button><button type="button" class="text-button" data-action="close">Close</button></div>`;
 const scroll=document.createElement('div');scroll.className='hoop-settings-scroll';for(const el of [...dialog.children].slice(2,-1))scroll.append(el);dialog.insertBefore(scroll,dialog.lastElementChild);
 app.append(dialog);let wasRunning=false,applying=false,trigger=null;
 const status=dialog.querySelector('.collection-status');let custom=false;
 const values=()=>normalizeHoops(Object.fromEntries(HOOP_FIELDS.map(f=>[f.key,dialog.querySelector(`[data-control="${f.key}"]`).value])));
 function render(){const v=values();for(const f of HOOP_FIELDS)dialog.querySelector(`[data-value="${f.key}"]`).textContent=v[f.key].toFixed(f.step<1?2:0)+' '+f.unit;for(const b of dialog.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String((b.dataset.preset==='custom')===custom))}
 function set(v){dialog.querySelector('[data-control="speed"]').max=hoopSpeedMaximum(viewport());for(const f of HOOP_FIELDS)dialog.querySelector(`[data-control="${f.key}"]`).value=v[f.key];render()}
 for(const input of dialog.querySelectorAll('input'))input.oninput=()=>{custom=true;status.textContent='Not applied yet.';render()};
 dialog.querySelector('[data-action="defaults"]').onclick=()=>{custom=false;set(defaultHoopSettings(viewport()));status.textContent='Defaults ready. Apply to restart.'};
 for(const b of dialog.querySelectorAll('[data-preset]'))b.onclick=()=>{custom=b.dataset.preset==='custom';if(!custom)set(defaultHoopSettings(viewport()));render()};
 dialog.querySelector('[data-action="apply"]').onclick=()=>{const v=store.save(values(),custom?'custom':'default');history.replaceState(null,'',hoopSettingsUrl(location.href,v,store.mode));applying=true;dialog.close();apply(v)};
 dialog.querySelector('[data-action="close"]').onclick=()=>dialog.close();
 const refresh=()=>{if(dialog.open&&!custom)set(defaultHoopSettings(viewport()))};
 window.addEventListener('resize',refresh);const scene=app.querySelector('#scene');if(scene)new ResizeObserver(refresh).observe(scene);
 dialog.addEventListener('close',()=>{if(!applying&&wasRunning)resume();if(!applying&&!wasRunning)trigger?.focus({preventScroll:true})});
 return {dismiss(){applying=true;wasRunning=false;if(dialog.open)dialog.close()},open(){if(dialog.open)return;trigger=document.activeElement;wasRunning=pause();applying=false;custom=store.mode==='custom';set(store.value);status.textContent='';dialog.showModal();scroll.scrollTop=0}};
}
