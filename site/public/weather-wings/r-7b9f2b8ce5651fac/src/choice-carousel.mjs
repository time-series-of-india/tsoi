// A scrollable focus card and an always-visible strip share one selection.
export function mountChoiceCarousel(panel,{rail,items,selected,onSelect}){
 panel.classList.add('choice-carousel-panel');rail.classList.add('choice-rail');
 const cards=[...rail.children];let current=selected,timer,centering=false;
 const strip=document.createElement('div');strip.className='choice-strip';strip.setAttribute('role','group');strip.setAttribute('aria-label','All options');
 for(const item of items){const button=document.createElement('button');button.type='button';button.className='choice-thumbnail';button.setAttribute('aria-label',item.name);const img=document.createElement('img');img.src=item.image;img.alt='';button.append(img);const label=document.createElement('span');label.textContent=item.short||item.name;button.append(label);button.onclick=()=>select(item.id);strip.append(button)}
 rail.after(strip);
 const navigation=document.createElement('div');navigation.className='choice-navigation';navigation.innerHTML='<button type="button" class="text-button">Previous</button><span aria-live="polite"></span><button type="button" class="text-button">Next</button>';strip.after(navigation);
 const move=offset=>select(items[(items.findIndex(i=>i.id===current)+offset+items.length)%items.length].id);
 navigation.firstElementChild.onclick=()=>move(-1);navigation.lastElementChild.onclick=()=>move(1);
 function paint(){items.forEach((item,i)=>{const active=item.id===current;cards[i].setAttribute('aria-pressed',String(active));strip.children[i].setAttribute('aria-pressed',String(active))});navigation.querySelector('span').textContent=(items.findIndex(i=>i.id===current)+1)+' of '+items.length}
 function center(){if(!panel.open)return;const card=cards[items.findIndex(i=>i.id===current)];centering=true;clearTimeout(timer);rail.scrollLeft=card.offsetLeft-(rail.clientWidth-card.offsetWidth)/2;requestAnimationFrame(()=>{centering=false})}
 function select(id){current=id;paint();center();onSelect(id)}
 cards.forEach((card,i)=>card.onclick=()=>select(items[i].id));
 rail.addEventListener('scroll',()=>{if(centering)return;clearTimeout(timer);timer=setTimeout(()=>{if(!panel.open)return;const middle=rail.getBoundingClientRect().left+rail.clientWidth/2;const index=cards.reduce((best,card,i)=>Math.abs(card.getBoundingClientRect().left+card.offsetWidth/2-middle)<Math.abs(cards[best].getBoundingClientRect().left+cards[best].offsetWidth/2-middle)?i:best,0);if(items[index].id!==current){current=items[index].id;paint();onSelect(current)}},130)});
 panel.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(event.key==='ArrowLeft'?-1:1)}});
 panel.addEventListener('close',()=>clearTimeout(timer));
 new ResizeObserver(()=>{if(panel.open)center()}).observe(rail);
 paint();return {set(id){const changed=id!==current;current=id;paint();if(changed)center()},show:()=>requestAnimationFrame(center)};
}
