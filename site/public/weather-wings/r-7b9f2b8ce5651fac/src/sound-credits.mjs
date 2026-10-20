// Keep the bundled attribution document as the single source for recording credits.
export function mountSoundCredits(details){
 let loaded=false,pending=false;
 details.addEventListener('toggle',async()=>{
  if(!details.open||loaded||pending)return;pending=true;const content=details.querySelector('.recording-credits');content.textContent='Loading recordings…';
  try{const response=await fetch(new URL('../assets/audio/credits.html',import.meta.url));if(!response.ok)throw Error('Credits unavailable');const documentSource=new DOMParser().parseFromString(await response.text(),'text/html');const nodes=[...documentSource.body.children].filter(el=>['P','UL'].includes(el.tagName));if(!nodes.length)throw Error('Credits unavailable');content.replaceChildren(...nodes.map(el=>document.importNode(el,true)));for(const link of content.querySelectorAll('a')){link.target='_blank';link.rel='noopener'}loaded=true}
  catch{content.textContent='Recordings could not load. Close and reopen this section to retry.'}finally{pending=false}
 });
}
