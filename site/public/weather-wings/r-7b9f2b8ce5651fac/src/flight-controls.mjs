import {mountFlightShare} from './flight-share-panel.mjs';
import {protectResultCard} from './result-input-guard.mjs';
import {seedCityClimate} from './city-climate.mjs';
import {mountBirdPreview,mountSceneryPreview} from './flight-previews.mjs';
import {temperatureChartSvg} from './temperature-chart.mjs';
import {rainfallChartSvg} from './rainfall-chart.mjs';
import {CLIMATE_CITIES} from './climate-cities.mjs';
import {nextUnfinishedCity} from './flight-progress.mjs';
// Pointer, keyboard and assistive clicks each produce one lift per activation.
export function bindFlapButton(button,activate){
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||button.disabled)return;
  event.preventDefault();button.focus({preventScroll:true});activate();
 });
 button.addEventListener('keydown',event=>{
  if(!['Space','Enter','ArrowUp'].includes(event.code))return;
  event.preventDefault();
  if(!event.repeat&&!button.disabled)activate();
 });
 button.addEventListener('click',event=>{
  if(event.detail===0&&!button.disabled)activate();
 });
}

export function createFlightControls(app,{flap,retry,continueFlight,choose,flyCity,data,city,bird,progressStore,metric='rainfall',targetTrial=false,hoopTrial=false,tunnelTrial=false,collectionTrial=false,getShareOptions=()=>({})}){
 const temperature=metric==='temperature';
 const chart=options=>temperature?temperatureChartSvg(data,options):rainfallChartSvg(data.rain,data.station,data.baseline,options);
 const dock=document.createElement('footer');dock.className='flight-dock';
 dock.innerHTML='<button type="button" class="flight-gutter" aria-label="Tap or press Space to flap" disabled></button>';
 const dialog=document.createElement('dialog');dialog.className='flight-retry result-card';
 dialog.setAttribute('aria-labelledby','flight-ended-title');dialog.setAttribute('aria-describedby','flight-ended-summary');
 dialog.innerHTML=`<div class="result-scenery"></div><canvas class="result-bird" width="240" height="130" role="img"></canvas><div class="result-content"><p class="result-kicker"></p><h2 id="flight-ended-title">Try ${city.name} again</h2><p id="flight-ended-summary"></p><p class="result-discovery" hidden>Each gauge’s blue water shows that month’s average rainfall.</p><div class="retry-signature" aria-label="Rainfall and cleared months"></div><button type="button" class="ink-button result-retry">Retry flight</button><nav class="result-navigation" aria-label="Flight choices"><button type="button" class="text-button" data-choice="city">Choose city</button><button type="button" class="text-button" data-choice="bird">Choose bird</button><button type="button" class="text-button" data-choice="menu">Main menu</button></nav></div>`;
 const achievement=document.createElement('dialog');achievement.className='flight-achievement result-card';achievement.setAttribute('aria-labelledby','flight-complete-title');
 achievement.innerHTML=`<div class="result-scenery"></div><canvas class="result-bird" width="240" height="130" role="img"></canvas><div class="result-content"><h2 id="flight-complete-title">${city.name} route complete</h2><p class="achievement-summary"></p><div class="achievement-chart">${chart({prefix:'achievement',completed:true,showProgress:false,showNotes:false})}</div><p class="achievement-source"></p></div><div class="completion-footer"><div class="achievement-actions"><button type="button" class="ink-button" data-action="next-city"></button><button type="button" class="ink-button" data-action="continue">Continue flying</button></div><nav class="result-navigation" aria-label="Flight choices"><button type="button" class="text-button" data-choice="menu">Main menu</button></nav></div>`;
 for(const card of [dialog,achievement]){card.querySelector('h2').tabIndex=-1;card.querySelector('h2').setAttribute('autofocus','')}
 const retryGuard=protectResultCard(dialog),completionGuard=protectResultCard(achievement);
 app.append(dock,dialog,achievement);
 for(const card of [dialog,achievement]){card.addEventListener('cancel',event=>event.preventDefault());for(const action of card.querySelectorAll('[data-choice]'))action.onclick=()=>{card.close();choose(action.dataset.choice)};}
 seedCityClimate(city,data);
 const preparedCards=new WeakSet();
 function prepareCard(card){
  if(preparedCards.has(card))return;preparedCards.add(card);
  mountSceneryPreview(card.querySelector('.result-scenery')).select(city);mountBirdPreview(card.querySelector('canvas'),bird.id);
  
 }
 const button=dock.querySelector('button'),summary=dialog.querySelector('#flight-ended-summary'),keepFlying=achievement.querySelector('[data-action="continue"]'),nextCityButton=achievement.querySelector('[data-action="next-city"]');
 let loaded=false,state={status:'ready',month:'January',passed:0,mode:'city',eligible:true};
 const share=mountFlightShare(app);
 for(const card of [dialog,achievement]){const button=document.createElement('button');button.type='button';button.className='text-button result-share';button.textContent='Share card';button.setAttribute('aria-haspopup','dialog');card.querySelector('.result-navigation').before(button);button.onclick=()=>share.open({city:city.id,bird:bird.id,metric,state:{...state},data,...getShareOptions()},button)}
 bindFlapButton(button,flap);dialog.querySelector('.result-retry').onclick=retry;
 keepFlying.onclick=continueFlight;
 nextCityButton.onclick=()=>{
  const next=nextUnfinishedCity(city.id,progressStore.value);
  if(next&&next!==city.id)flyCity(CLIMATE_CITIES[next]);
  else{achievement.close();choose('city')}
 };
 if(temperature){dialog.querySelector('.result-discovery').textContent='The two lines show average daily minimum and maximum temperatures. Return between them to restore your allowance.';dialog.querySelector('.retry-signature').setAttribute('aria-label','Temperature range and your flight')}
 if(hoopTrial){dialog.querySelector('.result-discovery').textContent='Keep the bird’s body between the maximum and minimum as you cross each hoop.';dialog.querySelector('.retry-signature').setAttribute('aria-label','Monthly temperature ranges and cleared hoops')}
 // Retry keeps its city and bird shortcuts.
 for(const card of [dialog]){
  const nav=card.querySelector('.result-navigation'),choices=document.createElement('div');choices.className='result-choices';
  for(const [key,label,value] of [['city','City',city.name],['bird','Bird',bird.name]]){const action=nav.querySelector(`[data-choice="${key}"]`);action.textContent='';const small=document.createElement('span');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;action.append(small,strong);action.setAttribute('aria-haspopup','dialog');choices.append(action)}
  nav.before(choices);
 }
 achievement.querySelector('.achievement-source').textContent=`${data.station} · ${data.baseline} normals`;
 function close(card){if(card.open)card.close()}
 function record(){if(state.eligible)progressStore.record(city.id,state)}
 function render(){
  record();button.disabled=!loaded||['splash','crashed','completed'].includes(state.status);
  button.setAttribute('aria-label',state.status==='ready'?'Tap or press Space to start flight':state.status==='paused'?'Tap or press Space to resume flight':'Tap or press Space to flap');
  if(state.status==='crashed'){
   prepareCard(dialog);
   if(state.firstAttempt||temperature)dialog.querySelector('.result-discovery').hidden=false;
   close(achievement);
   const count=state.mode==='city'?state.passed:state.passed%12,circuits=Math.floor(state.passed/12);
   dialog.querySelector('.result-kicker').textContent=state.mode==='endless'?'Continuous flight':'';
   summary.textContent=state.mode==='city'?`${count} of 12 months cleared · Reached ${state.month}`:`${circuits} ${circuits===1?'circuit':'circuits'} completed · Reached ${state.month}`;
   dialog.querySelector('.retry-signature').innerHTML=chart({prefix:'retry',showProgress:false,showLabels:false,cleared:count,hoops:hoopTrial,trace:hoopTrial?undefined:state.trace,targets:state.targets});
   if(hoopTrial){summary.textContent=`${state.passed}${state.mode==='endless'?'':' of 12'} hoops cleared · ${state.skipped??0} skipped · Clipped ${state.month}`;dialog.querySelector('.result-discovery').textContent=state.failedHoop?`${state.month}: ${state.failedHoop.low.toFixed(1)}–${state.failedHoop.high.toFixed(1)}°C. Keep the bird’s body clear of the rim until fully through.`:'Keep the bird’s body inside each hoop.'}
   else if(temperature)summary.textContent=summary.textContent.replace('months cleared','months flown')+' · Recovery allowance used up';
   if(!dialog.open)retryGuard.open();
  }else if(state.status==='completed'){
   prepareCard(achievement);
   const next=nextUnfinishedCity(city.id,progressStore.value);
   nextCityButton.textContent=next&&next!==city.id?`Fly to ${CLIMATE_CITIES[next].name}`:'Choose a city';
   if(temperature){
    achievement.querySelector('.achievement-chart').innerHTML=chart({...targetTrial?{targets:state.targets,hoops:hoopTrial,tunnels:tunnelTrial}:{trace:state.trace},showNotes:false});
    achievement.querySelector('.achievement-summary').textContent=collectionTrial?`${state.score}/24 readings · ${state.points} points`:tunnelTrial?`${state.score}/12 tunnels`:hoopTrial?`${state.passed}/12 hoops · ${state.passed===12&&(state.skipped??0)===0?'Perfect':`${state.skipped??0} skipped`}`:targetTrial?`${state.score}/24 targets`:`${Math.round((state.insideFraction??1)*100)}% inside the range`;
   }else achievement.querySelector('.achievement-summary').textContent=`12/12 months${state.eligible?' · Perfect':''}`;
   close(dialog);
   if(!achievement.open)completionGuard.open();
  }else{const wasOpen=dialog.open||achievement.open;close(dialog);close(achievement);if(wasOpen)document.querySelector('#scene').focus({preventScroll:true});}
 }
 return {update(next){state=next;render()},ready(){loaded=true;render()}};
}
