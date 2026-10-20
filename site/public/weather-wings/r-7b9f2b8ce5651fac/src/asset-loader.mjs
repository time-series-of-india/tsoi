import {getBirdProfile} from './birds.mjs';
import {PREPARED_ART} from './prepared-art.mjs';

// Reuse requests across the game, chooser and results, including the no-cache preview.
export function createImageLoader(makeImage=()=>new Image()){
 const cache=new Map(),states=new Map(),listeners=new Set();
 function report(src,state){states.set(src,state);for(const listener of listeners)if(listener.sources.has(src))listener.update()}
 function loadImage(src,{priority='auto'}={}){
  if(!cache.has(src)){
   report(src,'loading');
   const pending=new Promise((resolve,reject)=>{
    const image=makeImage();image.decoding='async';image.fetchPriority=priority;
    image.onload=async()=>{try{if(image.decode)await image.decode();resolve(image)}catch(error){reject(error)}};image.onerror=()=>reject(new Error('Artwork unavailable: '+src));image.src=src;
   }).then(image=>{report(src,'ready');return image}).catch(error=>{cache.delete(src);report(src,'failed');throw error});
   cache.set(src,pending);
  }
  return cache.get(src);
 }
 // Subscriptions observe decoded assets without starting extra requests.
 loadImage.subscribe=(sources,onProgress)=>{
  const unique=new Set(sources);
  const listener={sources:unique,update(){let loaded=0,failed=0;for(const src of unique){loaded+=Number(states.get(src)==='ready');failed+=Number(states.get(src)==='failed')}onProgress({loaded,total:unique.size,failed})}};
  listeners.add(listener);listener.update();return ()=>listeners.delete(listener);
 };
 return loadImage;
}
export const loadImage=createImageLoader();
const birds=new Map();
export function loadBirdArt(id){
 const profile=getBirdProfile(id);
 if(!birds.has(profile.id)){const records=PREPARED_ART.birds[profile.id];birds.set(profile.id,loadImages(records.map(p=>p.src),src=>loadImage(src,{priority:'high'})).then(images=>({profile,poses:records.map((p,i)=>({...p,image:images[i]}))})).catch(error=>{birds.delete(profile.id);throw error}));}
 return birds.get(profile.id);
}
// Bounded concurrent loading leaves room for menu actions and avoids a large request burst.
export async function loadImages(sources,load=loadImage,concurrency=3){
 const result=new Array(sources.length);let next=0;
 await Promise.all(Array.from({length:Math.min(concurrency,sources.length)},async()=>{
  while(next<sources.length){const index=next++;result[index]=await load(sources[index]);}
 }));
 return result;
}
