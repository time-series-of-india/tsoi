import {createSkyContinuation} from './sky-continuation.mjs';
import {drawPaperWeather} from './paper-weather.mjs';
import {paperJoinPath} from './paper-scenery.mjs';

import {cityRoute,routeAssetNames,routeLayout,visibleRouteSections,routeSectionOffset,routeVerticalFrame,ROUTE_ASPECT,ROUTE_OVERLAP} from './city-routes.mjs';
const delhi=cityRoute('delhi');
export const DELHI_SECTIONS=delhi.sections,DELHI_ASPECT=ROUTE_ASPECT,DELHI_OVERLAP=ROUTE_OVERLAP;
export const delhiRouteLayout=height=>routeLayout(height,delhi);
export const visibleDelhiSections=(width,height,offset)=>visibleRouteSections(width,height,offset,delhi);
export const delhiSectionOffset=(width,height,section)=>routeSectionOffset(width,height,section,delhi);
export const delhiAssetNames=()=>routeAssetNames(delhi);

// Keep the canopy opaque; open sky and the configured path/lawn band can dissolve.
export function applyCanopyJoin(pixels,seam,width,height,overlap,groundBlend=null){
 for(let y=0;y<height;y++){
  const skyBlend=Math.max(0,Math.min(1,(height*.60-y)/(height*.08)));
  const t=groundBlend?Math.max(0,Math.min(1,(y/height-groundBlend[0])/(groundBlend[1]-groundBlend[0]))):0;
  const lawnBlend=t*t*(3-2*t);
  for(let x=0;x<overlap;x++){
   const progress=x/overlap,lawnAlpha=progress*progress*(3-2*progress);
   const canopyAlpha=skyBlend*progress+(1-skyBlend)*(x>=seam[y]?1:0);
   const alpha=canopyAlpha*(1-lawnBlend)+lawnAlpha*lawnBlend;
   pixels[(y*width+x)*4+3]=Math.round(alpha*255);
  }
 }
}

// Share the level roadside below the foliage. The narrow transition is on grass;
// the kerb and pavement are copied completely so the seam cannot introduce steps.
export function alignRoadside(pixels,reference,width,height){
 const start=height*.79,end=height*.80;
 for(let y=Math.ceil(start);y<height;y++){
  const t=Math.min(1,(y-start)/(end-start)),mix=t*t*(3-2*t);
  for(let x=0;x<width;x++)for(let c=0;c<3;c++){
   const i=(y*width+x)*4+c;
   pixels[i]=Math.round(pixels[i]*(1-mix)+reference[i]*mix);
  }
 }
}

// All textures travel together; there is no independently moving foreground band.
export function prepareInlandScenery(images,route=delhi,makeCanvas=()=>document.createElement('canvas')){
 if(images.length!==route.sections.length+(route.skyReference?1:0))throw new Error('All city route paintings are required');
 const width=images[0].width,height=images[0].height;
 const opaque=route.join==='opaque-canopy';
 let sharedSky;
 if(route.skyReference){
  sharedSky=makeCanvas();sharedSky.width=width;sharedSky.height=height;
  const q=sharedSky.getContext('2d');q.drawImage(images.at(-1),0,0,width,height);
  q.globalCompositeOperation='destination-in';
  // The blend ends above San Thome's spire and the lighthouse lantern.
  const mask=q.createLinearGradient(0,height*route.skyBlend[0],0,height*route.skyBlend[1]);
  mask.addColorStop(0,'#000');mask.addColorStop(1,'transparent');q.fillStyle=mask;q.fillRect(0,0,width,height);
 }
 const sources=images.slice(0,route.sections.length).map(image=>{
  const canvas=makeCanvas();canvas.width=width;canvas.height=height;
  const q=canvas.getContext('2d',{willReadFrequently:opaque});q.drawImage(image,0,0,width,height);if(sharedSky)q.drawImage(sharedSky,0,0);
  return {canvas,pixels:opaque?q.getImageData(0,0,width,height).data:null};
 });
 if(opaque&&route.groundReference){
  const reference=sources[route.sections.findIndex(s=>s.id===route.groundReference)].pixels;
  for(const source of sources){
   alignRoadside(source.pixels,reference,width,height);
   const q=source.canvas.getContext('2d'),paint=q.getImageData(0,0,width,height);
   paint.data.set(source.pixels);q.putImageData(paint,0,0);
  }
 }
 const plates=sources.map(({canvas,pixels},i)=>{
  const q=canvas.getContext('2d');
  if(opaque){
   const overlap=Math.round(width*ROUTE_OVERLAP);
   const [min,max]=route.joinWindows?.[route.sections[i].id]??[.1,.9];
   const seam=paperJoinPath(sources[(i+sources.length-1)%sources.length].pixels,pixels,width,height,overlap,max,min);
   const joined=q.getImageData(0,0,width,height);
   applyCanopyJoin(joined.data,seam,width,height,overlap,route.groundBlend);q.putImageData(joined,0,0);
   return canvas;
  }
  q.globalCompositeOperation='destination-in';
  const edge=q.createLinearGradient(0,0,width*ROUTE_OVERLAP,0);
  edge.addColorStop(0,'transparent');edge.addColorStop(1,'#000');q.fillStyle=edge;q.fillRect(0,0,width,height);
  return canvas;
 });
 const skyExtensions=plates.map(plate=>createSkyContinuation(plate,.45,makeCanvas));
 return {plates,skyExtensions,width,height};
}
export function createInlandScenery(images,route=delhi){
 return createInlandRenderer(prepareInlandScenery(images,route),route);
}
export function createInlandRenderer({plates,skyExtensions,width,height},route=delhi){
 let lastSection=-1,anchor=0,soundSection=0;
 return {get soundSection(){return soundSection},draw(g,W,H,{travel=0,cameraY=0,section=0,offset:reviewOffset,shade=0,rainDrops=[],reduced=false,rainDensity=0}){
  if(lastSection!==section){anchor=travel;lastSection=section}
  const offset=reviewOffset??((travel-anchor)*32+routeSectionOffset(W,H,section,route)),dy=-cameraY*H*.28;
  const soundLayout=routeLayout(H,route);soundSection=(offset+W*.45-soundLayout.tileWidth*.5)/soundLayout.stride;
  const framing=routeVerticalFrame(H,route),paintingY=dy+framing.top,paintingH=H*framing.scale,skyH=paintingH*.45;
  g.save();g.fillStyle='#f4f1eb';g.fillRect(0,0,W,H);
  for(const tile of visibleRouteSections(W,H,offset,route)){
   const plate=plates[tile.index];
   skyExtensions[tile.index].draw(g,tile.x,paintingY,tile.width,skyH);
   g.drawImage(plate,0,0,width,height*framing.split,tile.x,paintingY,tile.width,paintingH*framing.split);
   if(framing.split<1){
    const waterY=framing.top+paintingH*framing.split;
    g.drawImage(plate,0,height*framing.split,width,height*(1-framing.split),tile.x,dy+waterY,tile.width,H-waterY);
   }
  }
  if(route.sceneryHaze){
   // Follow the bank as the camera climbs; keep weather and gameplay ink above the wash.
   const haze=route.sceneryHaze,wash=g.createLinearGradient(0,dy,0,H+dy);
   for(const [stop,alpha] of [[0,haze.sky],[.5,haze.sky],[.78,haze.bank],[.85,haze.water],[1,haze.water]])
    wash.addColorStop(stop,`rgba(244,241,235,${alpha})`);
   g.fillStyle=wash;g.fillRect(0,0,W,H);
  }
  drawPaperWeather(g,W,H,{shade,rainDensity,rainDrops,reduced,horizon:H*(route.weatherHorizon??.79)+dy});g.restore();
 }};
}
