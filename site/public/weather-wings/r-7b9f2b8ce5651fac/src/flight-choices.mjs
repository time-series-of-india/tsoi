import {temperatureProgressLabel} from './flight-progress.mjs';
import {mountChoiceCarousel} from './choice-carousel.mjs';
import {mountSoundCredits} from './sound-credits.mjs';
import {PREPARED_ART} from './prepared-art.mjs';
import {mountFlightShare} from './flight-share-panel.mjs';
import {panelReturnTarget,openPausePanel} from './flight-focus.mjs';
import {rainfallChartSvg} from './rainfall-chart.mjs';
import {temperatureChartSvg} from './temperature-chart.mjs';
import {mountGameUtilities} from './game-utilities.mjs';
import {usesTemperatureHoops} from './temperature-hoop-course.mjs';
import {mountHoopControls} from './temperature-hoop-controls.mjs';
import {localProgressStore} from './flight-progress.mjs';
import {mountSoundMixer} from './sound-mixer.mjs';
import {watchFlightArtwork,renderLoadingProgress} from './loading-progress.mjs';
import {cityCardsMarkup,prepareCityCards} from './city-cards.mjs';
import {mountFlightSettings} from './flight-settings.mjs';
import {seedCityClimate,cityClimate} from './city-climate.mjs';
import {CLIMATE_CITIES,cityUrl} from './climate-cities.mjs';
import {mountBirdPreview} from './flight-previews.mjs';
import {mountOpeningScene} from './opening-scene.mjs';
import {BIRDS,BIRD_LABELS,CITY_BIRDS,defaultBirdForCity} from './birds.mjs';
export const FLIGHT_BIRDS=Object.freeze([...Object.values(CITY_BIRDS),'common-myna'].map(id=>Object.freeze({id,name:BIRDS[id].name,...BIRD_LABELS[id]})));
export function flightChoiceUrl(href,city,bird){const url=new URL(cityUrl(href,city));url.searchParams.set('bird',FLIGHT_BIRDS.some(b=>b.id===bird)?bird:'wire-tailed-swallow');url.searchParams.delete('intro');url.searchParams.set('start','1');return url.href}
export function adjacentCities(id){const ids=Object.keys(CLIMATE_CITIES),index=Math.max(0,ids.indexOf(id));return {previous:CLIMATE_CITIES[ids[(index+ids.length-1)%ids.length]],selected:CLIMATE_CITIES[ids[index]],next:CLIMATE_CITIES[ids[(index+1)%ids.length]]}}
export function mountFlightChoices(city,bird,{pause,resume,start,progressStore,data,settingsStore,viewport,onChoose=()=>{},openingStore,rememberedBird=false,canResume=()=>false,audio,metric='rainfall',targetTrial=false,hoopStore=null,onHoopChange=()=>{},getShareOptions=()=>({})}){
 let selectedMetric=metric,rainSettingsResume=false;
 let artworkReady=false,sceneReady=false,loadFailed=false,sceneFailed=false,starting=false,hasStarted=false,resumeOnClose=false,gradual=false,replay=false,chartRequest=0;
 let selectedCity=city,selectedBird=bird.id,birdChosen=rememberedBird||new URL(location.href).searchParams.has('bird');
 const dialog=document.createElement('dialog');dialog.className='flight-setup flight-home';dialog.setAttribute('aria-labelledby','flight-setup-title');
 dialog.innerHTML=`<canvas class="opening-canvas" role="img" aria-label="Painted city scenery and a gliding bird"></canvas>
 <div class="arrival-lettering" aria-hidden="true"><p class="arrival-wordmark">Weather Wings</p></div>
 <div class="choice-loading" hidden><span class="loading-label" role="status"></span><span class="loading-meter" role="progressbar" aria-label="Loading flight" aria-valuemin="0" aria-valuemax="100"><span class="loading-fill"></span></span></div>
 <div class="home-menu">
  <h1 id="flight-setup-title" class="home-title">Weather Wings<span class="home-subtitle">The Shape of Rain</span></h1>
  <nav class="home-top" aria-label="Help and flight settings"><button class="home-help text-button" type="button" aria-haspopup="dialog">How to play</button></nav>
  <div class="home-launch"><div class="home-metric" role="group" aria-label="Flight mode"><button type="button" class="text-button" data-metric="rainfall" aria-pressed="true"><strong>The Shape of Rain</strong><small>Rainfall · fly through gauge openings</small><span class="mode-preview" data-preview="rainfall" aria-hidden="true"></span></button><button type="button" class="text-button" data-metric="temperature" aria-pressed="false"><strong>Between Degrees</strong><small>Temperature · fly through hoops</small><span class="mode-preview" data-preview="temperature" aria-hidden="true"></span></button></div><button class="ink-button home-play" type="button" disabled>Play</button><button class="home-resume text-button" type="button" hidden>Resume flight</button></div>
  <nav class="home-selections" aria-label="Choose your flight"><button class="home-city text-button" type="button" aria-haspopup="dialog"><span>City</span><strong></strong></button><button class="home-bird text-button" type="button" aria-haspopup="dialog"><span>Bird</span><strong></strong></button></nav>
 </div>
`;
 document.querySelector('#app').append(dialog);

 const play=dialog.querySelector('.home-play'),home=dialog.querySelector('.home-menu'),loading=dialog.querySelector('.choice-loading');
 let artworkProgress={loaded:0,total:0},stopProgress=()=>{};
 function panel(name,title,body){const el=document.createElement('dialog');el.className='flight-source-panel home-panel '+name;el.setAttribute('aria-labelledby',name+'-title');el.innerHTML=`<h2 id="${name}-title">${title}</h2>${body}<button type="button" class="source-close text-button">Done</button>`;document.querySelector('#app').append(el);el.querySelector('.source-close').onclick=()=>el.close();return el}
 const cityPanel=panel('city-panel','Choose a city',`<p class="city-card-key">January–December rainfall · same scale in every city</p><div class="city-list" role="group" aria-label="City">${cityCardsMarkup()}</div>`);
 const birdPanel=panel('bird-panel','Choose a bird',`<div class="bird-list" role="group" aria-label="Bird">${FLIGHT_BIRDS.map(b=>`<button type="button" class="bird-card" data-bird="${b.id}"><canvas width="360" height="180" role="img"></canvas><strong>${b.name}</strong><span lang="${b.lang}">${b.native}<br>${b.roman}</span></button>`).join('')}</div>`);
 const settingsPanel=panel('settings-panel','Flight controls','<p class="settings-application" hidden>Changes apply when you restart. Resume keeps the current flight.</p><div class="choice-settings"></div>');
 settingsPanel.querySelector('.source-close').remove();
 settingsPanel.insertAdjacentHTML('beforeend','<div class="panel-actions"><button type="button" class="ink-button settings-apply">Apply & restart</button><button type="button" class="text-button settings-cancel">Close</button></div>');
 const mixerPanel=panel('sound-mixer-panel','Sound','<div class="sound-mixer-content"></div>');
 const hubPanel=panel('game-settings-panel','Settings','<div class="settings-sections"><button type="button" class="settings-flight text-button">Flight controls</button><button type="button" class="settings-mixer text-button">Sound</button><button type="button" class="settings-credits text-button">About & credits</button></div>');

 const mixer=audio?mountSoundMixer(mixerPanel.querySelector('.sound-mixer-content'),audio):null;
 const sourcePanel=document.createElement('dialog');sourcePanel.className='flight-source-panel home-panel credits-panel';sourcePanel.setAttribute('aria-labelledby','flight-source-title');
 sourcePanel.innerHTML=`<h2 id="flight-source-title" tabindex="-1" autofocus>About & credits</h2><p>Weather Wings<br>The Shape of Rain · Between Degrees<br>A game by Time Series of India</p><p class="source-station"></p><details class="credits-data"><summary>Climate data & sources</summary><p>WMO Member Nations (2023). <cite>WMO Climatological Standard Normals for 1991–2020 (NCEI Accession 0253808).</cite> Subset: monthly precipitation and average daily minimum/maximum temperature normals for five Indian stations (Mumbai Colaba, New Delhi Safdarjung, Bengaluru, Kolkata Alipore and Chennai Nungambakkam), archive version 5.5. NOAA National Centers for Environmental Information. Dataset. <a href="https://doi.org/10.25921/800j-vn07" target="_blank" rel="noopener">doi:10.25921/800j-vn07</a>. Accessed 26 September 2026.</p><p>These are long-term monthly averages. Continuous flight repeats the same twelve months.</p></details><details class="credits-recordings"><summary>Sound recordings</summary><div class="recording-credits"></div></details><button type="button" class="source-close retry-choice">Close</button>`;

 document.querySelector('#app').append(sourcePanel);mountSoundCredits(sourcePanel.querySelector('.credits-recordings'));sourcePanel.querySelector('.source-close').onclick=()=>sourcePanel.close();
 const helpPanel=panel('help-panel','How to play','<p class="help-goal">Fly through the openings from January to December.</p><p>Tap, click or press Space for a wingbeat. Repeated taps climb; stop tapping to glide down.</p><p class="help-data">Each gauge shows the city’s average rainfall for that month.</p><p class="help-recovery" hidden></p><p>Use Pause to take a break.</p>');
 const settings=mountFlightSettings(settingsPanel.querySelector('.choice-settings'),settingsStore,viewport,selectedBird);
 for(const card of birdPanel.querySelectorAll('[data-bird]'))mountBirdPreview(card.querySelector('canvas'),card.dataset.bird);
 const cityPicker=mountChoiceCarousel(cityPanel,{rail:cityPanel.querySelector('.city-list'),items:Object.values(CLIMATE_CITIES).map(c=>({id:c.id,name:c.name,image:PREPARED_ART.previews[c.id]})),selected:selectedCity.id,onSelect:selectCity});
 const birdPicker=mountChoiceCarousel(birdPanel,{rail:birdPanel.querySelector('.bird-list'),items:FLIGHT_BIRDS.map(b=>({id:b.id,name:b.name,short:b.id==='white-throated-kingfisher'?'Kingfisher':b.id==='purple-rumped-sunbird'?'Sunbird':b.id==='alexandrine-parakeet'?'Parakeet':b.id==='wire-tailed-swallow'?'Swallow':b.id==='indian-roller'?'Roller':'Myna',image:PREPARED_ART.birds[b.id][BIRDS[b.id].glidePose].src})),selected:selectedBird,onSelect:selectBird});
 const hoopControls=hoopStore?mountHoopControls(document.querySelector('#app'),{store:hoopStore,pause,resume,viewport:()=>viewport(BIRDS[selectedBird]),apply(values){onHoopChange(values);if(dialog.open)beginSelectedFlight(scene.departure);else{closeHub();pausePanel.close();start(settingsStore.resolve(viewport()))}}}):null;


 seedCityClimate(city,data);
 function modeUrl(href){const url=new URL(href);url.searchParams.set('metric',selectedMetric);return url.href}
 function renderMetric(){const temperature=selectedMetric==='temperature',targets=temperature,collection=temperature&&usesTemperatureHoops(selectedCity.id);dialog.querySelector('.home-city').hidden=false;updateResume();for(const button of dialog.querySelectorAll('[data-metric]'))button.setAttribute('aria-pressed',String(button.dataset.metric===selectedMetric));dialog.querySelector('.home-subtitle').textContent=temperature?'Between Degrees':'The Shape of Rain';cityPanel.querySelector('.city-card-key').textContent=temperature?'Monthly temperature ranges · same scale in every city':'January–December rainfall · same scale in every city';helpPanel.querySelector('.help-goal').textContent=collection?'Fly cleanly through a hoop to score, or fly entirely above or below it to skip.':targets?'Collect two targets each month: glide to the minimum, then climb to the maximum.':temperature?'Fly between the temperature lines from January to December.':'Fly through the openings from January to December.';helpPanel.querySelector('.help-data').textContent=collection?'Each hoop spans the monthly minimum and maximum. A smaller temperature difference makes a tighter opening.':targets?'Blue targets show monthly average daily minimum temperatures; warm-coloured targets show average daily maximums.':temperature?'The upper line shows the average daily maximum; the lower line shows the average daily minimum.':'Each gauge shows the city’s average rainfall for that month.';const recovery=helpPanel.querySelector('.help-recovery');recovery.hidden=!temperature;recovery.textContent=collection?'Each clean pass earns one point. Skipping is safe, but touching a rim ends the flight. Keep your body clear until you are fully through.':targets?'Each collected target earns one point. Missing a target lets you keep flying. Reach December to see your score out of 24.':'Brief touches are forgiven. Time outside uses your recovery allowance; returning between the lines restores it. Difficulty changes recovery time, keeping the temperature range true.';settings.setMetric(selectedMetric);if(cityPanel.open)prepareCityCards(cityPanel,'chooser',selectedMetric);renderCity()}
 for(const button of dialog.querySelectorAll('[data-metric]'))button.onclick=()=>{selectedMetric=button.dataset.metric;renderMetric()};
 function saveSettings(){settingsStore.save(settings.value)}
 settingsPanel.addEventListener('close',()=>{settings.set();if(rainSettingsResume)resume();rainSettingsResume=false});
 settingsPanel.querySelector('.settings-cancel').onclick=()=>settingsPanel.close();
 settingsPanel.querySelector('.settings-apply').onclick=()=>{saveSettings();const value=settingsStore.resolve(viewport());rainSettingsResume=false;settingsPanel.close();if(dialog.open)beginSelectedFlight(scene.departure);else{closeHub();pausePanel.close();start(value)}};
 function openRainControls(trigger){rainSettingsResume=pause();settings.set();showPanel(settingsPanel,trigger)}
 function reveal(){if(scene.learning)return;dialog.classList.add('home-revealed');home.inert=false;openingStore.arrive()}
 const scene=mountOpeningScene({container:dialog,audio,onPreviewReady(ready){dialog.classList.toggle('scenery-ready',ready);if(ready&&!gradual)reveal()},onReady(ready,failed=false){sceneReady=ready;sceneFailed=failed;updateLaunch()},onReveal:reveal});
 function showPanel(el,trigger){reveal();if(el===cityPanel)prepareCityCards(cityPanel,'chooser',selectedMetric);if(el===settingsPanel)el.querySelector('.settings-application').hidden=!canResume();el.showModal();if(el===cityPanel)cityPicker.show();if(el===birdPanel)birdPicker.show();el.addEventListener('close',()=>queueMicrotask(()=>{panelReturnTarget({learning:scene.learning,dialogs:[...document.querySelectorAll('dialog[open]')],trigger,canvas:document.querySelector('#scene'),lessonCanvas:dialog.querySelector('canvas')})?.focus({preventScroll:true})}),{once:true})}
 for(const [selector,el] of [['.home-city',cityPanel],['.home-bird',birdPanel],['.home-help',helpPanel]]){const button=dialog.querySelector(selector);button.onclick=()=>showPanel(el,button)}
 function updateResume(){dialog.querySelector('.home-resume').hidden=!canResume()||selectedMetric!==metric||selectedCity.id!==city.id||selectedBird!==bird.id}
 function renderBird(){updateResume();settings.selectBird(selectedBird);dialog.querySelector('.home-bird strong').textContent=BIRDS[selectedBird].name;birdPicker.set(selectedBird)}
 function renderCity(){cityPicker.set(selectedCity.id);dialog.querySelector('.home-city strong').textContent=selectedCity.name;for(const tile of cityPanel.querySelectorAll('[data-city]')){tile.setAttribute('aria-pressed',String(tile.dataset.city===selectedCity.id));const saved=(selectedMetric===metric?progressStore:localProgressStore(selectedMetric)).value.cities[tile.dataset.city];tile.querySelector('small').textContent=selectedMetric==='temperature'?temperatureProgressLabel(saved):saved.completed?'Completed':''}
  const request=++chartRequest;sourcePanel.querySelector('.source-station').textContent='Loading station…';cityClimate(selectedCity).then(climate=>{if(request!==chartRequest)return;dialog.querySelector('[data-preview=rainfall]').innerHTML=rainfallChartSvg(climate.rain,climate.station,climate.baseline,{prefix:'mode-rain',showLabels:false,showProgress:false,completed:true});dialog.querySelector('[data-preview=temperature]').innerHTML=temperatureChartSvg(climate,{showLabels:false});const target=sourcePanel.querySelector('.source-station');target.textContent=climate.station+' · '+climate.baseline+' normals. ';const link=document.createElement('a');link.textContent='Station data';link.href=climate.source;link.target='_blank';link.rel='noopener';target.append(link)}).catch(()=>{if(request===chartRequest)sourcePanel.querySelector('.source-station').textContent='Station details unavailable.'});
 }
 function selectScene(){stopProgress();sceneReady=false;sceneFailed=false;stopProgress=watchFlightArtwork(selectedCity.id,selectedBird,progress=>{artworkProgress=progress;updateLaunch()});const prepared=scene.select(selectedCity,selectedBird);canvasLabel();return prepared}
 function canvasLabel(){dialog.querySelector('canvas').setAttribute('aria-label',selectedCity.name+' scenery with '+BIRDS[selectedBird].name)}
 function selectCity(id){selectedCity=CLIMATE_CITIES[id];if(!birdChosen){selectedBird=defaultBirdForCity(id);renderBird()}renderMetric();selectScene()}
 function selectBird(id){birdChosen=true;selectedBird=id;renderBird();selectScene().then(()=>{if(selectedBird===id)audio?.previewBird(id)})}
 function updateLaunch(){
  if(!starting)play.textContent='Play';
  const waiting=!sceneReady||(selectedCity.id===city.id&&!artworkReady),failed=sceneFailed||(selectedCity.id===city.id&&loadFailed);
  play.disabled=waiting||starting;
  renderLoadingProgress(loading,{...artworkProgress,ready:!waiting,label:'Preparing '+selectedCity.name+'…',error:failed?'Artwork could not load. Choose another city or reload to try again.':''});
  if(failed)scene.reveal();
 }
 function open({welcome=false,settingsOnly=false,panel:requestedPanel=null}={}){resumeOnClose=pause();closeMenuPanels();starting=false;home.hidden=false;home.inert=false;settings.set();renderMetric();renderBird();gradual=welcome;dialog.classList.remove('home-revealed','scenery-ready');dialog.classList.toggle('home-gradual',gradual);home.inert=gradual;dialog.querySelector('.home-resume').hidden=!canResume();play.textContent='Play';if(!dialog.open)dialog.showModal();document.body.classList.add('opening-active');scene.show({gradual});selectScene();dialog.querySelector('.opening-canvas').focus({preventScroll:true});if(!gradual)reveal();if(settingsOnly)openHub(dialog.querySelector('.game-settings-toggle'));else if(requestedPanel==='city')showPanel(cityPanel,dialog.querySelector('.home-city'));else if(requestedPanel==='bird')showPanel(birdPanel,dialog.querySelector('.home-bird'))}
 dialog.querySelector('.home-resume').onclick=()=>{resumeOnClose=false;dialog.close();resume()};
 // A completed or failed flight cannot resume behind a dismissed menu.
 dialog.addEventListener('cancel',event=>{if(!hasStarted||scene.learning||!canResume())event.preventDefault();else resumeOnClose=true});
 dialog.addEventListener('close',()=>{if(dialog.open)return;stopProgress();scene.hide();document.body.classList.remove('opening-active');const status=document.querySelector('.rainfall-ui').dataset.status;audio?.update({city:city.id,bird:bird.id,phase:status==='running'?'flight':status});if(resumeOnClose&&!starting)resume()});
 function beginSelectedFlight(departure){closeHub();launch(departure)}
 function launch(departure){closeHub();starting=true;hasStarted=true;onChoose(selectedCity.id,selectedBird);saveSettings();const values=settingsStore.resolve(viewport()),href=modeUrl(settingsStore.url(location.href));if(selectedCity.id===city.id&&selectedBird===bird.id&&selectedMetric===metric){history.replaceState(null,'',href);dialog.close();start(values,departure)}else{play.textContent='Preparing flight…';play.disabled=true;location.assign(flightChoiceUrl(href,selectedCity.id,selectedBird))}}
 play.onclick=()=>{if(play.disabled)return;saveSettings();onChoose(selectedCity.id,selectedBird);if(selectedCity.id!==city.id||selectedBird!==bird.id||selectedMetric!==metric){starting=true;play.disabled=true;play.textContent='Preparing flight…';const next=new URL(flightChoiceUrl(modeUrl(settingsStore.url(location.href)),selectedCity.id,selectedBird));location.assign(next.href);return}launch(scene.departure)};
 const change=document.createElement('button');change.type='button';change.className='flight-choice-toggle';change.textContent='Main menu';change.onclick=()=>open();document.querySelector('.rainfall-ui').prepend(change);
 const pausePanel=panel('pause-panel','Flight paused','<div class="pause-actions"><button type="button" class="ink-button pause-resume">Resume flight</button><button type="button" class="text-button pause-restart">Restart flight</button><button type="button" class="text-button pause-settings">Settings</button><button type="button" class="text-button pause-menu">Main menu</button></div>');

 pausePanel.querySelector('.source-close').remove();
 const share=mountFlightShare(document.querySelector('#app'));
 const pauseShare=document.createElement('button');pauseShare.type='button';pauseShare.className='text-button pause-share';pauseShare.textContent='Share game';pauseShare.setAttribute('aria-haspopup','dialog');pausePanel.querySelector('.pause-actions').append(pauseShare);
 pauseShare.onclick=event=>share.open({city:city.id,bird:bird.id,metric,...getShareOptions()},event.currentTarget);
 pausePanel.querySelector('.pause-resume').onclick=()=>{pausePanel.close();resume()};
 pausePanel.querySelector('.pause-restart').onclick=()=>{pausePanel.close();saveSettings();start(settingsStore.resolve(viewport()))};
 pausePanel.querySelector('.pause-settings').onclick=()=>openHub(pausePanel.querySelector('.pause-settings'));
 pausePanel.querySelector('.pause-menu').onclick=()=>{pausePanel.close();open()};
 pausePanel.addEventListener('cancel',e=>{e.preventDefault();pausePanel.close();resume()});
 function showPause(){openPausePanel(document.querySelector('#app'),pausePanel,canResume)}
 document.querySelector('.flight-pause-toggle').addEventListener('click',showPause);
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!document.querySelector('dialog[open]'))queueMicrotask(showPause)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)showPause()});
 let hubResume=false,lessonResume=false;
 function closeMenuPanels(){rainSettingsResume=false;closeHub();hoopControls?.dismiss();for(const panel of document.querySelectorAll('#app dialog[open]'))if(panel!==dialog)panel.close()}
 function closeHub(){hubResume=false;lessonResume=false;if(hubPanel.open)hubPanel.close()}
 function openHub(trigger){if(!dialog.open){selectedCity=city;selectedBird=bird.id;selectedMetric=metric;settings.setMetric(metric);settings.selectBird(bird.id)}hubResume=pause();lessonResume=scene.suspend();showPanel(hubPanel,trigger)}
 hubPanel.addEventListener('close',()=>{if(hubResume)resume();if(lessonResume)scene.resume();hubResume=false;lessonResume=false});
 hubPanel.querySelector('.settings-flight').onclick=()=>{if(selectedMetric==='temperature'&&hoopControls)hoopControls.open();else openRainControls(hubPanel.querySelector('.settings-flight'))};
 hubPanel.querySelector('.settings-mixer').onclick=()=>{mixer?.refresh(dialog.open?selectedCity.id:city.id);showPanel(mixerPanel,hubPanel.querySelector('.settings-mixer'))};
 mixerPanel.addEventListener('close',()=>{mixer?.close()});
 hubPanel.querySelector('.settings-credits').onclick=()=>showPanel(sourcePanel,hubPanel.querySelector('.settings-credits'));
 mountGameUtilities(document.querySelector('#app'),{audio,openSettings:openHub});
 renderMetric();
 document.title='Weather Wings · '+(metric==='temperature'?'Between Degrees':'The Shape of Rain')+' · '+city.name;document.body.dataset.city=city.id;document.body.dataset.bird=bird.id;document.querySelector('#stage').setAttribute('aria-label',city.name+' '+metric+' flight');
 return {open,leave(){resumeOnClose=false;closeMenuPanels();if(dialog.open)dialog.close();scene.hide()},showLoading(){if(new URL(location.href).searchParams.get('start')!=='1')open({welcome:true});},failed(){loadFailed=true;updateLaunch()},ready(){artworkReady=true;updateLaunch();const url=new URL(location.href);if(url.searchParams.get('start')==='1'){url.searchParams.delete('start');url.searchParams.delete('lesson');history.replaceState(null,'',url);hasStarted=true;onChoose(city.id,bird.id);start(settingsStore.resolve(viewport()))}}};
}
