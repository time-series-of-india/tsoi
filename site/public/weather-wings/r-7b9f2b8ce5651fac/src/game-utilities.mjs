// Shared controls move into the top dialog while retaining their screen position.
export function mountGameUtilities(app,{audio,openSettings}){
 const footer=document.createElement('nav');footer.className='game-utilities';footer.setAttribute('aria-label','Sound and flight');
 const sound=audio?.button(footer,'utility-sound');
 sound?.addEventListener('click',()=>{const dialogs=[...app.querySelectorAll('dialog[open]')];if(!dialogs.length)app.querySelector('#scene').focus({preventScroll:true});else if(dialogs.length===1&&dialogs[0].querySelector('.opening-practice:not([hidden])'))dialogs[0].querySelector('canvas').focus({preventScroll:true})});
 const flight=document.createElement('div');flight.className='utility-flight';
 for(const selector of ['.flight-pause-toggle','.flight-choice-toggle']){const button=app.querySelector(selector);if(button)flight.append(button)}footer.append(flight);
 // Keep each Settings trigger in its own surface, including while a child
 // dialog opens. Reparenting the focused trigger can disrupt touch and focus.
 function settingsButton(parent){const button=document.createElement('button');button.type='button';button.className='game-settings-toggle text-button';button.textContent='Settings';button.setAttribute('aria-haspopup','dialog');button.onclick=()=>openSettings(button);parent.append(button);return button}
 const settings=settingsButton(app),home=app.querySelector('.flight-home'),homeSettings=home?settingsButton(home):null;
 let stack=[...app.querySelectorAll('dialog[open]')];
 function place(){
  stack=stack.filter(el=>el.open&&el.isConnected);
  const parent=stack.at(-1)||app;
  if(footer.parentElement!==parent)parent.append(footer);
  const hideSettings=parent!==app;
  if(settings.hidden!==hideSettings)settings.hidden=hideSettings;
  if(homeSettings){const hideHomeSettings=parent!==home||!home.classList.contains('home-revealed')||!home.classList.contains('scenery-ready');if(homeSettings.hidden!==hideHomeSettings)homeSettings.hidden=hideHomeSettings}
  if(flight.hidden!==(parent!==app))flight.hidden=parent!==app;
 }
 const observer=new MutationObserver(changes=>{for(const change of changes){const el=change.target;if(el.tagName!=='DIALOG'||change.attributeName!=='open')continue;stack=stack.filter(d=>d!==el);if(el.open)stack.push(el)}place()});
 observer.observe(app,{attributes:true,attributeFilter:['open','class','hidden'],subtree:true});place();return {dispose(){observer.disconnect();footer.remove();settings.remove();homeSettings?.remove()}};
}
