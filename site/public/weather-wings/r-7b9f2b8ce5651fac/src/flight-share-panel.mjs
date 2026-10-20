import {flightShareModel,shareOrCopy} from './flight-share.mjs';
import {flightShareCard} from './flight-share-card.mjs';
import {cityClimate} from './city-climate.mjs';
import {panelReturnTarget} from './flight-focus.mjs';

const panels=new WeakMap();
export function mountFlightShare(app){
 if(panels.has(app))return panels.get(app);
 const panel=document.createElement('dialog');panel.className='flight-source-panel home-panel flight-share-panel';panel.setAttribute('aria-labelledby','flight-share-title');
 panel.innerHTML='<h2 id="flight-share-title" tabindex="-1">Share</h2><div class="share-preview" aria-busy="true"><span class="share-placeholder" role="status">Preparing card…</span><img class="share-card-image" alt="" hidden></div><p class="share-context"></p><p class="share-status" role="status"></p><div class="share-actions"><button type="button" class="ink-button share-native">Share</button><a class="text-button share-download" hidden>Save card</a><button type="button" class="text-button share-close">Close</button></div>';
 app.append(panel);const $=selector=>panel.querySelector(selector),status=$('.share-status'),native=$('.share-native'),image=$('.share-card-image'),download=$('.share-download');
 let model,file,objectUrl,ticket=0,trigger,timer;
 function clearImage(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;file=null;image.hidden=download.hidden=true;image.removeAttribute('src');download.removeAttribute('href')}
 function shareLabel(){return canShareImage()?'Share card':typeof navigator.share==='function'?'Share text & link':'Copy text & link'}
 function canShareImage(){try{return Boolean(typeof navigator.share==='function'&&file&&navigator.canShare?.({files:[file]}))}catch{return false}}
 panel.addEventListener('close',()=>{ticket++;clearTimeout(timer);clearImage();queueMicrotask(()=>panelReturnTarget({dialogs:[...app.querySelectorAll('dialog[open]')],trigger,canvas:app.querySelector('#scene')})?.focus({preventScroll:true}))});
 $('.share-close').onclick=()=>panel.close();
 async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true}
  catch{
   const input=document.createElement('textarea');input.value=text;input.readOnly=true;input.style.cssText='position:fixed;opacity:0;pointer-events:none';panel.append(input);
   try{input.select();return document.execCommand('copy')}catch{return false}
   finally{input.remove();if(panel.open)native.focus({preventScroll:true})}
  }
 }
 native.onclick=async()=>{
  const current=ticket,payload={title:model.title,text:model.text.replace('\n'+model.url,''),url:model.url};
  if(canShareImage())payload.files=[file];
  clearTimeout(timer);native.disabled=true;
  const outcome=await shareOrCopy(navigator,payload,model.text,text=>current===ticket?copyText(text):false);
  if(current!==ticket)return;native.disabled=false;
  native.textContent=outcome==='copied'?'Copied to clipboard':outcome==='failed'?'Couldn’t copy':shareLabel();
  if(outcome==='copied'||outcome==='failed')timer=setTimeout(()=>{native.textContent=shareLabel()},2200);
 };
 const api={async open(options,button){
  if(panel.open)return;trigger=button;const current=++ticket;clearImage();clearTimeout(timer);
  const canonical=document.querySelector('meta[name="weather-wings-share-url"]')?.content;
  model=flightShareModel({...options,href:canonical||new URL('rainfall.html',document.baseURI).href});
  $('#flight-share-title').textContent='Share '+model.city.name;$('.share-context').textContent=model.city.name+' · '+(options.metric==='temperature'?'Temperature':'Rainfall')+' · '+model.bird.name;$('.share-preview').setAttribute('aria-busy','true');$('.share-placeholder').hidden=false;$('.share-placeholder').textContent='Preparing card…';native.disabled=true;native.textContent='Preparing…';status.textContent='';
  panel.showModal();$('#flight-share-title').focus({preventScroll:true});
  try{
   const data=options.data??await cityClimate(model.city);if(current!==ticket)return;
   const blob=await flightShareCard(model,data);if(current!==ticket)return;
   objectUrl=URL.createObjectURL(blob);file=new File([blob],`weather-wings-${model.city.id}-${options.metric}.png`,{type:'image/png'});
   image.src=objectUrl;image.alt=model.city.name+' · '+(options.metric==='temperature'?'Monthly average daily minimum and maximum temperatures':'Monthly average rainfall')+' · '+data.baseline+' · '+data.station;image.hidden=false;
   download.href=objectUrl;download.download=file.name;download.hidden=canShareImage();native.disabled=false;native.textContent=canShareImage()?'Share card':typeof navigator.share==='function'?'Share text & link':'Copy text & link';$('.share-preview').setAttribute('aria-busy','false');$('.share-placeholder').hidden=true;
  }catch{if(current===ticket){native.disabled=false;native.textContent=shareLabel();$('.share-preview').setAttribute('aria-busy','false');$('.share-placeholder').textContent='Image unavailable';status.textContent=''}}
 }};panels.set(app,api);return api;
}
