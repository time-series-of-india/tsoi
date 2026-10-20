import {CLIMATE_CITIES,DEFAULT_CITY} from './climate-cities.mjs';
import {BIRDS,defaultBirdForCity} from './birds.mjs';
const KEY='tsoi-opening-v1';
export function createOpeningStore(storage){
 let saved;try{saved=JSON.parse(storage?.getItem(KEY)||'null')}catch{}
 let value={status:['started','completed','skipped'].includes(saved?.status)?saved.status:'new',arrived:saved?.arrived===true||['completed','skipped'].includes(saved?.status),attempted:saved?.attempted===true,
  lessons:{rainfall:saved?.lessons?.rainfall||(['completed','skipped'].includes(saved?.status)?saved.status:'new'),temperature:saved?.lessons?.temperature||'new'},
  hints:Object.fromEntries(['rainfall','temperature'].map(metric=>{const learned=['completed','skipped'].includes(saved?.lessons?.[metric])||(metric==='rainfall'&&['completed','skipped'].includes(saved?.status));return [metric,{flap:learned||saved?.hints?.[metric]?.flap===true,opening:learned||saved?.hints?.[metric]?.opening===true}]})),
  city:Object.hasOwn(CLIMATE_CITIES,saved?.city)?saved.city:null,bird:Object.hasOwn(BIRDS,saved?.bird)?saved.bird:null};
 const persist=()=>{try{storage?.setItem(KEY,JSON.stringify(value))}catch{}};
 return {get value(){return {...value}},get needsIntro(){return this.needsLesson('rainfall')},needsLesson(metric='rainfall'){return !['completed','skipped'].includes(value.lessons[metric])},
  arrive(){value.arrived=true;persist()},begin(metric='rainfall'){if(this.needsLesson(metric)){value.lessons[metric]='started';value.status='started';persist()}},finish(skipped=false,metric='rainfall'){value.lessons[metric]=skipped?'skipped':'completed';value.status=value.lessons[metric];persist()},
  hint(metric,cue){if(value.hints[metric]&&['flap','opening'].includes(cue)){value.hints[metric][cue]=true;persist()}},
  attempt(){value.attempted=true;persist()},choose(city,bird){if(Object.hasOwn(CLIMATE_CITIES,city))value.city=city;if(Object.hasOwn(BIRDS,bird))value.bird=bird;persist()}};
}
export function localOpeningStore(){let storage;try{storage=window.localStorage}catch{}return createOpeningStore(storage)}
export function openingSelection(href,saved){
 const params=new URL(href).searchParams,explicit=params.get('city');
 const city=Object.hasOwn(CLIMATE_CITIES,explicit)?explicit:saved.city||DEFAULT_CITY;
 const requested=params.get('bird'),bird=Object.hasOwn(BIRDS,requested)?requested:!explicit&&saved.bird?saved.bird:defaultBirdForCity(city);
 return {city,bird,rememberedBird:!explicit&&Boolean(saved.bird)};
}
// Each instruction has its own clock; a long wait in one step cannot skip another.
export function createFlightLesson(){
 let phase='flap',elapsed=0,phaseTime=0,taps=0,sinceTap=0,descent=0,learnedGlide=false;
 const enter=next=>{phase=next;phaseTime=0};
 return {get phase(){return phase},get elapsed(){return elapsed},get phaseTime(){return phaseTime},get taps(){return taps},
  tap(){taps++;sinceTap=0;descent=0},
  step(dt,{y=.5,vy=0,assisted=false,cleared=false}={}){
   elapsed+=dt;phaseTime+=dt;sinceTap+=dt;
   if(phase==='flap'&&taps>=3&&phaseTime>=4&&y<=.46&&vy<-.025){enter('glide');descent=0;return false}
   if(phase==='glide'){
    descent=sinceTap>.45&&vy>.025&&!assisted?descent+dt:0;
    if(descent>=1.1)learnedGlide=true;
    if(learnedGlide&&phaseTime>=5)enter('rainfall');
   }else if(phase==='rainfall'&&phaseTime>=6)enter('opening');
   else if(phase==='opening'&&cleared)enter('finish');
   return phase==='finish'&&phaseTime>=3;
  }};
}
