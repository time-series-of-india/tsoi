import {loadImage,loadImages} from './asset-loader.mjs';
import {PREPARED_ART} from './prepared-art.mjs';
import {cityRoute,routeLayout,routeSectionOffset,visibleRouteSections} from './city-routes.mjs';
import {createPaperRenderer,paperRouteLayout,visiblePaperSections,PAPER_SECTIONS} from './paper-scenery.mjs';
import {createInlandRenderer} from './inland-scenery.mjs';
import {preparedSkyContinuation} from './sky-continuation.mjs';
import {OPENING_SECONDS,openingFrame} from './opening-timeline.mjs';
const openingTravel=OPENING_SECONDS*.42+openingFrame(OPENING_SECONDS).cameraTravel;
const loadPreparedImages=(paths,options)=>loadImages(paths,src=>loadImage(src,options));

export function openingSceneryIndices(city,width,height,travel=0){
 const route=cityRoute(city),layout=route?routeLayout(height,route):paperRouteLayout(width,height);
 const offset=travel*32+(route?routeSectionOffset(width,height,0,route):layout.tileWidth*PAPER_SECTIONS[0].focus-width*.5);
 const visible=route?visibleRouteSections(width,height,offset,route):visiblePaperSections(width,height,offset);
 return [...new Set(visible.map(tile=>tile.index))];
}
export function openingSceneryAssets(city,record,{width,height}){
 const route=cityRoute(city),{stride}=route?routeLayout(height,route):paperRouteLayout(width,height),indices=new Set([0]);
 // Include every plate crossed by the full descent, even in a short landscape view.
 const steps=Math.max(1,Math.ceil(openingTravel*32/stride));
 for(let i=0;i<=steps;i++)for(const index of openingSceneryIndices(city,width,height,openingTravel*i/steps))indices.add(index);
 return [...indices].map(i=>record.plates[i]).concat(record.sky?[record.sky,record.water]:[]);
}
function renderer(city,prepared){const route=cityRoute(city);return route?createInlandRenderer(prepared,route):createPaperRenderer(prepared)}

// Share pending stages and immutable images; each caller owns its scroll anchor.
export function createSceneryLoader(load=loadPreparedImages,manifest=PREPARED_ART){
 const cache=new Map();
 function entryFor(city,viewport){
  if(cache.has(city))return cache.get(city);
  const record=manifest.cities[city];if(!record)throw Error('Unknown scenery: '+city);
  const all=[...record.plates,...(record.sky?[record.sky,record.water]:[])];
  const first=viewport?openingSceneryAssets(city,record,viewport):all,remaining=all.filter(path=>!first.includes(path));
  const plates=new Array(record.plates.length),prepared={...record,plates,strips:plates,skyExtensions:new Array(plates.length)};
  async function stage(paths,priority){
   const images=await load(paths,{priority});
   for(let i=0;i<paths.length;i++){
    const index=record.plates.indexOf(paths[i]),image=images[i];
    if(index>=0){plates[index]=image;prepared.skyExtensions[index]=preparedSkyContinuation(image,record.skyFraction)}
    else if(paths[i]===record.sky)prepared.sky=image;else prepared.calmWater=image;
   }
   return prepared;
  }
  const entry={initial:stage(first,viewport?'high':'auto')};
  entry.complete=entry.initial.then(async()=>{if(remaining.length)await stage(remaining,'low');return prepared}).catch(error=>{if(cache.get(city)===entry)cache.delete(city);throw error});
  // The opening may resolve before a background failure; the caller still awaits complete.
  entry.complete.catch(()=>{});cache.set(city,entry);return entry;
 }
 async function loadScenery(city){return renderer(city,await entryFor(city).complete)}
 loadScenery.opening=async(city,viewport)=>{
  const entry=entryFor(city,viewport),prepared=await entry.initial,scene=renderer(city,prepared);
  scene.canDraw=(width,height,travel=0)=>openingSceneryIndices(city,width,height,travel).every(index=>Boolean(prepared.plates[index]));
  return {scene,complete:entry.complete};
 };
 return loadScenery;
}
export const loadScenery=createSceneryLoader();
export const loadOpeningScenery=(city,viewport)=>loadScenery.opening(city,viewport);
