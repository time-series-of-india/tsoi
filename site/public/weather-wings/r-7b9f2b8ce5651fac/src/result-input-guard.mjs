// A pause in the flapping rhythm separates flight input from a result choice.
export function createResultInputGuard(now=()=>performance.now(),quietMs=650){
 let until=0;
 return {arm(){until=now()+quietMs},accept(){const time=now();if(time<until){until=time+quietMs;return false}return true}};
}
export function protectResultCard(card){
 const guard=createResultInputGuard();
 const block=event=>{event.preventDefault();event.stopImmediatePropagation()};
 card.addEventListener('pointerdown',event=>{if(!guard.accept())block(event)},true);
 card.addEventListener('click',event=>{if(!guard.accept())block(event)},true);
 card.addEventListener('keydown',event=>{if(['Space','Enter','ArrowUp'].includes(event.code)&&(!guard.accept()||event.repeat))block(event)},true);
 return {open(){guard.arm();card.showModal();card.querySelector('h2').focus({preventScroll:true})}};
}
